import datetime
from flask import Blueprint, request, jsonify, current_app
from ..extensions import db, limiter
from ..models import File, UploadSession
from ..services.storage import get_blob_store
store = get_blob_store()
from ..utils import parse_ttl, issue_delete_token

bp = Blueprint('upload', __name__)


@bp.route('/upload/init', methods=['POST'])
@limiter.limit(lambda: current_app.config['APP_SETTINGS'].rate_upload_init)
def upload_init():
    payload = request.get_json(silent=True) or {}
    settings = current_app.config['APP_SETTINGS']

    total_size_bytes = int(payload.get('totalSizeBytes', 0))
    total_chunks = int(payload.get('totalChunks', 0))
    upload_settings = payload.get('settings', {}) or {}
    ttl = upload_settings.get('ttl', settings.default_ttl)

    if total_size_bytes <= 0 or total_chunks <= 0:
        return jsonify({'title': 'Invalid upload dimensions', 'status': 422}), 422
    if total_size_bytes > settings.max_upload_bytes:
        return jsonify({'title': 'Payload too large', 'status': 413}), 413
    if ttl not in settings.allowed_ttls:
        return jsonify({'title': 'Invalid TTL', 'status': 422}), 422

    expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=settings.upload_session_ttl_hours)
    session = UploadSession(
        total_size_bytes=total_size_bytes,
        total_chunks=total_chunks,
        chunk_size_bytes=settings.chunk_size_bytes,
        scratch_prefix=f'sessions/{datetime.datetime.utcnow().date().isoformat()}',
        expires_at=expires_at,
    )
    session.settings = {
        'ttl': ttl,
        'burnAfterRead': bool(upload_settings.get('burnAfterRead', False)),
        'hasAccessPassword': bool(upload_settings.get('hasAccessPassword', False)),
        'maxDownloads': upload_settings.get('maxDownloads'),
    }
    session.received_chunks = []
    db.session.add(session)
    db.session.commit()

    return jsonify({
        'sessionId': session.session_id,
        'chunkSizeBytes': session.chunk_size_bytes,
        'expiresAt': session.expires_at.isoformat() + 'Z',
    }), 201


@bp.route('/upload/chunk/<session_id>/<int:index>', methods=['PUT'])
@limiter.limit(lambda: current_app.config['APP_SETTINGS'].rate_upload_chunk)
def upload_chunk(session_id: str, index: int):
    session = UploadSession.query.get(session_id)
    if not session or session.completed_at is not None:
        return jsonify({'title': 'Upload session not found', 'status': 404}), 404
    if session.expires_at < datetime.datetime.utcnow():
        return jsonify({'title': 'Upload session expired', 'status': 404}), 404
    if index < 0 or index >= session.total_chunks:
        return jsonify({'title': 'Chunk index out of range', 'status': 416}), 416

    data = request.get_data(cache=False, as_text=False)
    if not data:
        return jsonify({'title': 'Chunk body is required', 'status': 422}), 422
    if len(data) > session.chunk_size_bytes:
        return jsonify({'title': 'Chunk too large', 'status': 413}), 413

    received = set(session.received_chunks)
    if index in received and store.chunk_exists(session_id, index):
        # Idempotent duplicate chunk upload.
        return ('', 204)

    store.put_chunk(session_id, index, data)
    received.add(index)
    session.received_chunks = list(received)
    db.session.commit()
    return ('', 204)


@bp.route('/upload/status/<session_id>', methods=['GET'])
def upload_status(session_id: str):
    session = UploadSession.query.get(session_id)
    if not session:
        return jsonify({'title': 'Upload session not found', 'status': 404}), 404

    received = sorted(session.received_chunks)
    next_index = 0
    for i in range(session.total_chunks):
        if i not in received:
            next_index = i
            break
        next_index = session.total_chunks

    return jsonify({
        'sessionId': session.session_id,
        'totalChunks': session.total_chunks,
        'receivedChunks': received,
        'nextChunkIndex': next_index,
        'expiresAt': session.expires_at.isoformat() + 'Z',
    })


@bp.route('/upload/complete/<session_id>', methods=['POST'])
@limiter.limit(lambda: current_app.config['APP_SETTINGS'].rate_upload_complete)
def upload_complete(session_id: str):
    session = UploadSession.query.get(session_id)
    if not session:
        return jsonify({'title': 'Upload session not found', 'status': 404}), 404
    if session.completed_at is not None:
        return jsonify({'title': 'Upload session already completed', 'status': 409}), 409

    expected = set(range(session.total_chunks))
    received = set(session.received_chunks)
    if expected != received:
        return jsonify({'title': 'Not all chunks uploaded', 'status': 409}), 409

    payload = request.get_json(silent=True) or {}
    encrypted_metadata = payload.get('encryptedMetadata', '')
    encryption_iv = payload.get('encryptionIv', '')
    access_verifier = payload.get('accessVerifier')

    delete_token, delete_hash = issue_delete_token()

    # Acquire an assembly lock if Redis is configured to avoid concurrent assembly races.
    settings = current_app.config['APP_SETTINGS']
    redis_url = getattr(settings, 'redis_url', None)
    lock = None
    redis_client = None
    if redis_url:
        try:
            import redis as _redis
            redis_client = _redis.from_url(redis_url)
            lock = redis_client.lock(f"assemble:{session_id}", timeout=120, blocking_timeout=10)
            got = lock.acquire(blocking=True)
            if not got:
                return jsonify({'title': 'Assembly locked', 'status': 423}), 423
        except Exception:
            lock = None

    file_row = File(
        blob_size_bytes=0,
        delete_token_hash=delete_hash,
        blob_path='',
        has_access_password=bool(session.settings.get('hasAccessPassword', False)),
        burn_after_read=bool(session.settings.get('burnAfterRead', False)),
        max_downloads=session.settings.get('maxDownloads'),
    )
    db.session.add(file_row)
    db.session.flush()

    blob_path, blob_size = store.assemble(session_id, session.total_chunks, file_row.file_id)
    ttl_delta = parse_ttl(session.settings.get('ttl'))
    file_row.blob_path = blob_path
    file_row.blob_size_bytes = blob_size
    file_row.expires_at = datetime.datetime.utcnow() + ttl_delta
    file_row.encrypted_metadata = encrypted_metadata.encode('utf-8') if encrypted_metadata else None
    file_row.encryption_iv = encryption_iv.encode('utf-8') if encryption_iv else None

    if access_verifier:
        file_row.access_verifier = (access_verifier.get('verifier') or '').encode('utf-8')
        file_row.access_verifier_salt = (access_verifier.get('salt') or '').encode('utf-8')
        file_row.access_verifier_iv = (access_verifier.get('iv') or '').encode('utf-8')

    session.completed_at = datetime.datetime.utcnow()
    db.session.commit()
    store.delete_session_scratch(session_id)

    # release lock if held
    try:
        if lock:
            lock.release()
    except Exception:
        pass

    return jsonify({
        'fileId': file_row.file_id,
        'deleteToken': delete_token,
        'expiresAt': file_row.expires_at.isoformat() + 'Z',
        'blobSizeBytes': file_row.blob_size_bytes,
    }), 201
