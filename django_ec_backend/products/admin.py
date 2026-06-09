import json
from django.contrib import admin
from mptt.admin import DraggableMPTTAdmin
from .models import Product, Category, Brand, Cart, CartItem, Order, OrderItem, ProductImage, CategorySpecField

# admin.site.register(Product)

# Brand（メーカー）を管理画面に表示
@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    # 管理画面の一覧に表示する項目
    list_display = ('id', 'name')
    
    # クリックして編集画面へ移動できる項目
    list_display_links = ('name',)
    
    # 検索窓（名前で検索できるようにする）
    search_fields = ('name',)

    # 並び順（IDの降順など）
    ordering = ('id',)

# カート内アイテムをインラインで表示するための設定
class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0  # 空の入力欄をデフォルトで表示しない設定
    readonly_fields = ('product', 'quantity') # 管理画面から勝手に変えられたくない場合は読み取り専用に

# カート本体の設定
@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'created_at', 'get_item_count')
    inlines = [CartItemInline] # ここでインライン表示を指定

    def get_item_count(self, obj):
        return obj.items.count()
    get_item_count.short_description = 'アイテム数'

# カートアイテム単体でも見たい場合は登録（任意）
@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'cart', 'product', 'quantity')

# 注文明細をインラインで表示
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'quantity', 'price') # 確定後の注文は編集不可にするのが一般的

# 注文本体の設定
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'full_name', 'email', 'phone', 'total_amount', 'status', 'created_at')
    # 詳細画面で住所などを見やすく表示（fields または fieldsets を使用）
    readonly_fields = ('stripe_checkout_session_id',)
    list_filter = ('status', 'created_at') # ステータスや日付で絞り込み
    inlines = [OrderItemInline]
    search_fields = ('id', 'full_name', 'email', 'user__username', 'phone') # 検索機能の強化

# --- ▼ 商品の編集画面から直接複数の画像をアップロードできるようにインライン設定を追加 ▼ ---
class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1

# 既存の admin.site.register(Product) を解除して再登録するか、
# decorator を使っている場合はそこを修正します。
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category', 'brand', 'price', 'stok')
    list_filter = ('category', 'brand')
    inlines = [ProductImageInline]
    search_fields = ('name',)

    class Media:
        # static/ 以下のパスを記述します
        js = ('admin/js/category_template.js',)
        
    def change_view(self, request, object_id, form_url='', extra_context=None):
        # 全カテゴリとその項目を辞書形式で取得
        categories = Category.objects.prefetch_related('spec_fields').all()
        template_data = {
            cat.name: {field.field_name: "" for field in cat.spec_fields.all()}
            for cat in categories
        }
        
        # extra_contextを使って、テンプレート（JS）にデータを渡す
        extra_context = extra_context or {}
        extra_context['category_templates_json'] = json.dumps(template_data)
        return super().change_view(request, object_id, form_url, extra_context=extra_context)
# --- ▲ 商品の編集画面から直接複数の画像をアップロードできるようにインライン設定を追加 ▲ ---

# Category の編集画面で、項目（CategorySpecField）を一緒に登録できるように Inline を使います。
class CategorySpecFieldInline(admin.TabularInline):
    model = CategorySpecField
    extra = 1

# すでに Inline があるはずなので、その下あたりに追加
@admin.register(CategorySpecField)
class CategorySpecFieldAdmin(admin.ModelAdmin):
    # 管理画面の一覧に表示する項目
    list_display = ('field_name', 'display_name', 'category', 'order')
    # カテゴリごとに絞り込みできるようにする
    list_filter = ('category',)
    # 並び順
    ordering = ('category', 'order')

@admin.register(Category)
class CategoryAdmin(DraggableMPTTAdmin):
    mptt_level_indent = 20
    list_display = ('tree_actions', 'indented_title')
    list_display_links = ('indented_title',)
    inlines = [CategorySpecFieldInline]


