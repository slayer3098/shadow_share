from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
# Limiter instance will be initialized with the Flask app in create_app
limiter = Limiter(key_func=get_remote_address)
