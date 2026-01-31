from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, LawCase, CaseActuacion, CaseAlerta, CaseNote, Cliente, CaseTag, ActuacionTemplate


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
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = CaseActuacion
        fields = ['id', 'caso', 'fecha', 'descripcion', 'tipo', 'created_at', 'created_by', 'created_by_username']
        read_only_fields = ['id', 'created_at', 'created_by']
        extra_kwargs = {
            'caso': {'required': False},  # Se asigna automáticamente en add_actuacion
        }


class CaseAlertaSerializer(serializers.ModelSerializer):
    """Serializer para alertas"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    completed_by_username = serializers.CharField(source='completed_by.username', read_only=True)
    
    class Meta:
        model = CaseAlerta
        fields = [
            'id', 'caso', 'titulo', 'resumen', 'hora', 'fecha_vencimiento', 
            'cumplida', 'prioridad', 'created_at', 'created_by', 'created_by_username',
            'completed_by', 'completed_by_username', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at', 'created_by', 'completed_at', 'completed_by']


class CaseNoteSerializer(serializers.ModelSerializer):
    """Serializer para notas"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = CaseNote
        fields = ['id', 'caso', 'titulo', 'contenido', 'etiqueta', 'created_at', 'created_by', 'created_by_username']
        read_only_fields = ['id', 'created_at', 'created_by']


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
        return obj.expedientes.count()


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
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    last_modified_by_username = serializers.CharField(source='last_modified_by.username', read_only=True)
    
    class Meta:
        model = LawCase
        fields = [
            'id', 'codigo_interno', 'caratula', 'nro_expediente', 'juzgado', 'fuero',
            'estado', 'abogado_responsable', 'cliente', 'cliente_id', 'cliente_nombre', 
            'cliente_dni', 'contraparte', 'fecha_inicio', 'created_at', 'updated_at', 
            'created_by', 'last_modified_by', 'created_by_username', 'last_modified_by_username',
            'actuaciones', 'alertas', 'notas', 'etiquetas', 'etiquetas_ids'
        ]
        read_only_fields = ['id', 'codigo_interno', 'created_at', 'updated_at', 'created_by', 'last_modified_by']


class LawCaseListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listado de expedientes"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    last_modified_by_username = serializers.CharField(source='last_modified_by.username', read_only=True)
    cliente_nombre_display = serializers.SerializerMethodField()
    etiquetas = CaseTagSerializer(many=True, read_only=True)
    
    class Meta:
        model = LawCase
        fields = [
            'id', 'codigo_interno', 'caratula', 'nro_expediente', 'juzgado', 'fuero',
            'estado', 'cliente', 'cliente_nombre', 'cliente_nombre_display', 'cliente_dni', 
            'abogado_responsable', 'fecha_inicio', 'updated_at', 
            'created_by_username', 'last_modified_by_username', 'etiquetas'
        ]
    
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
        # Si se envía is_admin pero no rol, actualizar rol
        if attrs.get('is_admin') and not attrs.get('rol'):
            attrs['rol'] = 'admin'
        # Si se envía rol, actualizar is_admin
        if attrs.get('rol') == 'admin':
            attrs['is_admin'] = True
        elif attrs.get('rol') in ['abogado', 'usuario']:
            attrs['is_admin'] = False
        return attrs
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        rol = validated_data.pop('rol', 'usuario')
        is_admin = validated_data.pop('is_admin', False)
        
        # Sincronizar rol con is_admin
        if rol == 'admin':
            is_admin = True
        else:
            is_admin = False
        
        user = User.objects.create_user(
            username=validated_data['username'],
            password=password,
            rol=rol,
            is_admin=is_admin,
            is_staff=is_admin,  # Si es admin, también es staff
        )
        return user
