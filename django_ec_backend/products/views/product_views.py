from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q, Count
from ..models import Product, Category
from ..serializers import ProductSerializer

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

        if category_id:
            try:
                category = Category.objects.get(id=category_id)
                categories = category.get_descendants(include_self=True)
                queryset = queryset.filter(category__in=categories)
            except Category.DoesNotExist:
                queryset = Product.objects.none()

        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )

        if ordering:
            queryset = queryset.order_by(ordering)

        if limit:
            queryset = queryset[:int(limit)]

        return queryset

class ProductComparisonView(APIView):
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
