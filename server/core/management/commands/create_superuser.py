from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import IntegrityError


class Command(BaseCommand):
    help = 'Create a superuser by phone and password (username is set to phone on save).'

    def add_arguments(self, parser):
        parser.add_argument('--phone', type=str, help='Phone number (used as login identifier)')
        parser.add_argument('--password', type=str, help='Password')
        parser.add_argument('--name', type=str, default='', help='Display name (optional)')
        parser.add_argument('--email', type=str, default='', help='Email (optional)')
        parser.add_argument('--no-input', action='store_true', help='Do not prompt for input (use with --phone and --password)')

    def handle(self, *args, **options):
        User = get_user_model()
        no_input = options['no_input']

        if no_input:
            phone = options.get('phone')
            password = options.get('password')
            if not phone or not password:
                self.stderr.write(self.style.ERROR('With --no-input you must provide --phone and --password.'))
                return
            name = options.get('name') or ''
            email = options.get('email') or ''
        else:
            phone = options.get('phone') or input('Phone: ').strip()
            if not phone:
                self.stderr.write(self.style.ERROR('Phone cannot be blank.'))
                return
            password = options.get('password') or None
            if not password:
                from getpass import getpass
                password = getpass('Password: ')
                password2 = getpass('Password (again): ')
                if password != password2:
                    self.stderr.write(self.style.ERROR('Passwords do not match.'))
                    return
            name = options.get('name') or input('Name (optional): ').strip()
            email = options.get('email') or input('Email (optional): ').strip()

        try:
            user = User(
                phone=phone,
                name=name or '',
                email=email or '',
                is_staff=True,
                is_superuser=True,
                is_active=True,
            )
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Superuser created successfully: phone={phone} (username set to phone).'))
        except IntegrityError as e:
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                self.stderr.write(self.style.ERROR(f'A user with phone "{phone}" already exists.'))
            else:
                self.stderr.write(self.style.ERROR(str(e)))
