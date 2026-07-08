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

        # 1. まずベースとなるクエリセットを取得（select_related と annotate）
        queryset = Comment.objects.select_related('user') \
            .annotate(
                good_count_annotated=Count('votes', filter=Q(votes__vote_type='good')),
                ng_count_annotated=Count('votes', filter=Q(votes__vote_type='ng'))
            )
        
        # ─── ✨ 修正：投票(vote)アクションの時は、商品IDの絞り込みをスキップする ───
        if self.action == 'vote':
            # 💡 投票時も N+1 を防ぎ current_user_vote を正しく取得するため、prefetch を適用
            if user.is_authenticated:
                queryset = queryset.prefetch_related(
                    models.Prefetch('votes', queryset=CommentVote.objects.filter(user=user))
                )
            return queryset
        # ───────────────────────────────────────────────────────────────────
        
        # 2. 【重要】リクエストから product_id を取得してフィルタリング
        # クエリパラメータ（?product_id=X）から取る場合
        product_id = self.request.query_params.get('product_id')
        # もしURLのパス（/products/<product_id>/comments/）から取る場合は以下
        # product_id = self.kwargs.get('product_pk') or self.kwargs.get('product_id')

        if product_id is not None:
            queryset = queryset.filter(product_id=product_id)
        else:
            # もし商品IDが指定されていない場合は、空のリストを返す（または全件返すか、設計に合わせる）
            queryset = queryset.none()
        
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
        vote_type = request.data.get('vote_type')
        if vote_type not in ['good', 'ng']:
            return Response({'error': 'Invalid vote type'}, status=status.HTTP_400_BAD_REQUEST)

        # 💡 先に対象のコメントが存在するかどうかだけチェック（404エラーを適切に返すため）
        # まだ集計値付きのオブジェクトは変数に代入しません
        comment_exists = Comment.objects.filter(pk=pk).exists()
        if not comment_exists:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        # 💡 1. 先に投票データをデータベースに保存・確定させる
        CommentVote.objects.update_or_create(
            comment_id=pk,  # オブジェクト全体ではなく、IDを直接指定すると高速です
            user=request.user,
            defaults={'vote_type': vote_type}
        )

        # 💡 2. 保存が「完了した後」に、最新のカウントや prefetch を含んだ状態のオブジェクトを取得し直す
        # これにより、get_queryset() 内の annotate と prefetch が最新のデータベース状態を反映します
        updated_comment = self.get_object()

        # 💡 3. 最新のデータをシリアライズして返却
        serializer = self.get_serializer(updated_comment)
        return Response(serializer.data, status=status.HTTP_200_OK)
