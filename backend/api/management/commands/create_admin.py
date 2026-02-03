from django.core.management.base import BaseCommand
from decouple import config
from api.models import User


class Command(BaseCommand):
    help = 'Crea o actualiza un usuario administrador inicial (solo si se configura).'

    def handle(self, *args, **options):
        debug = config('DEBUG', default=True, cast=bool)
        username = config('BOOTSTRAP_ADMIN_USERNAME', default='admin' if debug else '')
        password = config('BOOTSTRAP_ADMIN_PASSWORD', default='admin' if debug else '')
        reset_password = config('BOOTSTRAP_ADMIN_RESET_PASSWORD', default=False, cast=bool)

        # En producción (DEBUG=False) NO permitimos admin/admin por defecto
        if not username or not password:
            self.stdout.write(self.style.WARNING(
                "No se creó/actualizó ningún usuario admin.\n"
                "Configura BOOTSTRAP_ADMIN_USERNAME y BOOTSTRAP_ADMIN_PASSWORD en variables de entorno.\n"
                "Tip: en producción (DEBUG=False) esto es obligatorio."
            ))
            return

        admin_user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f'{username}@neiraestudio.com',
                'is_staff': True,
                'is_superuser': True,
                'is_admin': True,
                'rol': 'admin',
            }
        )
        
        if created:
            admin_user.set_password(password)
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Usuario admin creado exitosamente ({username}/******)'))
        else:
            # Actualizar el usuario existente para asegurar permisos admin
            admin_user.rol = 'admin'
            admin_user.is_admin = True
            admin_user.is_staff = True
            admin_user.is_superuser = True
            if reset_password:
                admin_user.set_password(password)
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Usuario admin actualizado exitosamente ({username})'))
