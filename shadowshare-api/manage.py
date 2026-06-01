import os
from app import create_app

app = create_app()


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['createdb', 'run', 'migrate'], help='manage command')
    args = parser.parse_args()
    if args.command == 'createdb':
        with app.app_context():
            from app.extensions import db
            db.create_all()
            print('Created database tables')
    elif args.command == 'run':
        app.run(host=os.getenv('HOST', '127.0.0.1'), port=int(os.getenv('PORT', 8000)))
    elif args.command == 'migrate':
        from alembic.config import Config
        from alembic import command
        cfg = Config(os.path.join(os.path.dirname(__file__), 'alembic.ini'))
        command.upgrade(cfg, 'head')


if __name__ == '__main__':
    main()
