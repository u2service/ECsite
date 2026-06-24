from rest_framework import viewsets, permissions
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

    def get_queryset(self):
        queryset = Product.objects.annotate(comment_count_annotated=Count('comments'))
        category_id = self.request.query_params.get('category_id')
        search_query = self.request.query_params.get('q')
        ordering = self.request.query_params.get('ordering')
        limit = self.request.query_params.get('limit')

        # 1. カテゴリによる絞り込み（既存）
        if category_id:
            try:
                category = Category.objects.get(id=category_id)
                categories = category.get_descendants(include_self=True)
                queryset = queryset.filter(category__in=categories)
            except Category.DoesNotExist:
                queryset = Product.objects.none()

        # 2. スペック情報（specifications JSONField）による動的な絞り込み（追加）
        # URLパラメータに 'spec_項目名=値' が含まれている場合に対応
        for param, value in self.request.query_params.items():
            if param.startswith('spec_') and value:
                # 'spec_cpu' から 'cpu' を取り出す
                spec_key = param[len('spec_'):]
                # カンマ区切りの値をリストに変換 (例: "8GB,16GB" -> ["8GB", "16GB"])
                values = value.split(',')

                # JSONFieldでリスト内のいずれかに一致するものを検索 (__in を使用)
                filter_kwargs = {f'specifications__{spec_key}__in': values}
                queryset = queryset.filter(**filter_kwargs)

        # 3. 検索キーワードによる絞り込み（既存）
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )

        # 4. 並べ替え（既存）
        if ordering:
            queryset = queryset.order_by(ordering)

        # 5. 件数制限（既存）
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
