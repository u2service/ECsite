from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from backend.authentication import CookieJWTAuthentication
from ..models import Product, Cart, CartItem, Postage
from ..serializers import CartSerializer, CartItemSerializer
from drf_spectacular.utils import extend_schema

class CartViewSet(viewsets.ViewSet):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=CartSerializer(many=False))
    @method_decorator(ensure_csrf_cookie)
    def list(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)
    
    @extend_schema(
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "integer", "description": "追加する商品のID"},
                    "quantity": {"type": "integer", "description": "数量（デフォルト1）"}
                },
                "required": ["product_id"]
            }
        },
        responses={200: CartSerializer},
        description="カートに商品を追加し、最新のカート情報を返します。"
    )
    @action(detail=False, methods=['post'], url_path='add-item')
    def add_item(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        product_id = request.data.get('product_id')
        quantity = int(request.data.get('quantity', 1))

        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, product=product,
            defaults={'quantity': quantity}
        )
        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        serializer = CartSerializer(cart)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        responses={
            200: {
                "type": "object",
                "properties": {
                    "shipping_total": {"type": "integer", "description": "計算された送料の合計金額"}
                }
            }
        },
        description="指定された都道府県（クエリパラメータ）を元に、カート内商品の送料合計を計算します。"
    )
    @action(detail=False, methods=['get'], url_path='calculate-shipping')
    def calculate_shipping(self, request):
        """
        クエリパラメータ 'prefecture' に基づき、カート内の送料合計を計算する
        例: /api/cart/calculate-shipping/?prefecture=東京都
        """
        prefecture = request.query_params.get('prefecture')

        # 都道府県が指定されていない場合は0円を返す
        if not prefecture:
            return Response({'shipping_total': 0})

        try:
            cart = Cart.objects.get(user=request.user)
        except Cart.DoesNotExist:
            return Response({'shipping_total': 0})

        shipping_total = 0

        # カート内の各商品をループ
        for item in cart.items.all():
            try:
                # 商品のサイズと都道府県に一致する送料をマスターから取得
                postage = Postage.objects.get(
                    prefecture=prefecture,
                    size=item.product.shipping_size
                )
                # 送料 × 数量 を合算
                shipping_total += postage.cost * item.quantity
            except Postage.DoesNotExist:
                # 該当する送料設定がない場合は計算を飛ばす
                # ※運用上、全ての都道府県を網羅していれば発生しません
                continue

        return Response({'shipping_total': int(shipping_total)})

class CartItemViewSet(viewsets.ModelViewSet):
    queryset = CartItem.objects.all()
    serializer_class = CartItemSerializer
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(cart__user=self.request.user)
