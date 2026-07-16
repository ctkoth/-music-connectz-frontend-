from django.contrib import admin

from .models import Comment, Post, Rating


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "genre", "is_active", "comment_reward_settled", "created_at")
    list_filter = ("is_active", "genre", "comment_reward_settled")
    search_fields = ("author__username", "content")


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "user", "stars", "created_at")
    list_filter = ("stars",)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("id", "post", "user", "created_at")
    search_fields = ("user__username", "text")
