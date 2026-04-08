from django.urls import path
from core.views.website import home_views, landing_views, site_settings_views, cms_page_views, app_version_views

urlpatterns = [
    path('home/', home_views.home_config),
    path('landing/', landing_views.landing_content),
    path('site-settings/', site_settings_views.public_site_settings),
    path('app-version/', app_version_views.public_app_version),
    path('pages/<slug:slug>/', cms_page_views.public_cms_page),
]
