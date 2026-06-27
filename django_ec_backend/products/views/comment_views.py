from django.db import models
from django.db.models import Count, Q
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from backend.authentication import CookieJWTAuthentication
from ..models import Comment, CommentVote
from ..serializers import CommentSerializer, CommentVoteSerializer

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = Comment.objects.select_related('user') \
            .annotate(
                good_count_annotated=Count('votes', filter=Q(votes__vote_type='good')),
                ng_count_annotated=Count('votes', filter=Q(votes__vote_type='ng'))
            )
        
        # ログイン中なら、その人の投票を prefetch して current_user_vote の N+1 を防ぐ
        if user.is_authenticated:
            queryset = queryset.prefetch_related(
                models.Prefetch('votes', queryset=CommentVote.objects.filter(user=user))
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='vote')
    def vote(self, request, pk=None):
        comment = self.get_object()
        vote_type = request.data.get('vote_type')
        if vote_type not in ['good', 'ng']:
            return Response({'error': 'Invalid vote type'}, status=status.HTTP_400_BAD_REQUEST)

        CommentVote.objects.update_or_create(
            comment=comment,
            user=request.user,
            defaults={'vote_type': vote_type}
        )
        serializer = self.get_serializer(comment)
        return Response(serializer.data, status=status.HTTP_200_OK)
