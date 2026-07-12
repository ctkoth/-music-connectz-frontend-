from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DM_COST_ENERGY, DirectMessage, can_dm, spend_energy

User = get_user_model()


def _ser(m):
    return {
        "id": m.id, "from": m.sender.username, "to": m.recipient.username,
        "body": m.body, "cost_energy": m.cost_energy, "read": m.read,
        "created_at": m.created_at,
    }


class SendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data or {}
        to = (data.get("to") or "").strip()
        body = (data.get("body") or "").strip()
        if not to or not body:
            return Response({"detail": "Both 'to' and 'body' are required."}, status=400)
        recipient = User.objects.filter(username__iexact=to).first()
        if not recipient or recipient.id == request.user.id:
            return Response({"detail": "Recipient not found."}, status=404)
        if not can_dm(request.user, recipient):
            return Response({"detail": "You can't message this member."}, status=403)

        # Replies are free — cold outreach costs Energy.
        is_reply = DirectMessage.objects.filter(
            sender=recipient, recipient=request.user
        ).exists()
        cost = 0 if is_reply else DM_COST_ENERGY
        if cost and not spend_energy(request.user, cost):
            return Response(
                {"detail": f"Not enough Energy (this DM costs {cost}). "
                           "Train in SkillZ or come back after the daily refill."},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        m = DirectMessage.objects.create(
            sender=request.user, recipient=recipient, body=body, cost_energy=cost
        )
        return Response(_ser(m), status=201)


class InboxView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        inbox = DirectMessage.objects.filter(recipient=request.user)[:50]
        sent = DirectMessage.objects.filter(sender=request.user)[:50]
        unread = DirectMessage.objects.filter(recipient=request.user, read=False).count()
        DirectMessage.objects.filter(recipient=request.user, read=False).update(read=True)
        return Response({
            "unread_was": unread,
            "inbox": [_ser(m) for m in inbox],
            "sent": [_ser(m) for m in sent],
            "dm_cost_energy": DM_COST_ENERGY,
        })
