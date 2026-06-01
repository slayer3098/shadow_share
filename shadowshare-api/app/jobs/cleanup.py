import datetime

from ..extensions import db
from ..models import File, UploadSession
from ..services.storage import LocalBlobStore

store = LocalBlobStore()


def run_cleanup_once() -> dict:
    now = datetime.datetime.utcnow()

    expired_files = File.query.filter(File.expires_at.isnot(None), File.expires_at < now).all()
    files_deleted = 0
    for row in expired_files:
        store.delete_blob(row.blob_path)
        db.session.delete(row)
        files_deleted += 1

    expired_sessions = UploadSession.query.filter(UploadSession.expires_at < now).all()
    sessions_deleted = 0
    for session in expired_sessions:
        store.delete_session_scratch(session.session_id)
        db.session.delete(session)
        sessions_deleted += 1

    db.session.commit()
    return {
        'filesDeleted': files_deleted,
        'sessionsDeleted': sessions_deleted,
        'timestamp': now.isoformat() + 'Z',
    }
