from flask import Flask
import os
from apscheduler.schedulers.background import BackgroundScheduler
from .config import Settings
from .extensions import db
from .jobs.cleanup import run_cleanup_once
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration


def create_app():
    app = Flask(__name__)
    settings = Settings()
    app.config.from_mapping(
        SECRET_KEY=settings.secret_key,
        SQLALCHEMY_DATABASE_URI=settings.database_url,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        APP_SETTINGS=settings,
    )

    db.init_app(app)

    # Initialize Sentry if present
    sdsn = settings.__dict__.get('sentry_dsn') or None
    if sdsn or os.getenv('SENTRY_DSN'):
        sentry_sdk.init(dsn=os.getenv('SENTRY_DSN'), integrations=[FlaskIntegration()])

    # Configure rate limiter (Redis if provided, otherwise in-memory)
    from .extensions import limiter as extensions_limiter
    limiter_storage = settings.redis_url if getattr(settings, 'redis_url', None) else 'memory://'
    # Recreate limiter with proper storage URI
    try:
        extensions_limiter.storage_uri = limiter_storage
        extensions_limiter.init_app(app)
    except Exception:
        # fallback: init without explicit storage
        extensions_limiter.init_app(app)
    limiter = extensions_limiter
    app.limiter = limiter

    @app.after_request
    def add_cors_headers(response):
        # tighten CORS in production via env var
        allowed = os.getenv('ALLOWED_ORIGINS', '*')
        response.headers['Access-Control-Allow-Origin'] = allowed
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        # Add a conservative CSP - allow same-origin and inline styles for now
        response.headers['Content-Security-Policy'] = "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"
        return response

    with app.app_context():
        # Import and register blueprints
        from .api.health import bp as health_bp
        from .api.upload import bp as upload_bp
        from .api.file import bp as file_bp

        app.register_blueprint(health_bp)
        app.register_blueprint(upload_bp, url_prefix='/api')
        app.register_blueprint(file_bp, url_prefix='/api')

        # Create tables if missing (dev convenience)
        db.create_all()

    scheduler = BackgroundScheduler(timezone='UTC')
    # Run cleanup inside the Flask application context to avoid "working outside"
    def _cleanup_job():
        with app.app_context():
            run_cleanup_once()

    scheduler.add_job(_cleanup_job, 'interval', minutes=settings.cleanup_interval_minutes, id='local_cleanup')
    scheduler.start()

    return app
