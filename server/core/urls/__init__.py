from django.urls import path, include
from core.views.admin.activity_log_views import track_event

urlpatterns = [
    path('auth/', include('core.urls.auth_urls')),
    path('admin/', include('core.urls.admin_urls')),
    path('client/', include('core.urls.client_area_urls')),
    path('track/', track_event),
    path('', include('core.urls.website_urls')),
]
