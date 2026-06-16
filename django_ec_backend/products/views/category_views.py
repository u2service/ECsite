from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Category, CategorySpecField, Product
from ..serializers import CategoryTreeSerializer, CategorySpecFieldSerializer

class CategoryTreeView(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(parent=None)
    serializer_class = CategoryTreeSerializer
    permission_classes = [permissions.AllowAny]

class CategorySpecView(APIView):
    def get(self, request, category_id):
        try:
            category = Category.objects.get(id=category_id)
            category_ids = category.get_ancestors(include_self=True).values_list('id', flat=True)
            specs = CategorySpecField.objects.filter(
                category_id__in=category_ids
            ).order_by('category__level', 'order')

            serializer = CategorySpecFieldSerializer(specs, many=True)
            return Response(serializer.data)
        except Category.DoesNotExist:
            return Response([], status=status.HTTP_404_NOT_FOUND)

class CategorySpecValuesView(APIView):
    """
    指定されたカテゴリ（および子カテゴリ）の商品が実際に持っている
    スペック値のユニークなリストを取得する。
    フロントエンドで「CPU: [M1, M2]」のような絞り込み選択肢を作るために使用。
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, category_id):
        try:
            category = Category.objects.get(id=category_id)
            # このカテゴリとその子孫カテゴリに属する全商品を取得
            categories = category.get_descendants(include_self=True)
            products = Product.objects.filter(category__in=categories)

            # このカテゴリに適用されるスペック定義を取得（親からの継承含む）
            ancestor_ids = category.get_ancestors(include_self=True).values_list('id', flat=True)
            spec_fields = CategorySpecField.objects.filter(category_id__in=ancestor_ids)

            results = {}
            for field in spec_fields:
                key = field.field_name
                # JSONField内の特定のキーに対して、実際に存在する値をすべて取得
                # DjangoのJSONFieldフィルタリング (specifications__cpu 等) を利用
                values = products.values_list(f'specifications__{key}', flat=True).distinct()

                # Noneや空文字を除去し、ソートしてリスト化
                cleaned_values = sorted([str(v) for v in values if v is not None and v != ""])

                # 値が存在する場合のみ結果に含める
                if cleaned_values:
                    results[key] = {
                        "display_name": field.display_name,
                        "values": cleaned_values
                    }

            return Response(results)
        except Category.DoesNotExist:
            return Response({}, status=status.HTTP_404_NOT_FOUND)
