from django.core.management.base import BaseCommand
from api.models import User


class Command(BaseCommand):
    help = 'Crea o actualiza el usuario administrador inicial (admin/admin)'

    def handle(self, *args, **options):
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@neiraestudio.com',
                'is_staff': True,
                'is_superuser': True,
                'is_admin': True,
                'rol': 'admin',
            }
        )
        
        if created:
            admin_user.set_password('admin')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('Usuario admin creado exitosamente (admin/admin)'))
        else:
            # Actualizar el usuario existente para asegurar que tenga is_admin=True
            admin_user.rol = 'admin'
            admin_user.is_admin = True
            admin_user.is_staff = True
            admin_user.is_superuser = True
            admin_user.set_password('admin')  # Resetear contraseña por si acaso
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('Usuario admin actualizado exitosamente (admin/admin)'))
