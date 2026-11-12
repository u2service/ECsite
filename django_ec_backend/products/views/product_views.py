from rest_framework import viewsets, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, Count
from ..models import Product, Category
from ..serializers import ProductSerializer
from drf_spectacular.utils import extend_schema

class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = [
        'id',
        'name',
        'price',
        'stock',
        'created_at',
        'comment_count_annotated',
    ]
    
    def get_queryset(self):
        queryset = Product.objects.annotate(comment_count_annotated=Count('comments'))
        category_id = self.request.query_params.get('category_id')
        search_query = self.request.query_params.get('q')

        # 1. カテゴリによる絞り込み
        if category_id:
            try:
                category = Category.objects.get(id=category_id)
                categories = category.get_descendants(include_self=True)
                queryset = queryset.filter(category__in=categories)
            except Category.DoesNotExist:
                queryset = Product.objects.none()

        # 2. スペック情報による絞り込み
        for param, value in self.request.query_params.items():
            if param.startswith('spec_') and value:
                # 'spec_cpu' から 'cpu' を取り出す
                spec_key = param[len('spec_'):]
                # カンマ区切りの値をリストに変換 (例: "8GB,16GB" -> ["8GB", "16GB"])
                values = value.split(',')
                queryset = queryset.filter(**{f'specifications__{spec_key}__in': values})

        # 3. 検索キーワードによる絞り込み
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )

        return queryset
    def filter_queryset(self, queryset):
        # まず OrderingFilter などのフィルタ・ソートを適用
        queryset = super().filter_queryset(queryset)

        # ソート確定後に limit によるスライスを適用
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                queryset = queryset[:int(limit)]
            except ValueError:
                pass

        return queryset
    
class ProductComparisonView(APIView):
    @extend_schema(responses=ProductSerializer(many=True))
    def get(self, request):
        ids_str = request.query_params.get('ids', '')
        if not ids_str:
            return Response([])

        try:
            ids = [int(id_obj) for id_obj in ids_str.split(',') if id_obj.strip().isdigit()]
        except ValueError:
            return Response([])

        products = Product.objects.filter(id__in=ids)
        if not products.exists():
            return Response([])

        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)
