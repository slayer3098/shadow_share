import datetime
from flask import Blueprint, Response, jsonify, request

from ..extensions import db, limiter
from ..models import File
from ..services.storage import get_blob_store
from ..utils import verify_delete_token
from flask import current_app

bp = Blueprint('file', __name__)
store = get_blob_store()


def _is_gone(file_row: File) -> bool:
    if file_row.burned:
        return True
    if file_row.expires_at and file_row.expires_at < datetime.datetime.utcnow():
        return True
    if file_row.max_downloads is not None and file_row.download_count >= file_row.max_downloads:
        return True
    return False


def _delete_file(file_row: File):
    store.delete_blob(file_row.blob_path)
    db.session.delete(file_row)
    db.session.commit()


@bp.route('/file/<file_id>', methods=['GET'])
@bp.route('/file/<file_id>', methods=['GET'])
@limiter.limit(lambda: current_app.config['APP_SETTINGS'].rate_download)
def get_file(file_id: str):
    app = current_app._get_current_object()
    file_row = File.query.get(file_id)
    if not file_row:
        return jsonify({'title': 'File no longer exists', 'status': 404}), 404
    if _is_gone(file_row):
        return jsonify({'title': 'File no longer exists', 'status': 410}), 410
    def stream():
        for chunk in store.stream_blob(file_row.blob_path):
            yield chunk

    response = Response(stream(), mimetype='application/octet-stream')
    response.headers['Content-Length'] = str(file_row.blob_size_bytes)
    response.headers['X-Blob-Size'] = str(file_row.blob_size_bytes)
    response.headers['Cache-Control'] = 'no-store'
    # Finalize download after response is closed to avoid committing inside the generator
    def _finalize():
        try:
            with app.app_context():
                fr = File.query.get(file_id)
                if not fr:
                    return
                fr.download_count = (fr.download_count or 0) + 1
                if fr.first_accessed_at is None:
                    fr.first_accessed_at = datetime.datetime.utcnow()
                should_burn = bool(fr.burn_after_read)
                if should_burn:
                    fr.burned = True
                db.session.commit()
                if should_burn:
                    _delete_file(fr)
        except Exception:
            pass

    response.call_on_close(_finalize)
    return response


@bp.route('/file/<file_id>/meta', methods=['GET'])
@bp.route('/file/<file_id>/meta', methods=['GET'])
@limiter.limit(lambda: current_app.config['APP_SETTINGS'].rate_status)
def get_file_meta(file_id: str):
    file_row = File.query.get(file_id)
    if not file_row:
        return jsonify({'title': 'File no longer exists', 'status': 404}), 404
    if _is_gone(file_row):
        return jsonify({'title': 'File no longer exists', 'status': 410}), 410

    return jsonify({
        'fileId': file_row.file_id,
        'blobSizeBytes': file_row.blob_size_bytes,
        'expiresAt': file_row.expires_at.isoformat() + 'Z' if file_row.expires_at else None,
        'burnAfterRead': file_row.burn_after_read,
        'hasAccessPassword': file_row.has_access_password,
        'encryptedMetadata': file_row.encrypted_metadata.decode('utf-8') if file_row.encrypted_metadata else None,
        'encryptionIv': file_row.encryption_iv.decode('utf-8') if file_row.encryption_iv else None,
        'accessVerifier': {
            'verifier': file_row.access_verifier.decode('utf-8') if file_row.access_verifier else None,
            'salt': file_row.access_verifier_salt.decode('utf-8') if file_row.access_verifier_salt else None,
            'iv': file_row.access_verifier_iv.decode('utf-8') if file_row.access_verifier_iv else None,
        } if file_row.has_access_password else None,
    })


@bp.route('/file/<file_id>', methods=['DELETE'])
def delete_file(file_id: str):
    token = request.args.get('token', '')
    file_row = File.query.get(file_id)
    if not file_row:
        return jsonify({'title': 'File no longer exists', 'status': 404}), 404
    if _is_gone(file_row):
        return jsonify({'title': 'File no longer exists', 'status': 410}), 410

    if not verify_delete_token(token, file_row.delete_token_hash):
        return jsonify({'title': 'Invalid delete token', 'status': 403}), 403

    _delete_file(file_row)
    return ('', 204)


@bp.route('/status/<file_id>', methods=['GET'])
def sender_status(file_id: str):
    token = request.args.get('token', '')
    file_row = File.query.get(file_id)
    if not file_row:
        return jsonify({'title': 'File no longer exists', 'status': 404}), 404

    if not verify_delete_token(token, file_row.delete_token_hash):
        return jsonify({'title': 'Invalid token', 'status': 403}), 403

    status = 'active'
    if _is_gone(file_row):
        status = 'expired' if file_row.expires_at and file_row.expires_at < datetime.datetime.utcnow() else 'deleted'

    return jsonify({
        'fileId': file_row.file_id,
        'status': status,
        'createdAt': file_row.created_at.isoformat() + 'Z' if file_row.created_at else None,
        'expiresAt': file_row.expires_at.isoformat() + 'Z' if file_row.expires_at else None,
        'downloadCount': file_row.download_count,
        'firstAccessedAt': file_row.first_accessed_at.isoformat() + 'Z' if file_row.first_accessed_at else None,
        'burnAfterRead': file_row.burn_after_read,
        'hasAccessPassword': file_row.has_access_password,
    })
