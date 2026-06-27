from rest_framework import serializers
from .models import (
    Product, Category, Cart, CartItem, ProductImage,
    Order, OrderItem, CategorySpecField, Brand,
    Comment, CommentVote
    )
from django.contrib.auth import get_user_model
from drf_spectacular.utils import extend_schema_field

User = get_user_model()

class CustomRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'email', 'password')
        extra_kwargs = {
            'password': {'write_only': True}
        }
        
    def save(self, request):
        user = User.objects.create_user(
            username=self.validated_data['username'],
            email=self.validated_data.get('email', ''), # ここが重要！
            password=self.validated_data['password']
        )
        return user
    
# --- ▼ カート関連のシリアライザーを追加 ▼ ---

class CartItemProductSerializer(serializers.ModelSerializer):
    """CartItemで商品情報を限定的に表示するためのシリアライザ"""
    class Meta:
        model = Product
        fields = ('id', 'name', 'price', 'image')

class CartItemSerializer(serializers.ModelSerializer):
    # product情報を読み取り専用で詳細表示するために専用のSerializerを使う
    product = CartItemProductSerializer(read_only=True)
    # 新規作成・更新時にはproduct_idのみを受け取る
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ('id', 'product', 'product_id', 'quantity', 'total_price')

    @extend_schema_field(serializers.IntegerField())
    def get_total_price(self, obj):
        return obj.product.price * obj.quantity

class CartSerializer(serializers.ModelSerializer):
    # ネストしたシリアライザーでカート内のアイテムを一覧表示
    items = CartItemSerializer(many=True, read_only=True)
    grand_total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ('id', 'user', 'items', 'grand_total', 'created_at')

    @extend_schema_field(serializers.IntegerField())
    def get_grand_total(self, obj):
        # カート内の商品の合計金額を計算
        return sum(item.product.price * item.quantity for item in obj.items.all())

# --- ▲ カート関連のシリアライザーを追加 ▲ ---

# --- ▼ APIから画像一覧を取得 ▼ ---
class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('id', 'image', 'alt_text')

# --- ▼ カテゴリ情報のシリアライザーを追加 ▼ ---
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'parent', 'level')
# --- ▲ カテゴリ情報のシリアライザーを追加 ▲ ---

# --- ▼ メーカー（ブランド）情報のシリアライザーを追加 ▼ ---
class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ('id', 'name')
# --- ▲ メーカー（ブランド）情報のシリアライザーを追加 ▲ ---

# CategorySpecFieldSerializer を追加
class CategorySpecFieldSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='field_name')
    label = serializers.CharField(source='display_name')

    class Meta:
        model = CategorySpecField
        fields = ('name', 'label')

class ProductSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, allow_null=True
    )
    # images という名前でリレーション先のデータをネストさせる
    images = ProductImageSerializer(many=True, read_only=True)
    # カテゴリの親階層をリストで取得（パンくずリスト用）
    category_path = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id', 'category', 'category_id', 'name', 'brand', 'description',
            'price', 'image', 'images', 'category_path', 'stock',
            'specifications', 'comment_count'
            )

    @extend_schema_field(serializers.IntegerField())
    def get_comment_count(self, obj):
        # アノテーションされている値があればそれを使う
        return getattr(obj, 'comment_count_annotated', obj.comments.count())
    
    @extend_schema_field(serializers.CharField())
    def get_category_path(self, obj):
        if not obj.category:
            return []
        # 自分を含む先祖カテゴリをすべて取得し、IDと名前のペアを作る
        ancestors = obj.category.get_ancestors(include_self=True)
        return [{'id': cat.id, 'name': cat.name} for cat in ancestors]
    
# --- ▲ APIから画像一覧を取得 ▲ ---

# --- ▼ 注文履歴表示用のシリアライザーを追加 ▼ ---
class OrderItemSerializer(serializers.ModelSerializer):
    product = CartItemProductSerializer(read_only=True) # 商品情報を詳細に表示

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'quantity', 'price')

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True) # 注文アイテムをネスト
    status_display = serializers.CharField(source='get_status_display', read_only=True) # 日本語のステータス名

    class Meta:
        model = Order
        fields = ('id', 'items', 'total_amount', 'status', 'status_display', 'created_at')
# --- ▲ 注文履歴表示用のシリアライザーを追加 ▲ ---

# カテゴリを再帰的に（ツリー状に）取得するためのシリアライザー
class CategoryTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ('id', 'name', 'children')

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children(self, obj):
        # 子カテゴリが存在する場合、自分自身（シリアライザー）を再度呼び出す
        children = obj.get_children()
        return CategoryTreeSerializer(children, many=True).data
    
# --- ▼ コメント機能用のシリアライザーを追加 ▼ ---

class CommentSerializer(serializers.ModelSerializer):
    """
    コメント表示・投稿用のシリアライザー
    """
    user_name = serializers.ReadOnlyField(source='user.username') # 記入者名
    good_count = serializers.SerializerMethodField() # Good数
    ng_count = serializers.SerializerMethodField()   # NG数
    # ログイン中のユーザーがこのコメントに投票済みかどうか（UI制御用）
    current_user_vote = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = (
            'id', 'product', 'user', 'user_name', 'content',
            'created_at', 'good_count', 'ng_count', 'current_user_vote'
        )
        read_only_fields = ('user',) # ユーザーはビュー側で保存時に設定

    @extend_schema_field(serializers.IntegerField())
    def get_good_count(self, obj):
        return getattr(obj, 'good_count_annotated', obj.votes.filter(vote_type='good').count())

    @extend_schema_field(serializers.IntegerField())
    def get_ng_count(self, obj):
        return getattr(obj, 'ng_count_annotated', obj.votes.filter(vote_type='ng').count())

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_current_user_vote(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            vote = obj.votes.filter(user=request.user).first()
            votes_list = getattr(obj, '_prefetched_objects_cache', {}).get('votes', obj.votes.all())
            vote = next((v for v in votes_list if v.user_id == request.user.id), None)

        return None

class CommentVoteSerializer(serializers.ModelSerializer):
    """
    投票投稿用のシリアライザー
    """
    class Meta:
        model = CommentVote
        fields = ('id', 'comment', 'vote_type')
        read_only_fields = ('user',)

# --- ▲ コメント機能用のシリアライザーを追加 ▲ ---
