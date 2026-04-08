from django.apps import AppConfig
from django.db.backends.signals import connection_created


def _set_sqlite_wal(sender, connection, **kwargs):
    """
    Enable WAL journal mode for SQLite connections.
    WAL allows concurrent reads while a write is in progress and dramatically
    reduces "database is locked" errors under concurrent load.
    busy_timeout is set here as a belt-and-suspenders backup to the Django
    OPTIONS timeout (which covers the Python-level sqlite3 module timeout).
    """
    if connection.vendor == 'sqlite':
        cursor = connection.cursor()
        cursor.execute('PRAGMA journal_mode=WAL;')
        cursor.execute('PRAGMA synchronous=NORMAL;')
        cursor.execute('PRAGMA busy_timeout=30000;')  # 30 000 ms = 30 s


class CoreConfig(AppConfig):
    name = 'core'

    def ready(self):
        connection_created.connect(_set_sqlite_wal)
        # Transactional push / inbox (registers signal receivers)
        from core.signals import transactional_notifications  # noqa: F401
