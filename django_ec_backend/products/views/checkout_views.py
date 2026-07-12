import os
import stripe
from django.conf import settings
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone  # 追加：時間計算用
from datetime import timedelta     # 追加：30分後を計算するため
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from ..models import Product, Cart, Order, OrderItem, Postage
from ..utils import send_order_confirmation_email, format_stripe_phone
from drf_spectacular.utils import extend_schema

class CreateCheckoutSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'burst'

    @extend_schema(
        request=None,
        responses={
            200: {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "StripeのチェックアウトセッションID"},
                    "url": {"type": "string", "description": "Next.jsがリダイレクトするためのStripe決済ページのURL"}
                }
            }
        },
        description="ログインユーザーのカート情報をもとに、Stripeのチェックアウトセッションを作成し、在庫を30分間仮押さえします。"
    )
    def post(self, request, *args, **kwargs):
        prefecture = request.data.get('prefecture')
        if not prefecture:
            return Response({'error': '都道府県を選択してください。'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cart = Cart.objects.get(user=request.user)
            if not cart.items.exists():
                return Response({'error': 'カートが空です'}, status=status.HTTP_400_BAD_REQUEST)
        except Cart.DoesNotExist:
            return Response({'error': 'カートが見つかりません'}, status=status.HTTP_404_NOT_FOUND)

        # ==========================================
        # 【追加】自分自身の有効な仮押さえ（既存セッション）があれば再利用する
        # ==========================================
        now = timezone.now()
        existing_order = Order.objects.filter(
            user=request.user,
            status='pending_reservation',
            reserved_until__gt=now,  # まだ有効期限内のもの
            stripe_checkout_session_id__isnull=False
        ).order_by('-created_at').first()  # 最新のものを取得（モデルにcreated_at等がある前提）

        if existing_order:
            # カートの中身と、既存オーダーの中身（商品と数量）が一致しているか簡易検証
            # ※もしカート内容が変わっている場合は、古いオーダーをexpiredにして新規作成に進むロジックにしてもOKです
            cart_items = list(cart.items.all())
            order_items = list(existing_order.items.all())
            
            if len(cart_items) == len(order_items):
                # 中身が一致しているかチェック
                match = True
                for c_item in cart_items:
                    # 既存オーダー内に同じ商品・数量があるか
                    if not existing_order.items.filter(product=c_item.product, quantity=c_item.quantity).exists():
                        match = False
                        break
                
                if match:
                    try:
                        # Stripe側でもセッションがまだ有効（open）か確認、またはそのままURLを返す
                        stripe.api_key = settings.STRIPE_SECRET_KEY
                        session = stripe.checkout.Session.retrieve(existing_order.stripe_checkout_session_id)
                        
                        if session.status == 'open':
                            # 有効なセッションが残っているので、そのままそのURLにリダイレクトさせる
                            return JsonResponse({'id': session.id, 'url': session.url})
                    except Exception:
                        # Stripe側で何らかの理由で失効していた場合は、例外をスルーして新規作成へ流す
                        pass
        # ==========================================

        # 【改修1】有効在庫チェック (available_stock を確認し、競合を防ぐためにデータベース行をロック)
        with transaction.atomic():
            for item in cart.items.all():
                # 競合を防ぐため、対象のProductレコードにロックをかける
                product = Product.objects.select_for_update().get(id=item.product.id)
                if product.available_stock < item.quantity:
                    return Response(
                        {'error': f'申し訳ありません。{product.name} は現在別のお客様が手続き中、または在庫不足です（購入可能数: {product.available_stock}個）。'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # 送料の計算
        shipping_total = 0
        for item in cart.items.all():
            try:
                postage = Postage.objects.get(prefecture=prefecture, size=item.product.shipping_size)
                shipping_total += postage.cost * item.quantity
            except Postage.DoesNotExist:
                return Response({'error': f'{prefecture}への送料設定が見つかりません。'}, status=status.HTTP_400_BAD_REQUEST)

        # 金額算出
        items_total = sum(item.product.price * item.quantity for item in cart.items.all())
        grand_total = items_total + shipping_total

        # 【改修2】Orderオブジェクトの作成（仮押さえステータスと、30分後の有効期限をセット）
        now = timezone.now()
        reservation_deadline = now + timedelta(minutes=30)

        order = Order.objects.create(
            user=request.user,
            total_amount=grand_total,
            shipping_cost=shipping_total,
            full_name='',
            email=request.user.email,
            shipping_address='',
            status='pending_reservation', # 'pending' から 'pending_reservation' に変更
            reserved_until=reservation_deadline # 仮押さえ有効期限を保存
        )
        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price
            )

        # Stripe用のline_items作成
        line_items = []
        for item in cart.items.all():
            line_items.append({
                'price_data': {
                    'currency': 'jpy',
                    'product_data': {'name': item.product.name},
                    'unit_amount': int(item.product.price),
                },
                'quantity': item.quantity,
            })
        
        if shipping_total > 0:
            line_items.append({
                'price_data': {
                    'currency': 'jpy',
                    'product_data': {'name': '送料'},
                    'unit_amount': int(shipping_total),
                },
                'quantity': 1,
            })

        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            # 【改修3】Stripeのセッション作成パラメータ変更（有効期限の設定）
            # Stripeの制限上、expires_at は「今から30分以上、24時間以内」のUnixタイムスタンプである必要があります
            stripe_expires_at = int(reservation_deadline.timestamp())

            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=f'{frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'{frontend_url}/checkout/cancel?session_id={{CHECKOUT_SESSION_ID}}', # 後方互換・追跡用にパラメータ付与
                customer_email=request.user.email,
                metadata={'order_id': order.id},
                shipping_address_collection={'allowed_countries': ['JP']},
                billing_address_collection='required',
                phone_number_collection={'enabled': True},
                idempotency_key=f"checkout_order_{order.id}",
                expires_at=stripe_expires_at, # Stripe自体も30分で自動失効させる設定を追加！
            )
            order.stripe_checkout_session_id = checkout_session.id
            order.save()
            return JsonResponse({'id': checkout_session.id, 'url': checkout_session.url})
        except Exception as e:
            order.delete()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    @extend_schema(
        request=None, 
        responses={200: None},
        description="Stripeからの支払い完了、および失効通知（Webhook）を受け取り、注文ステータスを更新します。"
    )
    def post(self, request, *args, **kwargs):
        payload = request.body
        sig_header = request.META['HTTP_STRIPE_SIGNATURE']
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.error.SignatureVerificationError) as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # イベント判定
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            self.handle_checkout_session_completed(session)
            
        # 【改修4】30分経過時の失効イベントを検知する
        elif event['type'] == 'checkout.session.expired':
            session = event['data']['object']
            self.handle_checkout_session_expired(session)

        return Response(status=status.HTTP_200_OK)

    def handle_checkout_session_completed(self, session):
        session_dict = session.to_dict()
        session_id = session_dict['id']
        customer_email = session_dict.get('customer_details', {}).get('email')

        try:
            order = Order.objects.get(stripe_checkout_session_id=session_id)
            # 条件変更: 既存の 'pending' ではなく 'pending_reservation' であることをチェック
            if order.status == 'pending_reservation':
                self.fulfill_order(order)
                if session_dict.get('customer_details'):
                    customer_info = session_dict['customer_details']
                    order.full_name = customer_info['name']
                    order.shipping_address = self._format_address(customer_info)
                    order.postal_code = customer_info["address"]['postal_code']
                    domestic_phone, country_name = format_stripe_phone(customer_info["phone"])
                    order.phone = domestic_phone
                    order.country = country_name
                order.email = customer_email
                order.save()

                self._notify_staff(order)

                if order.user:
                    try:
                        cart = Cart.objects.get(user=order.user)
                        cart.items.all().delete()
                        send_order_confirmation_email(order)
                    except Cart.DoesNotExist:
                        pass
        except Order.DoesNotExist:
            print(f"Order not found for session {session_id}")
        except Exception as e:
            print(f"Error processing order: {e}")

    # 【新設】30分経ってStripe側が自動失効したときに動くロジック
    def handle_checkout_session_expired(self, session):
        session_dict = session.to_dict()
        session_id = session_dict['id']
        try:
            order = Order.objects.get(stripe_checkout_session_id=session_id)
            if order.status == 'pending_reservation':
                order.status = 'expired'  # 期限切れに変更
                order.save()
                print(f"Order {order.id} has expired and stock reservation released.")
        except Order.DoesNotExist:
            pass

    def fulfill_order(self, order):
        try:
            with transaction.atomic():
                for item in order.items.all():
                    product = Product.objects.select_for_update().get(id=item.product.id)
                    if product.stock < item.quantity:
                        order.status = 'error_stock_shortage'
                        order.save()
                        return
                    product.stock -= item.quantity
                    product.save()
                order.status = 'paid'
                order.save()
        except Exception as e:
            raise e

    def _format_address(self, customer_info):
        address = customer_info.get('address')
        if not address: return ""
        parts = [address.get(k) for k in ['state', 'city', 'line1', 'line2', 'postal_code', 'country'] if address.get(k)]
        return ", ".join(parts)

    def _notify_staff(self, order):
        subject = f"【新規注文通知】注文ID: {order.id}"
        message = f"新しい注文がありました。\n注文ID: {order.id}\n顧客名: {order.full_name}\n金額: {order.total_amount} 円\nステータス: {order.status}"
        User = get_user_model()
        staff_emails = list(User.objects.filter(is_staff=True, is_active=True).values_list('email', flat=True))
        recipient_list = [email for email in staff_emails if email]
        if recipient_list:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, recipient_list)

# --- ▼ 既存のコードの一番下に追加 ▼ ---

class CheckoutStatusView(APIView):
    """
    【新設】認証不要のステータス・在庫確認API
    Next.jsのキャンセル画面から、Stripeのsession_idを元に現在の状態を問い合わせます。
    """
    permission_classes = [permissions.AllowAny] # ★重要：認証不要（ログインしていなくても叩ける）
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'burst'

    @extend_schema(
        parameters=[
            {
                "name": "session_id",
                "type": "string",
                "required": True,
                "description": "StripeのチェックアウトセッションID"
            }
        ],
        responses={200: {"type": "object"}},
        description="ストライプのセッションIDを元に、注文が失効しているかと、その商品の最新の有効在庫があるかを返します（認証不要）。"
    )
    def get(self, request, *args, **kwargs):
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response({'error': 'session_idは必須です。'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # セッションIDから対象の注文を取得
            order = Order.objects.get(stripe_checkout_session_id=session_id)
            
            # 今回の注文に含まれる「最初の商品」を取得（1点物のECを想定）
            # 複数商品がある場合は、全てのhas_stockがTrueかを判定するロジックに変えることも可能です
            order_item = order.items.first()
            has_stock = False
            
            if order_item and order_item.product:
                # モデルに作ったバーチャルな有効在庫ロジック（available_stock）を利用
                has_stock = order_item.product.available_stock >= order_item.quantity

            return Response({
                'status': order.status, # 'expired', 'pending_reservation', 'paid' などが返る
                'has_stock': has_stock  # 有効在庫が残っていれば True、売り切れていれば False
            }, status=status.HTTP_200_OK)

        except Order.DoesNotExist:
            return Response({'error': '対象の注文が見つかりません。'}, status=status.HTTP_404_NOT_FOUND)
        