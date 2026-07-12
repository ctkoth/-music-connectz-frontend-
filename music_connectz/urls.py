from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse(
        {
            "service": "music-connectz-backend",
            "status": "ok",
            "endpoints": [
                "/api/auth/register/",
                "/api/auth/login/",
                "/api/auth/oauth/{google|github|apple}/",
                "/api/mimez/skillz/...",
                "/api/directz/skillz/...",
                "/admin/",
            ],
        }
    )


urlpatterns = [
    path("", health, name="health"),
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/mimez/", include("apps.mimez.urls")),
    path("api/directz/", include("apps.directz.urls")),
    path("api/lessonz/", include("apps.lessonz.urls")),
    path("api/drumz/", include("apps.drumz.urls")),
    path("api/violinz/", include("apps.violinz.urls")),
    path("api/guitarz/", include("apps.guitarz.urls")),
    path("api/bassz/", include("apps.bassz.urls")),
    path("api/keyz/", include("apps.keyz.urls")),
    path("api/messagez/", include("apps.messagez.urls")),
    path("api/collabz/", include("apps.collabz.urls")),
    path("api/singz/", include("apps.singz.urls")),
    path("api/rapz/", include("apps.rapz.urls")),
    path("api/groupz/", include("apps.groupz.urls")),
    path("api/bugz/", include("apps.bugz.urls")),
]
