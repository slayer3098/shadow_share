import datetime
import json
import uuid
from .extensions import db


class File(db.Model):
    __tablename__ = 'files'
    file_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    blob_path = db.Column(db.String(500), nullable=False, unique=True)
    blob_size_bytes = db.Column(db.BigInteger, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)
    download_count = db.Column(db.Integer, default=0)
    first_accessed_at = db.Column(db.DateTime, nullable=True)
    burn_after_read = db.Column(db.Boolean, default=False)
    burned = db.Column(db.Boolean, default=False)
    has_access_password = db.Column(db.Boolean, default=False)
    access_verifier = db.Column(db.LargeBinary, nullable=True)
    access_verifier_salt = db.Column(db.LargeBinary, nullable=True)
    access_verifier_iv = db.Column(db.LargeBinary, nullable=True)
    encrypted_metadata = db.Column(db.LargeBinary, nullable=True)
    encryption_iv = db.Column(db.LargeBinary, nullable=True)
    delete_token_hash = db.Column(db.LargeBinary, nullable=False)
    max_downloads = db.Column(db.Integer, nullable=True)


class UploadSession(db.Model):
    __tablename__ = 'upload_sessions'
    session_id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    total_size_bytes = db.Column(db.BigInteger, nullable=False)
    total_chunks = db.Column(db.Integer, nullable=False)
    chunk_size_bytes = db.Column(db.Integer, nullable=False)
    received_chunks_json = db.Column(db.Text, nullable=False, default='[]')
    scratch_prefix = db.Column(db.String(500), nullable=False)
    settings_json = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)

    @property
    def received_chunks(self):
        return json.loads(self.received_chunks_json)

    @received_chunks.setter
    def received_chunks(self, values):
        self.received_chunks_json = json.dumps(sorted(set(values)))

    @property
    def settings(self):
        return json.loads(self.settings_json)

    @settings.setter
    def settings(self, value):
        self.settings_json = json.dumps(value)
