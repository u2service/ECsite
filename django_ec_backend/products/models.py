from django.db import models
from django.conf import settings
from mptt.models import MPTTModel, TreeForeignKey
from django.utils import timezone

# --- ▼ Categoryモデルを追加 ▼ ---
class Category(MPTTModel):
    name = models.CharField(max_length=100, verbose_name="カテゴリ名")
    parent = TreeForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        verbose_name="親カテゴリ"
        )

    class MPTTMeta:
        order_insertion_by = ['name']

    def __str__(self):
        return self.name
    
    class Meta:
        # 「親」と「名前」の組み合わせをユニークにする
        unique_together = ('parent', 'name')
        verbose_name_plural = "カテゴリ"

# --- ▲ Categoryモデルを追加 ▲ ---

# メーカー（ブランド）: SONY, Apple, Panasonicなど
class Brand(models.Model):
    name = models.CharField(max_length=100, verbose_name="メーカー（ブランド）")

    def __str__(self):
        return self.name
    
# 商品本体
class Product(models.Model):
    category = TreeForeignKey(Category, on_delete=models.CASCADE, verbose_name="カテゴリ")
    name = models.CharField(max_length=200)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, verbose_name="メーカー（ブランド）")
    # OSなどは、特定のカテゴリの時だけ使うフィールドにするか、タグにする
    OS_CHOICES = [
        ('win', 'Windows'),
        ('mac', 'macOS'),
        ('none', 'なし（家電など）'),
    ]
    os = models.CharField(max_length=10, choices=OS_CHOICES, default='none')
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    stock = models.PositiveIntegerField(default=0, verbose_name="在庫数") # 追加
    # ここに動的なスペックを保存する
    specifications = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now, verbose_name="作成日")
    SHIPPING_SIZE_CHOICES = [
        ('60', '60サイズ'),
        ('80', '80サイズ'),
        ('120', '120サイズ'),
        ('140', '140サイズ'),
    ]
    shipping_size = models.CharField(
        max_length=10,
        choices=SHIPPING_SIZE_CHOICES,
        default='60',
        verbose_name="配送サイズ"
    )

    @property
    def available_stock(self):
        """
        有効在庫数 = 物理在庫数(stock) - 有効な仮押さえ数
        """
        res = OrderItem.objects.filter(
            product=self,
            order__status='pending_reservation',
            order__reserved_until__gt=timezone.now()
        ).aggregate(total=models.Sum('quantity'))
        
        # 返ってきた辞書から 'total' を安全に取得。Noneなら0にする
        active_reservations = res.get('total') or 0
        
        # 物理在庫から仮押さえ分を引いた数を返す（0未満にならないよう制御）
        return max(0, self.stock - active_reservations)

    def __str__(self):
        return self.name if self.name else "Unnamed Product"
    
# --- ▼ ショッピングカート機能のモデルを追加 ▼ ---

class Cart(models.Model):
    """
    ショッピングカートモデル
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # userがOneToOneField(CASCADE)なので通常は存在するが、安全のためにチェック
        username = self.user.username if self.user else "Unknown User"
        return f"Cart for {username}"

class CartItem(models.Model):
    """
    カート内の商品モデル
    """
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    # --- ここから追加 ---
    class Meta:
        ordering = ['id']  # IDの昇順で並び順を固定する
        unique_together = ('cart', 'product') # これを追加
    # --- ここまで追加 ---

    def __str__(self):
        # productはCASCADEなので通常は存在するが、安全のためにチェック
        product_name = self.product.name if self.product else "Unknown Product"

        return f"{self.quantity} of {product_name}"
# --- ▲ ショッピングカート機能のモデルを追加 ▲ ---

# --- ▼ 注文管理機能のモデルを追加 ▼ ---
  
class Order(models.Model):
    """
    注文モデル
    """
    ORDER_STATUS_CHOICES = [
        ('pending_reservation', '仮押さえ中'), # Stripe遷移時
        ('expired', '時間切れ失効'),           # 30分放置時

        ('pending', '未払い'),
        ('paid', '支払い済み'),
        ('shipped', '発送済み'),
        ('delivered', '配達済み'),
        ('cancelled', 'キャンセル済み'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    full_name = models.CharField(max_length=100) # Stripe Checkoutから取得
    email = models.EmailField() # Stripe Checkoutから取得
    shipping_address = models.TextField() # Stripe Checkoutから取得
    postal_code = models.CharField(max_length=20, blank=True, null=True) # 追加
    phone = models.CharField(max_length=20, blank=True, null=True)       # 追加
    country = models.CharField(max_length=100, blank=True, null=True)   # 追加
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # 1. defaultを 'pending_reservation' に変更
    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending_reservation', db_index=True)
    
    # 既存のものをそのまま利用（検索高速化のために db_index=True を推奨）
    stripe_checkout_session_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    
    # 2. 仮押さえの有効期限（作成日時 + 30分）を追加
    reserved_until = models.DateTimeField(null=True, blank=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="送料合計")
    # total_amount は「商品小計 + 送料合計」の総支払額として利用

    def __str__(self):
        # userはSET_NULLなので、Guestや削除済みユーザーの場合を考慮（既存通り）
        username = self.user.username if self.user else 'Guest'
        return f"Order {self.id} by {username} ({self.get_status_display()})"

class OrderItem(models.Model):
    """
    注文商品モデル
    """
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2) # 注文時の価格を記録

    def __str__(self):
        # productがNoneの場合を考慮
        product_name = self.product.name if self.product else "[Deleted Product]"
        return f"{self.quantity} of {product_name}"
    
# --- ▲ 注文管理機能のモデルを追加 ▲ ---

# --- ▼ 商品画像モデルを追加 ▼ ---
class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/gallery/')
    alt_text = models.CharField(max_length=200, blank=True, null=True)

    def __str__(self):
        # productがNoneの場合を考慮
        product_name = self.product.name if self.product else "Unknown Product"
        return f"Image for {product_name}"
# --- ▲ 商品画像モデルを追加 ▲ ---

# 新設：カテゴリごとのスペック項目を定義するモデル
class CategorySpecField(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='spec_fields')
    field_name = models.CharField(max_length=50, help_text="例: cpu, memory, weight")
    display_name = models.CharField(max_length=50, help_text="例: CPU, メモリ, 重量")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order'] # 常にこの順番で取得される

    def __str__(self):
        return f"{self.category.name} - {self.display_name}"

# --- ▼ コメント機能のモデルを追加 ▼ ---

class Comment(models.Model):
    """
    商品に対するコメントモデル
    """
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name="対象商品"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="投稿者"
    )
    content = models.TextField(verbose_name="コメント内容")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="投稿日時")

    class Meta:
        verbose_name = "コメント"
        verbose_name_plural = "コメント一覧"
        ordering = ['-created_at'] # 新しい順に並べる

    def __str__(self):
        # 投稿者名と商品名を表示
        username = self.user.username if self.user else "Unknown"
        product_name = self.product.name if self.product else "Unknown Product"
        return f"{username} - {product_name}"


class CommentVote(models.Model):
    """
    コメントに対するGood/NG投票モデル
    """
    VOTE_CHOICES = [
        ('good', 'Good'),
        ('ng', 'NG'),
    ]
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name='votes',
        verbose_name="対象コメント"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="投票者"
    )
    vote_type = models.CharField(
        max_length=4,
        choices=VOTE_CHOICES,
        verbose_name="投票種別"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # 同じ人が同じコメントに複数回投票できないように制限
        unique_together = ('comment', 'user')
        verbose_name = "コメント投票"
        verbose_name_plural = "コメント投票一覧"

    def __str__(self):
        return f"{self.user.username} voted {self.vote_type} on comment {self.comment.id}"

# --- ▲ コメント機能のモデルを追加 ▲ ---

class Postage(models.Model):
    prefecture = models.CharField(max_length=20, verbose_name="都道府県")
    size = models.CharField(max_length=10, verbose_name="サイズ")  # '60', '80', '120', '140'
    cost = models.DecimalField(max_digits=10, decimal_places=0, verbose_name="送料")

    class Meta:
        unique_together = ('prefecture', 'size')
        verbose_name = "送料設定"
        verbose_name_plural = "送料設定一覧"

    def __str__(self):
        return f"{self.prefecture} ({self.size}サイズ): {self.cost}円"
    