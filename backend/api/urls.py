from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AuthView, CurrentUserView, DashboardView,
    UserViewSet, LawCaseViewSet,
    CaseActuacionViewSet, CaseAlertaViewSet, CaseNoteViewSet,
    ClienteViewSet, CaseTagViewSet, ActuacionTemplateViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'cases', LawCaseViewSet, basename='case')
router.register(r'actuaciones', CaseActuacionViewSet, basename='actuacion')
router.register(r'alertas', CaseAlertaViewSet, basename='alerta')
router.register(r'notas', CaseNoteViewSet, basename='note')
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'tags', CaseTagViewSet, basename='tag')
router.register(r'actuacion-templates', ActuacionTemplateViewSet, basename='actuacion-template')

urlpatterns = [
    # Autenticación
    path('auth/login/', AuthView.as_view(), name='login'),
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # Dashboard
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    
    # Routers
    path('', include(router.urls)),
]
