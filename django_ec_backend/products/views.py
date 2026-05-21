from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authentication import SessionAuthentication
from rest_framework import status

from .models import (
    Product, Cart, CartItem, Order, OrderItem, Category,
    CategorySpecField
)

from .serializers import (
    ProductSerializer, CartSerializer, CartItemSerializer,
    OrderSerializer, CategoryTreeSerializer,
    CategorySpecFieldSerializer
)

import os
import stripe
from django.conf import settings
from django.http import JsonResponse

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt

from .utils import send_order_confirmation_email, format_stripe_phone # 追記
from django.core.mail import mail_admins

from django.db.models import Q # 検索のためにインポートを追加

from django.db import transaction

from rest_framework.throttling import ScopedRateThrottle # 追記

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    商品データを一覧・詳細取得するためのAPIビュー
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    # 認証を「未ログインでもOK」に変更
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Product.objects.all()
        category_id = self.request.query_params.get('category_id')
        search_query = self.request.query_params.get('q') # 検索ワードを取得
        
        if category_id:
            try:
                # 指定されたカテゴリとその子孫（子カテゴリ、孫カテゴリ...）をすべて取得
                category = Category.objects.get(id=category_id)
                categories = category.get_descendants(include_self=True)
                queryset = queryset.filter(category__in=categories)
            except Category.DoesNotExist:
                queryset = Product.objects.none()

            # 検索ワードフィルタリング（追加）
        if search_query:
            # 商品名(name)または説明文(description)にキーワードが含まれるものを検索
            queryset = queryset.filter(
                Q(name__icontains=search_query) | 
                Q(description__icontains=search_query)
            )
        
        return queryset

# ★ 1. CSRFチェックをスキップするカスタム認証クラスを作成
class UnsafeSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return  # 何もしない（CSRFチェックを免除）

# --- ▼ カート操作のためのViewSetを追加 ▼ ---
class CartViewSet(viewsets.ViewSet):
    """
    カート情報を管理するAPIビュー
    - GET /api/cart/: 自分のカート情報を取得
    - POST /api/cart/add-item/: カートに商品を追加
    """
    # ★ ここに認証クラスを明示的に追加（SessionAuthenticationを最優先にする）
    # authentication_classes = [SessionAuthentication]
    authentication_classes = [UnsafeSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    # GET /api/cart/ にアクセスした際にCSRF Cookieを発行するようにする
    @method_decorator(ensure_csrf_cookie)

    def list(self, request):
        """自分のカート情報を取得"""
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='add-item')
    def add_item(self, request):
        """カートに商品を追加"""
        cart, _ = Cart.objects.get_or_create(user=request.user)
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        # カート内に同じ商品があれば数量を更新、なければ新規作成
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, product=product,
            defaults={'quantity': quantity}
        )
        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)

class CartItemViewSet(viewsets.ModelViewSet):
    """
    カートアイテムを更新・削除するためのAPIビュー
    - PUT /api/cart-items/{item_id}/: 数量を更新
    - DELETE /api/cart-items/{item_id}/: 削除
    """
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    # ★ ここに認証クラスを明示的に追加（SessionAuthenticationを最優先にする）
    # authentication_classes = [SessionAuthentication]
    authentication_classes = [UnsafeSessionAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # ログインユーザーのカートに含まれるアイテムのみを対象とする
        return self.queryset.filter(cart__user=self.request.user)
# --- ▲ カート操作のためのViewSetを追加 ▲ ---

# --- ▼ Stripe決済のためのビューを追加 ▼ ---

class CreateCheckoutSessionView(APIView):
    """
    Stripe Checkoutセッションを作成して、セッションIDを返す
    """
    permission_classes = [permissions.IsAuthenticated]

    # ▼ 追加：個別に制限をかける
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'burst' # settings.py で定義した '10/minute' が適用される

    def post(self, request, *args, **kwargs):
        # 1. ユーザーのカートを取得
        try:
            cart = Cart.objects.get(user=request.user)
            if not cart.items.exists():
                return Response({'error': 'カートが空です'}, status=status.HTTP_400_BAD_REQUEST)
        except Cart.DoesNotExist:
            return Response({'error': 'カートが見つかりません'}, status=status.HTTP_404_NOT_FOUND)
        
        # 2. 注文を仮作成 (status='pending')
        # カートの合計金額を計算
        total_amount = sum(item.product.price * item.quantity for item in cart.items.all())
        order = Order.objects.create(
            user=request.user,
            total_amount=total_amount,
            # Stripe Checkout Sessionが完了した際にフルネーム、アドレス、emailなどが更新される
            full_name='',
            email=request.user.email,
            shipping_address='',
            status='pending' # 支払い待ち
        )
        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price # 注文時の価格を記録
            )

        # 3. Stripeに渡す商品リストを作成
        line_items = []
        for item in cart.items.all():
            line_items.append({
                'price_data': {
                    'currency': 'jpy',
                    'product_data': {
                        'name': item.product.name,
                    },
                    'unit_amount': int(item.product.price),
                },
                'quantity': item.quantity,
            })
        
        # 4. フロントエンドのURLを環境変数から取得（なければデフォルト値）
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')

        # 4. Stripe Checkoutセッションを作成
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=f'{frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'{frontend_url}/checkout/cancel', # /cart から /checkout/cancel に変更
                customer_email=request.user.email, # ログインユーザーのメアドを渡す
                metadata={
                    'order_id': order.id, # Stripeセッションに注文IDを紐付け
                },
                shipping_address_collection={
                    'allowed_countries': ['JP'], # 配送先として許可する国
                },
                # ▼ 請求先住所の収集を必須にする（必要に応じて追加）
                billing_address_collection='required',
                # ▼ 電話番号を収集する（必要に応じて追加）
                phone_number_collection={
                    'enabled': True,
                },
            )
            # 仮作成した注文にStripeのセッションIDを保存
            order.stripe_checkout_session_id = checkout_session.id
            order.save()

            return JsonResponse({'id': checkout_session.id, 'url': checkout_session.url})
        except Exception as e:
            # エラーが発生した場合は仮作成した注文を削除
            order.delete()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- ▲ Stripe決済のためのビューを追加 ▲ ---

# --- ▽ Stripe Webhookのためのビューを追加 ▽ ---
@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Stripe Webhookイベントを処理するビュー
    """
    def post(self, request, *args, **kwargs):
        payload = request.body
        sig_header = request.META['HTTP_STRIPE_SIGNATURE']
        event = None

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            # Invalid payload
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # イベントタイプに応じて処理
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            
            # 注文処理ロジックを呼び出す
            self.handle_checkout_session_completed(session)

        # 他のイベントタイプもここに追加可能 (例: payment_intent.succeeded など)

        return Response(status=status.HTTP_200_OK)

    def handle_checkout_session_completed(self, session):
        # ここで注文を確定し、カートをクリアする
        # session.get('id') は使えないため、直接キーでアクセス
        session_id = session['id']

        # customer_details の存在確認をしてから email を取得
        customer_email = None
        if 'customer_details' in session and session['customer_details']:
            customer_email = session['customer_details']['email']
        
        try:
            order = Order.objects.get(stripe_checkout_session_id=session_id)
            if order.status == 'pending':
                self.fulfill_order(order)

                customer_info = None
                if session['customer_details']:
                    customer_info = session['customer_details']

                # customer_info が取得できたら、中身（名前など）を取り出す
                # if shipping:
                    order.full_name = customer_info['name']
                    order.shipping_address = self._format_address(customer_info)
                    order.postal_code = customer_info["address"]['postal_code']
                    # --- ▽ ここで変換処理を呼び出す ▽ ---
                    e164_phone = customer_info["phone"]
                    domestic_phone, country_name = format_stripe_phone(e164_phone)
                    order.phone = domestic_phone
                    order.country = country_name
                    # --- △ ここまで追加 △ ---

                order.email = customer_email
                order.save()

                # --- ▽ ここから管理者への通知を追加 ▽ ---
                subject = f"【新規注文通知】注文ID: {order.id}"
                message = f"""
                新しい注文がありました。
                注文ID: {order.id}
                顧客名: {order.full_name}
                郵便番号： {order.postal_code}
                住所： {order.shipping_address}
                国： {order.country}
                電話番号： {order.phone}
                顧客メール: {order.email}
                金額: {order.total_amount} 円
                ステータス: {order.status}

                詳細は管理画面でご確認ください。
                """
                try:
                    mail_admins(subject, message)
                except Exception as e:
                    print(f"Error sending admin notification: {e}")
                # --- △ ここまで追加 △ ---

                # ユーザーのカートを空にする
                # 注: ユーザーは session.customer (Stripeの顧客ID) と紐付ける必要あり。
                # 現状はemailでユーザーを特定し、カートを空にする簡易的な方法。
                # より堅牢な実装には、StripeのCustomerオブジェクトをDjangoのUserと紐付けるべき。
                if order.user:
                    try:
                        cart = Cart.objects.get(user=order.user)
                        cart.items.all().delete() # カート内の全アイテムを削除
                        # 注文完了メールを送信
                        try:
                            send_order_confirmation_email(order)
                        except Exception as e:
                            print(f"Error sending email: {e}")
                    except Cart.DoesNotExist:
                        pass # カートが存在しない場合は何もしない
                
                print(f"注文 {order.id} が支払い済みになりました。カートをクリアしました。")
        except Order.DoesNotExist:
            print(f"セッションID {session_id} に対応する注文が見つかりません。")
        except Exception as e:
            print(f"注文処理中にエラーが発生しました: {e}")

    def _format_address(self, customer_info):
        if customer_info:
            customer_info_address = customer_info['address']

        if not customer_info or not customer_info_address:
            return ""

        address = customer_info['address']
        # 各フィールドが存在するか確認しながら結合
        parts = [
            address['state'] if address['state'] else '',
            address['city'] if address['city'] else '',
            address['line1'] if address['line1'] else '',
            address['line2'] if address['line2'] else '',
            address['postal_code'] if address['postal_code'] else '',
            address['country'] if address['country'] else ''
        ]
        # 空でない要素だけをカンマで繋ぐ
        return ", ".join([p for p in parts if p])
    
    # ▼ ここに在庫減算のロジックを追加（または呼び出し）
    def fulfill_order(self, order):
        """
        注文確定時の処理：在庫の減算
        """
        from django.db import transaction
        try:
            with transaction.atomic():
                for item in order.items.all():
                    product = item.product
                    if product:
                        if product.stock < item.quantity:
                            # 本来は決済前にチェックすべきだが、確定時にも安全策として確認
                            # raise ValueError(f"{product.name} の在庫が不足しています。")
                            # ログ出力などを行う（エラーを投げるとWebhook自体が失敗扱いになるので注意）
                            print(f"Warning: {product.name} の在庫不足")
                            product.stock = 0
                        else:
                            product.stock -= item.quantity
                        product.save()

                    # その後の注文完了メール送信など（既存処理）
                    order.status = 'paid' # is_paid = True ではなく status = 'paid'
                    order.save()
                    print(f"注文 {order.id} の在庫を更新し、ステータスを 'paid' に変更しました。")
        except Exception as e:
            print(f"fulfill_order 内でエラーが発生しました: {e}")
            raise e # handle_checkout_session_completed の try-except でキャッチされる
# --- ▲ Stripe Webhookのためのビューを追加 ▲ ---

# --- ▼ 注文履歴取得のためのViewSetを追加 ▼ ---
class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ユーザー自身の注文履歴を取得するAPIビュー
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # ログイン中のユーザーの注文のみを取得し、新しい順に並べる
        return Order.objects.filter(user=self.request.user).order_by('-created_at')
# --- ▲ 注文履歴取得のためのViewSetを追加 ▲ ---

# --- ▼ ツリー構造を返すビューを追加 ▼ ---
class CategoryTreeView(viewsets.ReadOnlyModelViewSet):
    """
    カテゴリの全階層構造（ツリー）を返すAPI
    """
    # 親がいない（ルート）カテゴリのみを取得し、そこからツリーを構成する
    queryset = Category.objects.filter(parent=None)
    serializer_class = CategoryTreeSerializer
    permission_classes = [permissions.AllowAny]
# --- ▲ ツリー構造を返すビューを追加 ▲ ---

class CategoryTemplateListView(APIView):
    def get(self, request):
        # 全カテゴリと、それに紐づくスペック項目を効率よく取得
        categories = Category.objects.prefetch_related('spec_fields').all()
        
        data = {}
        for cat in categories:
            # { "PC": {"cpu": "", "memory": ""}, "モニター": {...} } という形を作る
            data[cat.id] = {field.field_name: "" for field in cat.spec_fields.all()}
            
        return Response(data)
    
class ProductComparisonView(APIView):
    def get(self, request):
        # query_paramsからidsを取得
        ids_str = request.query_params.get('ids', '')
        
        if not ids_str:
            # idsが空の場合は空のリストを返す
            return Response([])

        # 文字列を分割し、数字だけを取り出して数値型のリストにする
        # 空文字や不正な値を除去する安全な書き方
        try:
            ids = [int(id_obj) for id_obj in ids_str.split(',') if id_obj.strip().isdigit()]
        except ValueError:
            return Response([])

        # データベースから取得
        products = Product.objects.filter(id__in=ids)
        
        # もし1つも見つからなかった場合
        if not products.exists():
            print(f"DEBUG: IDs {ids} に該当する商品がDBにありませんでした")
            return Response([])

        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)
    
# CategorySpecView を追加
class CategorySpecView(APIView):
    def get(self, request, category_id):
        try:
            # 指定されたカテゴリを取得
            category = Category.objects.get(id=category_id)
            # 自分自身と、親・祖父カテゴリ（先祖）のIDをすべて取得
            category_ids = category.get_ancestors(include_self=True).values_list('id', flat=True)

            # それらすべてのカテゴリに紐づくスペック項目を取得
            # 親カテゴリの項目が上に来るように level と order でソート
            specs = CategorySpecField.objects.filter(
                category_id__in=category_ids
            ).order_by('category__level', 'order')

            serializer = CategorySpecFieldSerializer(specs, many=True)
            return Response(serializer.data)
        except Category.DoesNotExist:
            return Response([], status=status.HTTP_404_NOT_FOUND)

