from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Q
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime, timedelta

from .models import User, LawCase, CaseActuacion, CaseAlerta, CaseNote, Cliente, CaseTag, ActuacionTemplate
from .serializers import (
    UserSerializer, UserCreateSerializer, LoginSerializer,
    LawCaseSerializer, LawCaseListSerializer,
    CaseActuacionSerializer, CaseAlertaSerializer, CaseNoteSerializer,
    ClienteSerializer, CaseTagSerializer, ActuacionTemplateSerializer
)


class IsAdminOrReadOnly(permissions.BasePermission):
    """Permiso: solo admin puede acceder"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Para UserViewSet, solo admins pueden acceder (tanto leer como escribir)
        if view.__class__.__name__ == 'UserViewSet':
            return request.user.is_admin
        # Para otros viewsets, solo admin puede escribir
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_admin


class AuthView(APIView):
    """Vista para autenticación"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Login - retorna JWT tokens"""
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    """Obtener usuario actual"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de usuarios (solo admin)"""
    queryset = User.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def get_queryset(self):
        # Solo los admins pueden ver usuarios
        if not self.request.user.is_authenticated:
            return User.objects.none()
        
        if not self.request.user.is_admin:
            return User.objects.none()
        
        # No permitir eliminar el usuario admin principal
        return User.objects.exclude(id=1)
    
    def perform_create(self, serializer):
        """Crear usuario - solo admins pueden hacerlo"""
        if not self.request.user.is_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Solo los administradores pueden crear usuarios')
        try:
            serializer.save()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error al crear usuario: {str(e)}, datos: {self.request.data}")
            raise


class LawCaseViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de expedientes"""
    queryset = LawCase.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return LawCaseListSerializer
        return LawCaseSerializer
    
    def get_queryset(self):
        queryset = LawCase.objects.select_related(
            'created_by', 'last_modified_by', 'cliente'
        ).prefetch_related(
            'actuaciones', 'alertas', 'notas', 'etiquetas'
        )
        
        # Filtros avanzados
        search = self.request.query_params.get('search', None)
        estado = self.request.query_params.get('estado', None)
        abogado = self.request.query_params.get('abogado', None)
        fuero = self.request.query_params.get('fuero', None)
        juzgado = self.request.query_params.get('juzgado', None)
        cliente_id = self.request.query_params.get('cliente', None)
        etiqueta_id = self.request.query_params.get('etiqueta', None)
        fecha_inicio_desde = self.request.query_params.get('fecha_inicio_desde', None)
        fecha_inicio_hasta = self.request.query_params.get('fecha_inicio_hasta', None)
        fecha_modificacion_desde = self.request.query_params.get('fecha_modificacion_desde', None)
        fecha_modificacion_hasta = self.request.query_params.get('fecha_modificacion_hasta', None)
        
        if search:
            queryset = queryset.filter(
                Q(caratula__icontains=search) |
                Q(cliente_nombre__icontains=search) |
                Q(nro_expediente__icontains=search) |
                Q(codigo_interno__icontains=search) |
                Q(cliente__nombre_completo__icontains=search) |
                Q(cliente__dni_ruc__icontains=search)
            )
        
        if estado:
            queryset = queryset.filter(estado=estado)
        
        if abogado:
            queryset = queryset.filter(abogado_responsable__icontains=abogado)
        
        if fuero:
            queryset = queryset.filter(fuero=fuero)
        
        if juzgado:
            queryset = queryset.filter(juzgado__icontains=juzgado)
        
        if cliente_id:
            queryset = queryset.filter(cliente_id=cliente_id)
        
        if etiqueta_id:
            queryset = queryset.filter(etiquetas__id=etiqueta_id)
        
        if fecha_inicio_desde:
            queryset = queryset.filter(fecha_inicio__gte=fecha_inicio_desde)
        
        if fecha_inicio_hasta:
            queryset = queryset.filter(fecha_inicio__lte=fecha_inicio_hasta)
        
        if fecha_modificacion_desde:
            queryset = queryset.filter(updated_at__gte=fecha_modificacion_desde)
        
        if fecha_modificacion_hasta:
            queryset = queryset.filter(updated_at__lte=fecha_modificacion_hasta)
        
        return queryset.distinct()
    
    def perform_create(self, serializer):
        """Generar código interno automáticamente"""
        year = timezone.now().year
        count = LawCase.objects.count() + 1
        codigo = f"ENT-{str(count).zfill(4)}-{year}-JLCA"
        
        serializer.save(
            codigo_interno=codigo,
            created_by=self.request.user,
            last_modified_by=self.request.user
        )
    
    def perform_update(self, serializer):
        serializer.save(last_modified_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_actuacion(self, request, pk=None):
        """Agregar actuación a un expediente"""
        caso = self.get_object()
        serializer = CaseActuacionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(caso=caso, created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        # Log de errores para debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error al crear actuación: {serializer.errors}, datos recibidos: {request.data}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_alerta(self, request, pk=None):
        """Agregar alerta a un expediente"""
        caso = self.get_object()
        serializer = CaseAlertaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(caso=caso, created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_note(self, request, pk=None):
        """Agregar nota a un expediente"""
        caso = self.get_object()
        serializer = CaseNoteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(caso=caso, created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Exportar expedientes a Excel"""
        try:
            from openpyxl import Workbook
            from openpyxl.styles import Font, PatternFill, Alignment
        except ImportError:
            return Response(
                {'error': 'openpyxl no está instalado. Ejecuta: pip install openpyxl'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        queryset = self.get_queryset()
        
        # Crear workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Expedientes"
        
        # Estilos
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF", size=11)
        center_alignment = Alignment(horizontal="center", vertical="center")
        
        # Encabezados
        headers = [
            "Código Interno", "Carátula", "Nro. Expediente", "Juzgado", "Fuero",
            "Estado", "Cliente", "DNI/RUC", "Abogado Responsable", "Contraparte",
            "Fecha Inicio", "Última Modificación", "Creado por", "Modificado por"
        ]
        
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num, value=header)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = center_alignment
        
        # Datos
        for row_num, caso in enumerate(queryset, 2):
            cliente_nombre = caso.cliente.nombre_completo if caso.cliente else caso.cliente_nombre
            cliente_dni = caso.cliente.dni_ruc if caso.cliente else caso.cliente_dni
            
            ws.cell(row=row_num, column=1, value=caso.codigo_interno)
            ws.cell(row=row_num, column=2, value=caso.caratula)
            ws.cell(row=row_num, column=3, value=caso.nro_expediente)
            ws.cell(row=row_num, column=4, value=caso.juzgado)
            ws.cell(row=row_num, column=5, value=caso.fuero)
            ws.cell(row=row_num, column=6, value=caso.estado)
            ws.cell(row=row_num, column=7, value=cliente_nombre)
            ws.cell(row=row_num, column=8, value=cliente_dni)
            ws.cell(row=row_num, column=9, value=caso.abogado_responsable)
            ws.cell(row=row_num, column=10, value=caso.contraparte)
            ws.cell(row=row_num, column=11, value=caso.fecha_inicio.strftime('%Y-%m-%d') if caso.fecha_inicio else '')
            ws.cell(row=row_num, column=12, value=caso.updated_at.strftime('%Y-%m-%d %H:%M') if caso.updated_at else '')
            ws.cell(row=row_num, column=13, value=caso.created_by.username if caso.created_by else '')
            ws.cell(row=row_num, column=14, value=caso.last_modified_by.username if caso.last_modified_by else '')
        
        # Ajustar ancho de columnas
        column_widths = [18, 40, 18, 25, 12, 12, 30, 15, 25, 30, 12, 18, 15, 15]
        for col_num, width in enumerate(column_widths, 1):
            ws.column_dimensions[chr(64 + col_num)].width = width
        
        # Preparar respuesta
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f"Expedientes_Estudio_Neira_Trujillo_{timezone.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        wb.save(response)
        return response


class CaseActuacionViewSet(viewsets.ModelViewSet):
    """ViewSet para actuaciones"""
    queryset = CaseActuacion.objects.select_related('caso', 'created_by')
    serializer_class = CaseActuacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        caso_id = self.request.query_params.get('caso', None)
        if caso_id:
            queryset = queryset.filter(caso_id=caso_id)
        return queryset


class CaseAlertaViewSet(viewsets.ModelViewSet):
    """ViewSet para alertas"""
    queryset = CaseAlerta.objects.select_related('caso', 'created_by', 'completed_by')
    serializer_class = CaseAlertaSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def toggle_cumplida(self, request, pk=None):
        """Toggle estado cumplida de alerta"""
        alerta = self.get_object()
        alerta.cumplida = not alerta.cumplida
        if alerta.cumplida:
            alerta.completed_by = request.user
            alerta.completed_at = timezone.now()
        else:
            alerta.completed_by = None
            alerta.completed_at = None
        alerta.save()
        return Response(self.get_serializer(alerta).data)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        caso_id = self.request.query_params.get('caso', None)
        cumplida = self.request.query_params.get('cumplida', None)
        if caso_id:
            queryset = queryset.filter(caso_id=caso_id)
        if cumplida is not None:
            queryset = queryset.filter(cumplida=cumplida.lower() == 'true')
        return queryset


class CaseNoteViewSet(viewsets.ModelViewSet):
    """ViewSet para notas"""
    queryset = CaseNote.objects.select_related('caso', 'created_by')
    serializer_class = CaseNoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        caso_id = self.request.query_params.get('caso', None)
        if caso_id:
            queryset = queryset.filter(caso_id=caso_id)
        return queryset


class ClienteViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de clientes"""
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(nombre_completo__icontains=search) |
                Q(dni_ruc__icontains=search) |
                Q(email__icontains=search)
            )
        return queryset


class CaseTagViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de etiquetas"""
    queryset = CaseTag.objects.all()
    serializer_class = CaseTagSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(nombre__icontains=search)
        return queryset


class ActuacionTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de plantillas de actuaciones"""
    queryset = ActuacionTemplate.objects.all()
    serializer_class = ActuacionTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    def get_queryset(self):
        queryset = super().get_queryset()
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        return queryset


class DashboardView(APIView):
    """Vista para datos del dashboard"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtener estadísticas y alertas para dashboard"""
        cases = LawCase.objects.all()
        
        # Estadísticas básicas
        stats = {
            'total_cases': cases.count(),
            'open_cases': cases.filter(estado=LawCase.CaseStatus.OPEN).count(),
            'in_progress_cases': cases.filter(estado=LawCase.CaseStatus.IN_PROGRESS).count(),
            'paused_cases': cases.filter(estado=LawCase.CaseStatus.PAUSED).count(),
            'closed_cases': cases.filter(estado=LawCase.CaseStatus.CLOSED).count(),
        }
        
        # Estadísticas por fuero
        stats_by_fuero = {}
        for fuero in ['Civil', 'Comercial', 'Penal', 'Laboral', 'Familia']:
            stats_by_fuero[fuero] = cases.filter(fuero=fuero).count()
        
        # Estadísticas por abogado
        abogados = cases.exclude(abogado_responsable='').values_list('abogado_responsable', flat=True).distinct()
        stats_by_abogado = {}
        for abogado in abogados:
            stats_by_abogado[abogado] = cases.filter(abogado_responsable=abogado).count()
        
        # Casos por mes (últimos 12 meses)
        from django.db.models import Count
        from django.utils import timezone
        from datetime import timedelta
        cases_by_month = []
        for i in range(12):
            month_start = timezone.now().replace(day=1) - timedelta(days=30*i)
            month_end = month_start + timedelta(days=30)
            count = cases.filter(created_at__gte=month_start, created_at__lt=month_end).count()
            cases_by_month.append({
                'mes': month_start.strftime('%Y-%m'),
                'total': count
            })
        cases_by_month.reverse()
        
        # Obtener todas las alertas
        all_alertas = CaseAlerta.objects.select_related('caso', 'created_by', 'completed_by').all()
        
        # Últimos casos actualizados
        recent_cases = LawCase.objects.select_related('created_by', 'last_modified_by', 'cliente').prefetch_related('etiquetas').order_by('-updated_at')[:5]
        
        return Response({
            'stats': stats,
            'stats_by_fuero': stats_by_fuero,
            'stats_by_abogado': stats_by_abogado,
            'cases_by_month': cases_by_month,
            'recent_cases': LawCaseListSerializer(recent_cases, many=True).data,
            'alertas': CaseAlertaSerializer(all_alertas, many=True).data
        })
