from django.urls import path
from core.views import auth_views

urlpatterns = [
    path('login/', auth_views.login),
    path('register/', auth_views.register),
    path('register/request-otp/', auth_views.register_request_otp),
    path('register/verify-otp/', auth_views.register_verify_otp),
    path('register/complete/', auth_views.register_complete),
    path('forgot-password/request-otp/', auth_views.forgot_password_request_otp),
    path('forgot-password/verify-otp/', auth_views.forgot_password_verify_otp),
    path('forgot-password/reset/', auth_views.reset_password),
    path('me/', auth_views.me),
    path('logout/', auth_views.logout),
]
