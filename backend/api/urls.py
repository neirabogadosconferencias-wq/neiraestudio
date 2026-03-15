from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AuthView, CurrentUserView, AssignableUsersView,
    DashboardView, DashboardAlertasView, DashboardActivitiesView, CalendarEventsView,
    ExportActivitiesView,
    UserViewSet, LawCaseViewSet,
    CaseActuacionViewSet, CaseAlertaViewSet, CaseNoteViewSet,
    UserStickyNoteViewSet, UserCalendarEventViewSet,
    ClienteViewSet, CaseTagViewSet, ActuacionTemplateViewSet,
    AvisoViewSet, CaseActivityLogViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'cases', LawCaseViewSet, basename='case')
router.register(r'actuaciones', CaseActuacionViewSet, basename='actuacion')
router.register(r'avisos', AvisoViewSet, basename='aviso')
router.register(r'alertas', CaseAlertaViewSet, basename='alerta')
router.register(r'notas', CaseNoteViewSet, basename='note')
router.register(r'clientes', ClienteViewSet, basename='cliente')
router.register(r'tags', CaseTagViewSet, basename='tag')
router.register(r'actuacion-templates', ActuacionTemplateViewSet, basename='actuacion-template')
router.register(r'sticky-notes', UserStickyNoteViewSet, basename='sticky-note')
router.register(r'calendar-events', UserCalendarEventViewSet, basename='calendar-event')

urlpatterns = [
    # Autenticación
    path('auth/login/', AuthView.as_view(), name='login'),
    path('auth/me/', CurrentUserView.as_view(), name='current-user'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('assignables/', AssignableUsersView.as_view(), name='users-assignables'),
    
    # Dashboard
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('dashboard/alertas/', DashboardAlertasView.as_view(), name='dashboard-alertas'),
    path('dashboard/activities/', DashboardActivitiesView.as_view(), name='dashboard-activities'),
    path('dashboard/export-activities/', ExportActivitiesView.as_view(), name='export-activities'),
    path('calendar/events/', CalendarEventsView.as_view(), name='calendar-events'),
    
    # Routers
    path('', include(router.urls)),
]
