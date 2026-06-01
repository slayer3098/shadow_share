import base64
import datetime
import hashlib
import hmac
import secrets


def parse_ttl(ttl: str) -> datetime.timedelta:
    if ttl == '1h':
        return datetime.timedelta(hours=1)
    if ttl == '24h':
        return datetime.timedelta(hours=24)
    if ttl == '7d':
        return datetime.timedelta(days=7)
    if ttl == '30d':
        return datetime.timedelta(days=30)
    raise ValueError('Unsupported TTL')


def issue_delete_token() -> tuple[str, bytes]:
    raw = secrets.token_bytes(32)
    encoded = base64.urlsafe_b64encode(raw).rstrip(b'=').decode('ascii')
    return encoded, hashlib.sha256(raw).digest()


def verify_delete_token(encoded: str, stored_hash: bytes) -> bool:
    try:
        raw = base64.urlsafe_b64decode(encoded + '==')
    except Exception:
        return False
    computed = hashlib.sha256(raw).digest()
    return hmac.compare_digest(computed, stored_hash)


def problem_detail(title: str, status: int, detail: str | None = None):
    payload = {
        'type': 'about:blank',
        'title': title,
        'status': status,
    }
    if detail:
        payload['detail'] = detail
    return payload, status
