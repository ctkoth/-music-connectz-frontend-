from django.contrib import admin

from .models import SpecEntry


@admin.register(SpecEntry)
class SpecEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "app", "label", "price_spinaz", "created_at")
    list_filter = ("app",)
    search_fields = ("owner__username", "label", "value")
