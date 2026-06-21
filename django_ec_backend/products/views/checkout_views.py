import os
import stripe
from django.conf import settings
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from ..models import Product, Cart, Order, OrderItem, Postage
from ..utils import send_order_confirmation_email, format_stripe_phone

class CreateCheckoutSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'burst'

    def post(self, request, *args, **kwargs):
        # 1. フロントエンドから都道府県を取得
        prefecture = request.data.get('prefecture')
        if not prefecture:
            return Response({'error': '都道府県を選択してください。'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            cart = Cart.objects.get(user=request.user)
            if not cart.items.exists():
                return Response({'error': 'カートが空です'}, status=status.HTTP_400_BAD_REQUEST)
        except Cart.DoesNotExist:
            return Response({'error': 'カートが見つかりません'}, status=status.HTTP_404_NOT_FOUND)

        # 在庫チェック
        for item in cart.items.all():
            if item.product.stock < item.quantity:
                return Response(
                    {'error': f'申し訳ありません。{item.product.name} の在庫が不足しています（残り{item.product.stock}個）。'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 2. 送料の計算 (バックエンド側で再度計算して整合性を保つ)
        shipping_total = 0
        for item in cart.items.all():
            try:
                postage = Postage.objects.get(prefecture=prefecture, size=item.product.shipping_size)
                shipping_total += postage.cost * item.quantity
            except Postage.DoesNotExist:
                # 送料設定が見つからない場合のフォールバック（またはエラー）
                return Response({'error': f'{prefecture}への送料設定が見つかりません。'}, status=status.HTTP_400_BAD_REQUEST)

        # 3. 商品合計と最終合計（商品合計 + 送料）の算出
        items_total = sum(item.product.price * item.quantity for item in cart.items.all())
        grand_total = items_total + shipping_total

        # 4. Orderオブジェクトの作成（shipping_costを保存）
        order = Order.objects.create(
            user=request.user,
            total_amount=grand_total,    # 総支払額
            shipping_cost=shipping_total, # 送料合計
            full_name='',
            email=request.user.email,
            shipping_address='',
            status='pending'
        )
        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                price=item.product.price
            )

        # 5. Stripe用のline_items作成
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
        
        # 6. 送料をStripeの決済項目に追加
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
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=line_items,
                mode='payment',
                success_url=f'{frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}',
                cancel_url=f'{frontend_url}/checkout/cancel',
                customer_email=request.user.email,
                metadata={'order_id': order.id},
                shipping_address_collection={'allowed_countries': ['JP']},
                billing_address_collection='required',
                phone_number_collection={'enabled': True},
            )
            order.stripe_checkout_session_id = checkout_session.id
            order.save()
            return JsonResponse({'id': checkout_session.id, 'url': checkout_session.url})
        except Exception as e:
            order.delete()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
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

        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            self.handle_checkout_session_completed(session)

        return Response(status=status.HTTP_200_OK)

    def handle_checkout_session_completed(self, session):
        # session (StripeObject) を通常の辞書に変換します
        session_dict = session.to_dict()
        session_id = session_dict['id']
        customer_email = session_dict.get('customer_details', {}).get('email')

        try:
            order = Order.objects.get(stripe_checkout_session_id=session_id)
            if order.status == 'pending':
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
