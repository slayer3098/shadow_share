import os


class Settings:
    def __init__(self):
        self.secret_key = os.getenv('SECRET_KEY', 'dev-secret')
        self.database_url = os.getenv('DATABASE_URL', 'sqlite:///shadowshare.db')
        self.max_upload_bytes = int(os.getenv('MAX_UPLOAD_BYTES', '104857600'))
        self.chunk_size_bytes = int(os.getenv('CHUNK_SIZE_BYTES', '5242880'))
        self.default_ttl = os.getenv('DEFAULT_TTL', '7d')
        self.allowed_ttls = {
            item.strip() for item in os.getenv('ALLOWED_TTLS', '1h,24h,7d,30d').split(',') if item.strip()
        }
        self.upload_session_ttl_hours = int(os.getenv('UPLOAD_SESSION_TTL_HOURS', '24'))
        self.cleanup_interval_minutes = int(os.getenv('CLEANUP_INTERVAL_MINUTES', '15'))
        # Optional production adapters
        self.storage_backend = os.getenv('STORAGE_BACKEND', 'local')
        self.s3_bucket = os.getenv('SPACES_BUCKET') or os.getenv('S3_BUCKET')
        self.s3_prefix = os.getenv('SPACES_PREFIX', '')
        self.s3_endpoint = os.getenv('SPACES_ENDPOINT')
        self.redis_url = os.getenv('REDIS_URL')
        # Rate limits (strings accepted by Flask-Limiter)
        testing = os.getenv('RATE_LIMIT_TESTING', '') != ''
        # Short limits in testing for fast CI runs
        self.rate_upload_init = os.getenv('RATE_UPLOAD_INIT', '20/hour' if not testing else '3/minute')
        self.rate_upload_chunk = os.getenv('RATE_UPLOAD_CHUNK', '1000/hour' if not testing else '3/minute')
        self.rate_upload_complete = os.getenv('RATE_UPLOAD_COMPLETE', '20/hour' if not testing else '3/minute')
        self.rate_download = os.getenv('RATE_DOWNLOAD', '200/hour' if not testing else '3/minute')
        self.rate_status = os.getenv('RATE_STATUS', '100/hour' if not testing else '10/minute')
