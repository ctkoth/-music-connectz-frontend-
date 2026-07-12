from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import KIND_CHOICES, Group

User = get_user_model()


def _ser(g):
    return {"id": g.id, "kind": g.kind, "title": g.title,
            "members": [u.username for u in g.members.all()]}


class GroupListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response([_ser(g) for g in
                         Group.objects.filter(owner=request.user).prefetch_related("members")])

    def post(self, request):
        d = request.data or {}
        kind = d.get("kind")
        if kind not in dict(KIND_CHOICES):
            return Response({"detail": "kind must be friends/fans/partners/blocked/custom."}, status=400)
        title = (d.get("title") or "").strip() if kind == "custom" else ""
        g, _ = Group.objects.get_or_create(owner=request.user, kind=kind, title=title)
        return Response(_ser(g), status=201)


class GroupMemberView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, action):
        try:
            g = Group.objects.get(pk=pk, owner=request.user)
        except Group.DoesNotExist:
            return Response({"detail": "Group not found."}, status=404)
        u = User.objects.filter(username__iexact=(request.data or {}).get("username", "")).first()
        if not u:
            return Response({"detail": "User not found."}, status=404)
        if action == "add":
            g.members.add(u)
        elif action == "remove":
            g.members.remove(u)
        else:
            return Response({"detail": "action must be add/remove."}, status=400)
        return Response(_ser(g))
