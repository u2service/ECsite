from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet,
    CartViewSet,
    CartItemViewSet,
    CreateCheckoutSessionView,
    StripeWebhookView,
    OrderViewSet,
    CategoryTreeView,
    ProductComparisonView,
    CategorySpecView,
)

router = DefaultRouter()
router.register(r'products', ProductViewSet)
# CartViewSetは 'list' と 'add_item' しかないので、basenameが必要
router.register(r'cart', CartViewSet, basename='cart') 
router.register(r'cart-items', CartItemViewSet, basename='cart-items')
router.register(r'orders', OrderViewSet, basename='orders') # 注文履歴用URLを追加
router.register(r'category-tree', CategoryTreeView, basename='category-tree')


urlpatterns = [
    path('products/compare/', ProductComparisonView.as_view(), name='product-compare'),
    
    path('', include(router.urls)),
    path('create-checkout-session/', CreateCheckoutSessionView.as_view(), name='create-checkout-session'),
    path('webhook/stripe/', StripeWebhookView.as_view(), name='stripe-webhook'), # Webhook URLを追加
    # カテゴリごとのスペック定義を取得するエンドポイントを追加
    path('category-specs/<int:category_id>/', CategorySpecView.as_view(), name='category-specs'),
]
