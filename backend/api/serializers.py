from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, LawCase, CaseActuacion, CaseAlerta, CaseNote, Cliente, CaseTag, ActuacionTemplate, Aviso, UserStickyNote, UserCalendarEvent, CaseActivityLog


class UserSerializer(serializers.ModelSerializer):
    """Serializer para User"""
    rol_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'is_admin', 'is_staff', 'rol', 'rol_display']
        read_only_fields = ['id', 'is_staff']
    
    def get_rol_display(self, obj):
        """Obtener el nombre legible del rol"""
        rol_map = {
            'admin': 'Administrador',
            'abogado': 'Abogado',
            'usuario': 'Usuario',
        }
        return rol_map.get(obj.rol, 'Usuario')


class AvisoSerializer(serializers.ModelSerializer):
    """Serializer para Avisos"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Aviso
        fields = ['id', 'contenido', 'active', 'created_by', 'created_by_username', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class LoginSerializer(serializers.Serializer):
    """Serializer para login"""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Credenciales incorrectas.')
            if not user.is_active:
                raise serializers.ValidationError('Usuario inactivo.')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Debe proporcionar username y password.')
        return attrs


class CaseActuacionSerializer(serializers.ModelSerializer):
    """Serializer para actuaciones"""
    created_by_username = serializers.SerializerMethodField()
    last_modified_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseActuacion
        fields = [
            'id', 'caso', 'fecha', 'descripcion', 'tipo',
            'created_at', 'created_by', 'created_by_username',
            'updated_at', 'last_modified_by', 'last_modified_by_username'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']
        extra_kwargs = {
            'caso': {'required': False},  # Se asigna automáticamente en add_actuacion
        }
    
    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None
        
    def get_last_modified_by_username(self, obj):
        return obj.last_modified_by.username if obj.last_modified_by else None


class CaseAlertaSerializer(serializers.ModelSerializer):
    """Serializer para alertas"""
    created_by_username = serializers.SerializerMethodField()
    completed_by_username = serializers.SerializerMethodField()
    hora = serializers.TimeField(required=False, allow_null=True)
    tiempo_estimado_minutos = serializers.IntegerField(required=False, allow_null=True, min_value=0)

    class Meta:
        model = CaseAlerta
        fields = [
            'id', 'caso', 'titulo', 'resumen', 'hora', 'fecha_vencimiento', 
            'cumplida', 'prioridad', 'tiempo_estimado_minutos', 'created_at', 'created_by', 'created_by_username',
            'completed_by', 'completed_by_username', 'completed_at'
        ]
        read_only_fields = ['id', 'caso', 'created_at', 'created_by', 'completed_at', 'completed_by']
        extra_kwargs = {
            'resumen': {'required': False, 'allow_blank': True},
            'cumplida': {'required': False, 'default': False},
        }

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None
        
    def get_completed_by_username(self, obj):
        return obj.completed_by.username if obj.completed_by else None

    def to_internal_value(self, data):
        """Aceptar hora vacía como null para evitar 400"""
        data = dict(data) if data else {}
        if isinstance(data.get('hora'), str) and (data['hora'] or '').strip() == '':
            data['hora'] = None
        if data.get('tiempo_estimado_minutos') is None or data.get('tiempo_estimado_minutos') == '':
            data['tiempo_estimado_minutos'] = 0
        return super().to_internal_value(data)


class DashboardAlertaSerializer(serializers.ModelSerializer):
    """
    Serializer de alertas para dashboard.
    Incluye datos mínimos del expediente para navegación (case_id / caratula).
    """
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    completed_by_username = serializers.CharField(source='completed_by.username', read_only=True)
    case_id = serializers.IntegerField(source='caso_id', read_only=True)
    caratula = serializers.CharField(source='caso.caratula', read_only=True)
    codigo_interno = serializers.CharField(source='caso.codigo_interno', read_only=True)

    class Meta:
        model = CaseAlerta
        fields = [
            'id', 'caso', 'case_id', 'codigo_interno', 'caratula',
            'titulo', 'resumen', 'hora', 'fecha_vencimiento',
            'cumplida', 'prioridad', 'tiempo_estimado_minutos', 'created_at', 'created_by', 'created_by_username',
            'completed_by', 'completed_by_username', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at', 'created_by', 'completed_at', 'completed_by', 'case_id', 'caratula', 'codigo_interno']


class CalendarEventAlertaSerializer(serializers.ModelSerializer):
    """Evento de calendario: alerta. Formato unificado para frontend."""
    kind = serializers.SerializerMethodField()
    titulo = serializers.CharField(read_only=True)
    fecha = serializers.DateField(source='fecha_vencimiento', read_only=True)
    caratula = serializers.CharField(source='caso.caratula', read_only=True)
    codigo_interno = serializers.CharField(source='caso.codigo_interno', read_only=True)
    case = serializers.SerializerMethodField()

    class Meta:
        model = CaseAlerta
        fields = [
            'kind', 'id', 'titulo', 'resumen', 'fecha', 'hora', 'fecha_vencimiento',
            'caratula', 'codigo_interno', 'prioridad', 'cumplida', 'case'
        ]

    def get_kind(self, obj) -> str:
        return 'alerta'

    def get_case(self, obj) -> dict:
        """Objeto mínimo del expediente para navegación."""
        c = obj.caso
        return {'id': c.id, 'codigo_interno': c.codigo_interno, 'caratula': c.caratula}


class CalendarEventActuacionSerializer(serializers.ModelSerializer):
    """Evento de calendario: actuación. Formato unificado para frontend."""
    kind = serializers.SerializerMethodField()
    titulo = serializers.SerializerMethodField()
    fecha_vencimiento = serializers.DateField(source='fecha', read_only=True)
    caratula = serializers.CharField(source='caso.caratula', read_only=True)
    codigo_interno = serializers.CharField(source='caso.codigo_interno', read_only=True)
    case = serializers.SerializerMethodField()

    class Meta:
        model = CaseActuacion
        fields = [
            'kind', 'id', 'titulo', 'descripcion', 'tipo', 'fecha', 'fecha_vencimiento',
            'caratula', 'codigo_interno', 'case'
        ]

    def get_kind(self, obj) -> str:
        return 'actuacion'

    def get_titulo(self, obj) -> str:
        return obj.tipo or obj.descripcion[:80] if obj.descripcion else 'Sin título'

    def get_case(self, obj) -> dict:
        c = obj.caso
        return {'id': c.id, 'codigo_interno': c.codigo_interno, 'caratula': c.caratula}


class CalendarEventPersonalSerializer(serializers.ModelSerializer):
    """Evento de calendario: personal. Formato unificado para frontend."""
    kind = serializers.SerializerMethodField()
    fecha_vencimiento = serializers.DateField(source='fecha', read_only=True)
    caratula = serializers.SerializerMethodField()
    codigo_interno = serializers.SerializerMethodField()
    case = serializers.SerializerMethodField()

    class Meta:
        model = UserCalendarEvent
        fields = [
            'kind', 'id', 'titulo', 'descripcion', 'tipo', 'fecha', 'hora', 'fecha_vencimiento',
            'caratula', 'codigo_interno', 'case'
        ]

    def get_kind(self, obj) -> str:
        return 'personal'

    def get_caratula(self, obj) -> str:
        return obj.caso.caratula if obj.caso else ''

    def get_codigo_interno(self, obj) -> str:
        return obj.caso.codigo_interno if obj.caso else ''

    def get_case(self, obj) -> dict | None:
        if not obj.caso:
            return None
        c = obj.caso
        return {'id': c.id, 'codigo_interno': c.codigo_interno, 'caratula': c.caratula}


class UserCalendarEventSerializer(serializers.ModelSerializer):
    """Serializer CRUD para eventos personales del calendario."""
    class Meta:
        model = UserCalendarEvent
        fields = ['id', 'titulo', 'descripcion', 'fecha', 'hora', 'tipo', 'caso', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'hora': {'required': False, 'allow_null': True},
            'tipo': {'required': False, 'allow_blank': True},
            'descripcion': {'required': False, 'allow_blank': True},
            'caso': {'required': False, 'allow_null': True},
        }

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class UserStickyNoteSerializer(serializers.ModelSerializer):
    """Serializer para notitas/recordatorios personales."""
    class Meta:
        model = UserStickyNote
        fields = ['id', 'titulo', 'contenido', 'fecha_recordatorio', 'completada', 'orden', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class CaseNoteSerializer(serializers.ModelSerializer):
    """Serializer para notas"""
    created_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseNote
        fields = ['id', 'caso', 'titulo', 'resumen', 'contenido', 'etiqueta', 'created_at', 'created_by', 'created_by_username']
        read_only_fields = ['id', 'caso', 'created_at', 'created_by']

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None


class ClienteMinimalSerializer(serializers.ModelSerializer):
    """Solo id y nombre para dropdowns (menos payload)."""
    class Meta:
        model = Cliente
        fields = ['id', 'nombre_completo']


class AbogadoMinimalSerializer(serializers.ModelSerializer):
    """Solo id y username para multiselect de abogados asignados."""
    class Meta:
        model = User
        fields = ['id', 'username']


class ClienteSerializer(serializers.ModelSerializer):
    """Serializer para clientes"""
    total_expedientes = serializers.SerializerMethodField()
    
    class Meta:
        model = Cliente
        fields = [
            'id', 'nombre_completo', 'dni_ruc', 'telefono', 'email', 
            'direccion', 'notas', 'created_at', 'updated_at', 'total_expedientes'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_expedientes']
    
    def get_total_expedientes(self, obj):
        # Usar solo el valor anotado; evitar obj.expedientes.count() (N+1)
        return getattr(obj, 'total_expedientes_count', 0)


class CaseTagSerializer(serializers.ModelSerializer):
    """Serializer para etiquetas"""
    
    class Meta:
        model = CaseTag
        fields = ['id', 'nombre', 'color', 'descripcion', 'created_at']
        read_only_fields = ['id', 'created_at']


class ActuacionTemplateSerializer(serializers.ModelSerializer):
    """Serializer para plantillas de actuaciones"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = ActuacionTemplate
        fields = [
            'id', 'nombre', 'tipo', 'descripcion_template', 
            'created_by', 'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']


class LawCaseSerializer(serializers.ModelSerializer):
    """Serializer para expedientes con relaciones"""
    actuaciones = CaseActuacionSerializer(many=True, read_only=True)
    alertas = CaseAlertaSerializer(many=True, read_only=True)
    notas = CaseNoteSerializer(many=True, read_only=True)
    cliente = ClienteSerializer(read_only=True)
    cliente_id = serializers.PrimaryKeyRelatedField(
        queryset=Cliente.objects.all(), 
        source='cliente', 
        write_only=True, 
        required=False, 
        allow_null=True
    )
    etiquetas = CaseTagSerializer(many=True, read_only=True)
    etiquetas_ids = serializers.PrimaryKeyRelatedField(
        queryset=CaseTag.objects.all(),
        source='etiquetas',
        many=True,
        write_only=True,
        required=False
    )
    abogados_asignados = AbogadoMinimalSerializer(many=True, read_only=True)
    abogados_asignados_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(rol__in=['abogado', 'admin']),
        source='abogados_asignados',
        many=True,
        write_only=True,
        required=False
    )
    created_by_username = serializers.SerializerMethodField()
    last_modified_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = LawCase
        fields = [
            'id', 'codigo_interno', 'caratula', 'nro_expediente', 'juzgado', 'fuero',
            'estado', 'abogado_responsable', 'abogados_asignados', 'abogados_asignados_ids',
            'cliente', 'cliente_id', 'cliente_nombre', 'cliente_dni', 'contraparte',
            'fecha_inicio', 'folder_link', 'created_at', 'updated_at',
            'created_by', 'last_modified_by', 'created_by_username', 'last_modified_by_username',
            'actuaciones', 'alertas', 'notas', 'etiquetas', 'etiquetas_ids'
        ]
        read_only_fields = ['id', 'codigo_interno', 'created_at', 'updated_at', 'created_by', 'last_modified_by']
    
    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None
    
    def get_last_modified_by_username(self, obj):
        return obj.last_modified_by.username if obj.last_modified_by else None


class DashboardRecentCaseSerializer(serializers.ModelSerializer):
    """Mínimo para tabla del dashboard: solo campos usados. Sin etiquetas/cliente = 1 query menos."""
    last_modified_by_username = serializers.SerializerMethodField()

    class Meta:
        model = LawCase
        fields = ['id', 'codigo_interno', 'caratula', 'last_modified_by_username', 'updated_at']

    def get_last_modified_by_username(self, obj):
        return obj.last_modified_by.username if obj.last_modified_by else None


class LawCaseListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listado de expedientes"""
    created_by_username = serializers.SerializerMethodField()
    last_modified_by_username = serializers.SerializerMethodField()
    cliente_nombre_display = serializers.SerializerMethodField()
    abogados_asignados = AbogadoMinimalSerializer(many=True, read_only=True)
    etiquetas = CaseTagSerializer(many=True, read_only=True)
    
    class Meta:
        model = LawCase
        fields = [
            'id', 'codigo_interno', 'caratula', 'nro_expediente', 'juzgado', 'fuero',
            'estado', 'cliente', 'cliente_nombre', 'cliente_nombre_display', 'cliente_dni',
            'abogados_asignados', 'fecha_inicio', 'updated_at',
            'created_by_username', 'last_modified_by_username', 'etiquetas'
        ]
    
    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None
    
    def get_last_modified_by_username(self, obj):
        return obj.last_modified_by.username if obj.last_modified_by else None
    
    def get_cliente_nombre_display(self, obj):
        return obj.cliente.nombre_completo if obj.cliente else obj.cliente_nombre


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear usuarios"""
    password = serializers.CharField(write_only=True, min_length=4, required=True)
    rol = serializers.ChoiceField(choices=User.ROL_CHOICES, default='usuario', required=False)
    is_admin = serializers.BooleanField(required=False, default=False, write_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'rol', 'is_admin']
        extra_kwargs = {
            'username': {'required': True},
            'password': {'required': True, 'write_only': True},
            'rol': {'required': False},
        }
    
    def validate_username(self, value):
        """Validar que el username no exista"""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Este nombre de usuario ya existe')
        return value
    
    def validate(self, attrs):
        """Validar que si se envía is_admin, se sincronice con rol"""
        # Asegurar que rol tenga un valor por defecto si no se envía
        if 'rol' not in attrs or not attrs.get('rol'):
            attrs['rol'] = 'usuario'
        
        # Si se envía is_admin pero no rol, actualizar rol
        if attrs.get('is_admin') and attrs.get('rol') == 'usuario':
            attrs['rol'] = 'admin'
        
        # Si se envía rol, actualizar is_admin
        if attrs.get('rol') == 'admin':
            attrs['is_admin'] = True
        elif attrs.get('rol') in ['abogado', 'usuario']:
            attrs['is_admin'] = False
        
        return attrs
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'La contraseña es requerida'})
        
        rol = validated_data.pop('rol', 'usuario')
        is_admin = validated_data.pop('is_admin', False)
        
        # Asegurar sincronización rol/is_admin (por si no pasó por validate)
        if rol == 'admin':
            is_admin = True
        elif rol in ('abogado', 'usuario'):
            is_admin = False
        
        try:
            user = User.objects.create_user(
                username=validated_data['username'],
                password=password,
                rol=rol,
                is_admin=is_admin,
                is_staff=is_admin,  # Si es admin, también es staff
            )
            return user
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error en create_user: {str(e)}, rol={rol}, is_admin={is_admin}")
            raise serializers.ValidationError({'username': f'Error al crear el usuario: {str(e)}'})


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualizar usuarios"""
    password = serializers.CharField(write_only=True, min_length=4, required=False, allow_blank=True)
    rol = serializers.ChoiceField(choices=User.ROL_CHOICES, required=False)
    is_admin = serializers.BooleanField(required=False, write_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'rol', 'is_admin']
        extra_kwargs = {
            'username': {'required': False},
        }
    
    def validate_username(self, value):
        """Validar que el username no exista (excepto para el usuario actual)"""
        if self.instance and User.objects.filter(username=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('Este nombre de usuario ya existe')
        elif not self.instance and User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Este nombre de usuario ya existe')
        return value
    
    def validate(self, attrs):
        """Validar que si se envía is_admin, se sincronice con rol"""
        # Si se envía rol, actualizar is_admin
        if 'rol' in attrs:
            if attrs['rol'] == 'admin':
                attrs['is_admin'] = True
            elif attrs['rol'] in ['abogado', 'usuario']:
                attrs['is_admin'] = False
        
        # Si se envía is_admin pero no rol, actualizar rol
        if attrs.get('is_admin') and 'rol' not in attrs:
            attrs['rol'] = 'admin'
        elif not attrs.get('is_admin') and 'rol' not in attrs and 'is_admin' in attrs:
            # Si se establece is_admin=False pero no se especifica rol, mantener el rol actual
            pass
        
        return attrs
    
    def update(self, instance, validated_data):
        """Actualizar usuario"""
        password = validated_data.pop('password', None)
        rol = validated_data.pop('rol', None)
        is_admin = validated_data.pop('is_admin', None)
        
        # Actualizar contraseña si se proporciona
        if password:
            instance.set_password(password)
        
        # Actualizar rol si se proporciona
        if rol is not None:
            instance.rol = rol
            # Sincronizar is_admin con rol
            if rol == 'admin':
                instance.is_admin = True
                instance.is_staff = True
            else:
                instance.is_admin = False
        
        # Actualizar is_admin si se proporciona directamente
        if is_admin is not None:
            instance.is_admin = is_admin
            if is_admin:
                instance.rol = 'admin'
                instance.is_staff = True
            elif rol is None:  # Solo cambiar rol si no se especificó uno
                # Mantener el rol actual si no se especifica uno nuevo
                pass
        
        # Actualizar username si se proporciona
        if 'username' in validated_data:
            instance.username = validated_data['username']
        
        instance.save()
        return instance


class CaseActivityLogSerializer(serializers.ModelSerializer):
    user_username = serializers.SerializerMethodField()
    action_display = serializers.SerializerMethodField()
    caso = serializers.SerializerMethodField()
    
    class Meta:
        model = CaseActivityLog
        fields = [
            'id', 'action', 'action_display', 'entity_type', 'entity_id', 'caso_id',
            'caso', 'field_changed', 'old_value', 'new_value', 'description',
            'user_username', 'created_at'
        ]
    
    def get_user_username(self, obj):
        return obj.user.username if obj.user else 'Sistema'
    
    def get_action_display(self, obj):
        return obj.get_action_display()
    
    def get_caso(self, obj):
        if obj.caso:
            return {
                'id': obj.caso.id,
                'codigo_interno': obj.caso.codigo_interno,
                'caratula': obj.caso.caratula,
            }
        return None
