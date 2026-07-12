from django.contrib import admin

from .models import DirectMessage


@admin.register(DirectMessage)
class DirectMessageAdmin(admin.ModelAdmin):
    list_display = ("sender", "recipient", "cost_energy", "read", "created_at")
    search_fields = ("sender__username", "recipient__username")
