"""PostZ API — feed, timed ratings, timed comments.

Follows the repo's plain-APIView + hand-rolled `_ser()` convention (see
apps/collabz/views.py). All window/authorization rules are re-checked here so the
server, not the device clock, is the source of truth.
"""
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import grant_energy

from .models import (COMMENT_WINDOW_SEC, MAX_STARS, RATE_WINDOW_SEC,
                     Comment, Post, Rating, char_limit_for)


def _age_sec(post, now=None):
    now = now or timezone.now()
    return int((now - post.created_at).total_seconds())


def _avg(post):
    stars = [r.stars for r in post.ratings.all()]
    return round(sum(stars) / len(stars), 1) if stars else 0


def _ser_comment(c):
    return {"id": c.id, "user": c.user.username, "text": c.text,
            "created_at": c.created_at}


def _ser(post, me=None, with_comments=True, comment_limit=None):
    age = _age_sec(post)
    my_rating = 0
    if me:
        r = next((r for r in post.ratings.all() if r.user_id == me.id), None)
        my_rating = r.stars if r else 0
    is_mine = bool(me and post.author_id == me.id)
    comments = list(post.comments.all())
    if comment_limit is not None:
        comments = comments[-comment_limit:]
    data = {
        "id": post.id,
        "author": post.author.username,
        "content": post.content,
        "genre": post.genre,
        "skills": post.skills,
        "media_url": post.media_url,
        "created_at": post.created_at,
        "age_sec": age,
        "avg_rating": _avg(post),
        "rating_count": post.ratings.count(),
        "comment_count": post.comments.count(),
        "my_rating": my_rating,
        "is_mine": is_mine,
        "can_rate": age >= RATE_WINDOW_SEC and not is_mine and post.is_active,
        "can_comment": age >= COMMENT_WINDOW_SEC and post.is_active,
        "rate_opens_in_sec": max(0, RATE_WINDOW_SEC - age),
        "comment_opens_in_sec": max(0, COMMENT_WINDOW_SEC - age),
    }
    if with_comments:
        data["comments"] = [_ser_comment(c) for c in comments]
    return data


class PostListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qp = request.query_params
        qs = (Post.objects.filter(is_active=True)
              .select_related("author")
              .prefetch_related("ratings", "comments"))
        if qp.get("mine") in ("1", "true"):
            qs = qs.filter(author=request.user)
        if qp.get("author"):
            qs = qs.filter(author__username__iexact=qp["author"].strip())
        if qp.get("genre"):
            qs = qs.filter(genre__iexact=qp["genre"].strip())
        rows = list(qs[:100])
        # Cap embedded comments on the list view to keep the payload small.
        return Response([_ser(p, request.user, comment_limit=3) for p in rows])

    def post(self, request):
        d = request.data or {}
        content = (d.get("content") or "").strip()
        if not content:
            return Response({"detail": "content required."}, status=400)
        limit = char_limit_for(request.user)
        if limit is not None and len(content) > limit:
            return Response({"detail": f"content must be <= {limit} chars."}, status=400)
        skills = d.get("skills") or []
        if not isinstance(skills, list):
            skills = []
        p = Post.objects.create(
            author=request.user,
            content=content,
            genre=(d.get("genre") or "").strip()[:40],
            skills=skills[:12],
            media_url=(d.get("media_url") or "").strip(),
        )
        return Response(_ser(p, request.user), status=201)


class PostRateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            post = Post.objects.select_related("author").get(pk=pk, is_active=True)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found."}, status=404)

        try:
            stars = int((request.data or {}).get("stars"))
        except (TypeError, ValueError):
            return Response({"detail": f"stars must be 1-{MAX_STARS}."}, status=400)
        if not 1 <= stars <= MAX_STARS:
            return Response({"detail": f"stars must be 1-{MAX_STARS}."}, status=400)

        if post.author_id == request.user.id:
            return Response({"detail": "You can't rate your own PostZ."}, status=403)

        left = RATE_WINDOW_SEC - _age_sec(post)
        if left > 0:
            return Response({"detail": f"Rating opens in {left}s."}, status=409,
                            headers={"Retry-After": str(left)})

        _, created = Rating.objects.update_or_create(
            post=post, user=request.user, defaults={"stars": stars})
        if created:
            # Blueprint: every rating gives the rater +1 Energy (first time only).
            grant_energy(request.user, 1)

        return Response(_ser(post, request.user), status=201 if created else 200)


class PostCommentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            post = Post.objects.select_related("author").get(pk=pk, is_active=True)
        except Post.DoesNotExist:
            return Response({"detail": "Post not found."}, status=404)

        text = ((request.data or {}).get("text") or "").strip()
        if not text:
            return Response({"detail": "text required."}, status=400)
        limit = char_limit_for(request.user)
        if limit is not None and len(text) > limit:
            return Response({"detail": f"text must be <= {limit} chars."}, status=400)

        left = COMMENT_WINDOW_SEC - _age_sec(post)
        if left > 0:
            return Response({"detail": f"Comments open in {left}s."}, status=409,
                            headers={"Retry-After": str(left)})

        Comment.objects.create(post=post, user=request.user, text=text)
        return Response(_ser(post, request.user), status=201)
