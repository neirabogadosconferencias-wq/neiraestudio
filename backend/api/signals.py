from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.forms import model_to_dict
from .models import (
    LawCase, CaseActuacion, CaseAlerta, CaseNote, Cliente, CaseActivityLog
)


def get_field_display(instance, field_name):
    """Obtiene el valor legible de un campo"""
    field = instance._meta.get_field(field_name)
    value = getattr(instance, field_name)
    if value is None:
        return ''
    if hasattr(field, 'choices') and field.choices:
        return dict(field.choices).get(value, str(value))
    if hasattr(instance, f'get_{field_name}_display'):
        return getattr(instance, f'get_{field_name}_display')()
    return str(value)


def truncate_value(value, max_length=100):
    """Trunca valores largos para el log"""
    if value is None:
        return ''
    s = str(value)
    return s[:max_length] + '...' if len(s) > max_length else s


@receiver(post_save, sender=CaseActuacion)
def log_actuacion_save(sender, instance, created, **kwargs):
    action = 'create' if created else 'update'
    desc = f"{'Creó' if created else 'Actualizó'} actuación: {instance.tipo or 'Sin tipo'}"
    if not created:
        desc += f" (ID: {instance.id})"
    CaseActivityLog.objects.create(
        caso=instance.caso,
        action=action,
        entity_type='CaseActuacion',
        entity_id=instance.id,
        description=desc,
        user=instance.created_by
    )


@receiver(post_delete, sender=CaseActuacion)
def log_actuacion_delete(sender, instance, **kwargs):
    CaseActivityLog.objects.create(
        caso=instance.caso,
        action='delete',
        entity_type='CaseActuacion',
        entity_id=instance.id,
        description=f"Eliminó actuación: {instance.tipo or 'Sin tipo'}",
        user=None
    )


@receiver(post_save, sender=CaseAlerta)
def log_alerta_save(sender, instance, created, **kwargs):
    if created:
        desc = f"Creó alerta/plazo: {instance.titulo}"
        CaseActivityLog.objects.create(
            caso=instance.caso,
            action='create',
            entity_type='CaseAlerta',
            entity_id=instance.id,
            description=desc,
            user=instance.created_by
        )
    else:
        changes = []
        old_instance = CaseAlerta.objects.filter(pk=instance.pk).first()
        if old_instance:
            if old_instance.cumplida != instance.cumplida:
                action = 'toggle'
                estado = 'completada' if instance.cumplida else 'reabierta'
                desc = f"Alert: {instance.titulo} - {estado} ({instance.prioridad})"
                CaseActivityLog.objects.create(
                    caso=instance.caso,
                    action=action,
                    entity_type='CaseAlerta',
                    entity_id=instance.id,
                    field_changed='cumplida',
                    old_value=str(old_instance.cumplida),
                    new_value=str(instance.cumplida),
                    description=desc,
                    user=instance.completed_by if instance.cumplida else instance.created_by
                )


@receiver(post_delete, sender=CaseAlerta)
def log_alerta_delete(sender, instance, **kwargs):
    CaseActivityLog.objects.create(
        caso=instance.caso,
        action='delete',
        entity_type='CaseAlerta',
        entity_id=instance.id,
        description=f"Eliminó alerta/plazo: {instance.titulo}",
        user=None
    )


@receiver(post_save, sender=CaseNote)
def log_note_save(sender, instance, created, **kwargs):
    action = 'create' if created else 'update'
    desc = f"{'Creó' if created else 'Actualizó'} nota: {instance.titulo} [{instance.etiqueta}]"
    if not created:
        desc += f" (ID: {instance.id})"
    CaseActivityLog.objects.create(
        caso=instance.caso,
        action=action,
        entity_type='CaseNote',
        entity_id=instance.id,
        description=desc,
        user=instance.created_by
    )


@receiver(post_delete, sender=CaseNote)
def log_note_delete(sender, instance, **kwargs):
    CaseActivityLog.objects.create(
        caso=instance.caso,
        action='delete',
        entity_type='CaseNote',
        entity_id=instance.id,
        description=f"Eliminó nota: {instance.titulo}",
        user=None
    )


@receiver(post_save, sender=Cliente)
def log_cliente_save(sender, instance, created, **kwargs):
    action = 'create' if created else 'update'
    desc = f"{'Creó' if created else 'Actualizó'} cliente: {instance.nombre_completo}"
    if not created:
        desc += f" (DNI: {instance.dni_ruc})"
    CaseActivityLog.objects.create(
        caso=None,
        action=action,
        entity_type='Cliente',
        entity_id=instance.id,
        description=desc,
        user=None
    )


@receiver(post_delete, sender=Cliente)
def log_cliente_delete(sender, instance, **kwargs):
    CaseActivityLog.objects.create(
        caso=None,
        action='delete',
        entity_type='Cliente',
        entity_id=instance.id,
        description=f"Eliminó cliente: {instance.nombre_completo} (DNI: {instance.dni_ruc})",
        user=None
    )
