from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, LawCase, CaseActuacion, CaseAlerta, CaseNote, Cliente, CaseTag, ActuacionTemplate


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin personalizado para User"""
    list_display = ['username', 'email', 'rol', 'is_admin', 'is_staff', 'is_active', 'date_joined']
    list_filter = ['rol', 'is_admin', 'is_staff', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Permisos Adicionales', {'fields': ('rol', 'is_admin',)}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Permisos Adicionales', {'fields': ('rol', 'is_admin',)}),
    )


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    """Admin para clientes"""
    list_display = ['nombre_completo', 'dni_ruc', 'telefono', 'email', 'created_at']
    list_filter = ['created_at']
    search_fields = ['nombre_completo', 'dni_ruc', 'email', 'telefono']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CaseTag)
class CaseTagAdmin(admin.ModelAdmin):
    """Admin para etiquetas"""
    list_display = ['nombre', 'color', 'created_at']
    search_fields = ['nombre', 'descripcion']
    readonly_fields = ['created_at']


@admin.register(ActuacionTemplate)
class ActuacionTemplateAdmin(admin.ModelAdmin):
    """Admin para plantillas de actuaciones"""
    list_display = ['nombre', 'tipo', 'created_by', 'created_at']
    list_filter = ['tipo', 'created_at']
    search_fields = ['nombre', 'descripcion_template']
    readonly_fields = ['created_at', 'updated_at', 'created_by']


@admin.register(LawCase)
class LawCaseAdmin(admin.ModelAdmin):
    """Admin para expedientes"""
    list_display = ['codigo_interno', 'caratula', 'estado', 'cliente', 'cliente_nombre', 'created_by', 'updated_at']
    list_filter = ['estado', 'fuero', 'created_at', 'etiquetas']
    search_fields = ['codigo_interno', 'caratula', 'nro_expediente', 'cliente_nombre', 'cliente__nombre_completo']
    readonly_fields = ['codigo_interno', 'created_at', 'updated_at', 'created_by', 'last_modified_by']
    filter_horizontal = ['etiquetas']
    fieldsets = (
        ('Información Principal', {
            'fields': ('codigo_interno', 'caratula', 'nro_expediente', 'estado')
        }),
        ('Datos del Proceso', {
            'fields': ('juzgado', 'fuero', 'abogado_responsable', 'fecha_inicio')
        }),
        ('Partes', {
            'fields': ('cliente', 'cliente_nombre', 'cliente_dni', 'contraparte')
        }),
        ('Organización', {
            'fields': ('etiquetas',)
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at', 'created_by', 'last_modified_by')
        }),
    )


@admin.register(CaseActuacion)
class CaseActuacionAdmin(admin.ModelAdmin):
    """Admin para actuaciones"""
    list_display = ['caso', 'tipo', 'fecha', 'created_by', 'created_at']
    list_filter = ['tipo', 'fecha', 'created_at']
    search_fields = ['descripcion', 'caso__caratula', 'caso__codigo_interno']
    readonly_fields = ['created_at', 'created_by']


@admin.register(CaseAlerta)
class CaseAlertaAdmin(admin.ModelAdmin):
    """Admin para alertas"""
    list_display = ['titulo', 'caso', 'fecha_vencimiento', 'prioridad', 'cumplida', 'created_by']
    list_filter = ['cumplida', 'prioridad', 'fecha_vencimiento']
    search_fields = ['titulo', 'resumen', 'caso__caratula']
    readonly_fields = ['created_at', 'created_by', 'completed_at', 'completed_by']


@admin.register(CaseNote)
class CaseNoteAdmin(admin.ModelAdmin):
    """Admin para notas"""
    list_display = ['titulo', 'caso', 'etiqueta', 'created_by', 'created_at']
    list_filter = ['etiqueta', 'created_at']
    search_fields = ['titulo', 'contenido', 'caso__caratula']
    readonly_fields = ['created_at', 'created_by']
