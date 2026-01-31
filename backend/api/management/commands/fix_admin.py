from django.core.management.base import BaseCommand
from api.models import User


class Command(BaseCommand):
    help = 'Asegura que el usuario admin tenga is_admin=True'

    def handle(self, *args, **options):
        try:
            admin_user = User.objects.get(username='admin')
            if not admin_user.is_admin:
                admin_user.is_admin = True
                admin_user.is_staff = True
                admin_user.is_superuser = True
                admin_user.rol = 'admin'
                admin_user.save()
                self.stdout.write(self.style.SUCCESS(f'Usuario admin actualizado: is_admin={admin_user.is_admin}'))
            else:
                # Asegurar que rol también esté sincronizado
                if admin_user.rol != 'admin':
                    admin_user.rol = 'admin'
                    admin_user.is_staff = True
                    admin_user.is_superuser = True
                    admin_user.save()
                self.stdout.write(self.style.SUCCESS(f'Usuario admin ya tiene is_admin=True'))
            
            # Mostrar información del usuario
            self.stdout.write(f'ID: {admin_user.id}')
            self.stdout.write(f'Username: {admin_user.username}')
            self.stdout.write(f'is_admin: {admin_user.is_admin}')
            self.stdout.write(f'is_staff: {admin_user.is_staff}')
            self.stdout.write(f'is_superuser: {admin_user.is_superuser}')
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR('Usuario admin no existe. Ejecuta: python manage.py create_admin'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {str(e)}'))
