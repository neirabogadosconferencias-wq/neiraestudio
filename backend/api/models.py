from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
    """Usuario personalizado con campo is_admin y rol"""
    ROL_CHOICES = [
        ('admin', 'Administrador'),
        ('abogado', 'Abogado'),
        ('usuario', 'Usuario'),
    ]
    
    is_admin = models.BooleanField(default=False, verbose_name='Es Administrador')
    rol = models.CharField(
        max_length=20, 
        choices=ROL_CHOICES, 
        default='usuario',
        verbose_name='Rol'
    )
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['username']
    
    def __str__(self):
        return self.username
    
    def save(self, *args, **kwargs):
        """
        Sincroniza rol/permisos sin “romper” Django Admin.

        Reglas:
        - Un superuser siempre es admin.
        - Rol 'admin' => is_admin True + is_staff True (para acceder a /admin/)
        - Roles 'abogado' y 'usuario' => is_admin False (por ahora)
        """
        # Superuser siempre debe comportarse como admin
        if self.is_superuser:
            self.rol = 'admin'
            self.is_admin = True
            self.is_staff = True
        else:
            if self.rol == 'admin':
                self.is_admin = True
                # admin del sistema debería poder entrar a Django admin
                self.is_staff = True
            elif self.rol in ('abogado', 'usuario'):
                self.is_admin = False
                # No forzamos is_staff=False para no romper casos existentes;
                # pero por defecto estos roles no deberían acceder a /admin/.
        super().save(*args, **kwargs)


class Cliente(models.Model):
    """Modelo para clientes del estudio"""
    
    nombre_completo = models.CharField(max_length=200, verbose_name='Nombre Completo')
    dni_ruc = models.CharField(max_length=20, unique=True, verbose_name='DNI/RUC')
    telefono = models.CharField(max_length=20, blank=True, verbose_name='Teléfono')
    email = models.EmailField(blank=True, verbose_name='Email')
    direccion = models.TextField(blank=True, verbose_name='Dirección')
    notas = models.TextField(blank=True, verbose_name='Notas Adicionales')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Última Modificación')
    
    class Meta:
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        ordering = ['nombre_completo']
        indexes = [
            models.Index(fields=['dni_ruc']),
            models.Index(fields=['nombre_completo']),
        ]
    
    def __str__(self):
        return f"{self.nombre_completo} ({self.dni_ruc})"


class CaseTag(models.Model):
    """Etiquetas personalizables para expedientes"""
    
    nombre = models.CharField(max_length=50, unique=True, verbose_name='Nombre de Etiqueta')
    color = models.CharField(max_length=7, default='#3B82F6', verbose_name='Color (Hex)')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    
    class Meta:
        verbose_name = 'Etiqueta'
        verbose_name_plural = 'Etiquetas'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class ActuacionTemplate(models.Model):
    """Plantillas reutilizables para actuaciones"""
    
    nombre = models.CharField(max_length=100, unique=True, verbose_name='Nombre de Plantilla')
    tipo = models.CharField(max_length=100, default='Escrito', verbose_name='Tipo')
    descripcion_template = models.TextField(verbose_name='Plantilla de Descripción')
    # Variables disponibles: {caratula}, {cliente}, {nro_expediente}, {juzgado}, {fecha}
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='templates_created', verbose_name='Creado por')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Última Modificación')
    
    class Meta:
        verbose_name = 'Plantilla de Actuación'
        verbose_name_plural = 'Plantillas de Actuaciones'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class Aviso(models.Model):
    """Avisos importantes para el Dashboard (solo admin edita)"""
    contenido = models.TextField(verbose_name='Contenido del Aviso')
    active = models.BooleanField(default=True, verbose_name='Activo')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='avisos_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Aviso'
        verbose_name_plural = 'Avisos'
        ordering = ['-created_at']

    def __str__(self):
        return f"Aviso {self.id} - {self.created_at.strftime('%Y-%m-%d')}"


class LawCase(models.Model):
    """Modelo principal para expedientes legales"""
    
    class CaseStatus(models.TextChoices):
        OPEN = 'Abierto', 'Abierto'
        IN_PROGRESS = 'En Trámite', 'En Trámite'
        PAUSED = 'Pausado', 'Pausado'
        CLOSED = 'Cerrado', 'Cerrado'
    
    # Campos principales
    codigo_interno = models.CharField(max_length=50, unique=True, verbose_name='Código Interno')
    caratula = models.CharField(max_length=500, verbose_name='Carátula')
    nro_expediente = models.CharField(max_length=100, verbose_name='Número de Expediente')
    juzgado = models.CharField(max_length=200, blank=True, verbose_name='Juzgado')
    fuero = models.CharField(max_length=50, default='Civil', verbose_name='Fuero')
    estado = models.CharField(max_length=20, choices=CaseStatus.choices, default=CaseStatus.OPEN, verbose_name='Estado')
    
    # Información de partes
    abogado_responsable = models.CharField(max_length=200, blank=True, verbose_name='Abogado Responsable')
    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True, blank=True, related_name='expedientes', verbose_name='Cliente')
    cliente_nombre = models.CharField(max_length=200, blank=True, verbose_name='Cliente (Texto libre)')
    cliente_dni = models.CharField(max_length=20, blank=True, verbose_name='DNI/RUC Cliente')
    contraparte = models.CharField(max_length=200, blank=True, verbose_name='Contraparte')
    folder_link = models.URLField(max_length=500, blank=True, null=True, verbose_name='Link Carpeta Digital')
    etiquetas = models.ManyToManyField(CaseTag, blank=True, related_name='expedientes', verbose_name='Etiquetas')
    
    # Fechas y auditoría
    fecha_inicio = models.DateField(default=timezone.now, verbose_name='Fecha de Inicio')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Última Modificación')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='cases_created', verbose_name='Creado por')
    last_modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='cases_modified', verbose_name='Modificado por')
    
    class Meta:
        verbose_name = 'Expediente'
        verbose_name_plural = 'Expedientes'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['codigo_interno']),
            models.Index(fields=['estado']),
            models.Index(fields=['-updated_at']),
            models.Index(fields=['abogado_responsable']),
            models.Index(fields=['cliente']),
            # Índices para dashboard
            models.Index(fields=['created_at']),
            models.Index(fields=['fuero']),
        ]
    
    def __str__(self):
        return f"{self.codigo_interno} - {self.caratula}"


class CaseActuacion(models.Model):
    """Actuaciones o eventos del expediente"""
    
    caso = models.ForeignKey(LawCase, on_delete=models.CASCADE, related_name='actuaciones', verbose_name='Expediente')
    fecha = models.DateField(default=timezone.now, verbose_name='Fecha')
    descripcion = models.TextField(verbose_name='Descripción')
    tipo = models.CharField(max_length=100, default='Escrito', verbose_name='Tipo')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='actuaciones_created', verbose_name='Creado por')
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True, verbose_name='Última modificación')
    last_modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='actuaciones_modified', verbose_name='Modificado por')
    
    class Meta:
        verbose_name = 'Actuación'
        verbose_name_plural = 'Actuaciones'
        ordering = ['-fecha', '-created_at']
        indexes = [
            models.Index(fields=['caso', '-fecha']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.tipo} - {self.caso.codigo_interno}"


class CaseAlerta(models.Model):
    """Alertas y plazos del expediente"""
    
    class CasePriority(models.TextChoices):
        ALTA = 'Alta', 'Alta'
        MEDIA = 'Media', 'Media'
        BAJA = 'Baja', 'Baja'
    
    caso = models.ForeignKey(LawCase, on_delete=models.CASCADE, related_name='alertas', verbose_name='Expediente')
    titulo = models.CharField(max_length=200, verbose_name='Título')
    resumen = models.TextField(blank=True, verbose_name='Resumen')
    hora = models.TimeField(null=True, blank=True, verbose_name='Hora')
    fecha_vencimiento = models.DateField(verbose_name='Fecha de Vencimiento')
    cumplida = models.BooleanField(default=False, verbose_name='Cumplida')
    prioridad = models.CharField(max_length=10, choices=CasePriority.choices, default=CasePriority.MEDIA, verbose_name='Prioridad')
    tiempo_estimado_minutos = models.PositiveIntegerField(null=True, blank=True, default=0, verbose_name='Tiempo estimado (minutos)')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='alertas_created', verbose_name='Creado por')
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='alertas_completed', verbose_name='Completada por')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de Cumplimiento')
    
    class Meta:
        verbose_name = 'Alerta'
        verbose_name_plural = 'Alertas'
        ordering = ['fecha_vencimiento', 'prioridad']
        indexes = [
            models.Index(fields=['caso', 'fecha_vencimiento']),
            models.Index(fields=['cumplida']),
            # Índice compuesto para ordenamiento en dashboard
            models.Index(fields=['cumplida', 'fecha_vencimiento']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.caso.codigo_interno}"


class CaseNote(models.Model):
    """Notas estratégicas del expediente (Biblioteca)"""
    
    class NoteLabel(models.TextChoices):
        ESTRATEGIA = 'Estrategia', 'Estrategia'
        DOCUMENTACION = 'Documentación', 'Documentación'
        INVESTIGACION = 'Investigación', 'Investigación'
        JURISPRUDENCIA = 'Jurisprudencia', 'Jurisprudencia'
    
    caso = models.ForeignKey(LawCase, on_delete=models.CASCADE, related_name='notas', verbose_name='Expediente')
    titulo = models.CharField(max_length=200, verbose_name='Título')
    resumen = models.CharField(max_length=500, blank=True, verbose_name='Resumen / Descripción breve')
    contenido = models.TextField(verbose_name='Contenido')
    etiqueta = models.CharField(max_length=50, choices=NoteLabel.choices, default=NoteLabel.ESTRATEGIA, verbose_name='Etiqueta')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='notas_created', verbose_name='Creado por')
    
    class Meta:
        verbose_name = 'Nota'
        verbose_name_plural = 'Notas'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['caso', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.caso.codigo_interno}"
