"""Deferred PostZ reward (blueprint):

  "every comment on another user's post gives energy equal to its median rating
   1 hour after it's posted."

For each active post older than 1 hour that hasn't been settled, award every
distinct non-author commenter the post's median rating (rounded) in Energy, then
mark it settled. Idempotent — safe to run hourly (Render cron / django-cron).
"""
from datetime import timedelta
from statistics import median

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import grant_energy
from apps.postz.models import Post


class Command(BaseCommand):
    help = "Settle 1-hour comment Energy rewards for eligible PostZ."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(hours=1)
        posts = (Post.objects.filter(created_at__lte=cutoff,
                                      comment_reward_settled=False)
                 .prefetch_related("ratings", "comments"))
        settled = awarded = 0
        for post in posts:
            stars = [r.stars for r in post.ratings.all()]
            reward = round(median(stars)) if stars else 0
            if reward:
                commenters = {c.user_id for c in post.comments.all()
                              if c.user_id != post.author_id}
                for uid in commenters:
                    # grant_energy takes a user; fetch lazily via the comment set.
                    user = next(c.user for c in post.comments.all()
                                if c.user_id == uid)
                    grant_energy(user, reward)
                    awarded += 1
            post.comment_reward_settled = True
            post.save(update_fields=["comment_reward_settled"])
            settled += 1
        self.stdout.write(self.style.SUCCESS(
            f"Settled {settled} post(s), awarded {awarded} commenter(s)."))
