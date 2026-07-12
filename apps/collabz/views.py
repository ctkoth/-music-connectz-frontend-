import math

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import KIND_CHOICES, CollabInterest, CollabPost


def _hav(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi, dlmb = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _ser(p, me=None):
    return {
        "id": p.id, "author": p.author.username, "kind": p.kind, "title": p.title,
        "description": p.description, "roles_needed": p.roles_needed, "skill": p.skill,
        "city": p.city, "latitude": p.latitude, "longitude": p.longitude,
        "remote_ok": p.remote_ok, "created_at": p.created_at,
        "interested_count": p.interests.count(),
        "i_am_interested": bool(me and p.interests.filter(user=me).exists()),
        "distance_km": getattr(p, "distance_km", None),
        # map compat with OfferMap popups
        "teacher_username": p.author.username, "price": "", "pricing_mode": "",
        "rating_snapshot": "", "title_map": p.title,
    }


class CollabListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qp = request.query_params
        qs = CollabPost.objects.filter(is_active=True).select_related("author")
        if qp.get("kind") in dict(KIND_CHOICES):
            qs = qs.filter(kind=qp["kind"])
        if qp.get("skill"):
            qs = qs.filter(skill__iexact=qp["skill"].strip())
        if qp.get("remote") in ("1", "true"):
            qs = qs.filter(remote_ok=True)
        rows = list(qs[:200])
        lat, lng = qp.get("lat"), qp.get("lng")
        if lat and lng:
            try:
                lat, lng = float(lat), float(lng)
                max_km = float(qp.get("max_km", 0) or 0)
                out = []
                for p in rows:
                    if p.latitude is None or p.longitude is None:
                        if p.remote_ok:
                            p.distance_km = None
                            out.append(p)
                        continue
                    d = round(_hav(lat, lng, p.latitude, p.longitude), 1)
                    p.distance_km = d
                    if max_km and d > max_km and not p.remote_ok:
                        continue
                    out.append(p)
                rows = sorted(out, key=lambda x: (x.distance_km is None, x.distance_km or 0))
            except ValueError:
                pass
        return Response([_ser(p, request.user) for p in rows])

    def post(self, request):
        d = request.data or {}
        if not (d.get("title") or "").strip():
            return Response({"detail": "title required."}, status=400)
        kind = d.get("kind") if d.get("kind") in dict(KIND_CHOICES) else "original"
        p = CollabPost.objects.create(
            author=request.user, kind=kind, title=d["title"].strip(),
            description=(d.get("description") or "").strip(),
            roles_needed=(d.get("roles_needed") or [])[:6],
            skill=(d.get("skill") or "").strip().lower(),
            city=(d.get("city") or "").strip(),
            latitude=d.get("latitude"), longitude=d.get("longitude"),
            remote_ok=bool(d.get("remote_ok", True)),
        )
        return Response(_ser(p, request.user), status=201)


class CollabInterestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            p = CollabPost.objects.get(pk=pk, is_active=True)
        except CollabPost.DoesNotExist:
            return Response({"detail": "Post not found."}, status=404)
        if p.author_id == request.user.id:
            return Response({"detail": "It's your post."}, status=400)
        _, created = CollabInterest.objects.get_or_create(
            post=p, user=request.user,
            defaults={"note": (request.data or {}).get("note", "")[:280]})
        return Response(_ser(p, request.user), status=201 if created else 200)
