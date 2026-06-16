from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from ..models import Category, CategorySpecField
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
