import json
from django.contrib import admin, messages
from mptt.admin import DraggableMPTTAdmin
from .models import (
    Product, Category, Brand, Cart, CartItem,
    Order, OrderItem, ProductImage, CategorySpecField,
    Comment, CommentVote, Postage
    )
import csv
import io
from django.urls import path
from django.shortcuts import render, redirect
from django import forms

class CSVImportForm(forms.Form):
    csv_file = forms.FileField(label="CSVファイル")


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
    list_display = ('id', 'name', 'category', 'brand', 'price', 'stock')
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

# --- ▼ コメント機能の登録を追加 ▼ ---

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'product', 'created_at') # 一覧に表示する項目
    list_filter = ('product', 'user', 'created_at')       # フィルター機能
    search_fields = ('content', 'user__username', 'product__name') # 検索機能

@admin.register(CommentVote)
class CommentVoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'comment', 'user', 'vote_type', 'created_at')
    list_filter = ('vote_type', 'created_at')

# --- ▲ コメント機能の登録を追加 ▲ ---

@admin.register(Postage)
class PostageAdmin(admin.ModelAdmin):
    list_display = ('prefecture', 'size', 'cost')
    list_filter = ('size', 'prefecture')

    # 管理画面のリストページにボタンを追加するための設定
    change_list_template = "admin/postage_changelist.html"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('import-csv/', self.import_csv, name='postage_import_csv'),
        ]
        return custom_urls + urls

    def import_csv(self, request):
        if request.method == "POST":
            form = CSVImportForm(request.POST, request.FILES)
            if form.is_valid():
                csv_file = request.FILES['csv_file']
                # Shift-JISで読み込み
                data_set = csv_file.read().decode('shift_jis')
                io_string = io.StringIO(data_set)
                next(io_string)  # ヘッダー行をスキップ

                postages_to_create = []
                for row in csv.reader(io_string, delimiter=','):
                    if not row or len(row) < 6:
                        continue

                    # row[1] が「該当する都道府県」 (例: "神奈川,千葉,埼玉")
                    # row[2]~[5] が 60, 80, 120, 140サイズ
                    prefectures_raw = row[1].strip('"')
                    # 「自県（東京）」などの表記を考慮
                    prefectures = prefectures_raw.split(',')

                    sizes = ['60', '80', '120', '140']
                    for i, size in enumerate(sizes):
                        cost = row[i + 2]
                        for pref in prefectures:
                            pref_name = pref.strip()
                            # 「東京」を「東京都」に補完するなどの正規化が必要な場合はここで行う
                            if pref_name == "東京": pref_name = "東京都"
                            if not pref_name.endswith(('都', '道', '府', '県')):
                                # CSVのデータ形式に合わせて調整が必要
                                pass

                            postages_to_create.append(
                                Postage(prefecture=pref_name, size=size, cost=cost)
                            )

                # 既存データを削除して一括登録（または update_or_create）
                Postage.objects.all().delete()
                Postage.objects.bulk_create(postages_to_create)

                self.message_user(request, "CSVのインポートが完了しました。")
                return redirect("..")
        else:
            form = CSVImportForm()

        return render(request, "admin/csv_form.html", {"form": form})
