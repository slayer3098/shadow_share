import os
import tempfile
from pathlib import Path
from typing import Tuple, Iterator

try:
    import boto3
    from botocore.exceptions import BotoCoreError
except Exception:
    boto3 = None


class LocalBlobStore:
    def __init__(self, base_path: str | Path = None):
        self.base = Path(base_path or Path(__file__).parent.parent.parent / 'storage' / 'blobs')
        os.makedirs(self.base, exist_ok=True)

    def put_blob(self, file_id: str, data: bytes) -> str:
        path = self.base / f"{file_id}.bin"
        with open(path, 'wb') as f:
            f.write(data)
        return str(path)

    def put_chunk(self, session_id: str, index: int, data: bytes) -> str:
        chunk_dir = self.base / 'sessions' / session_id / 'chunks'
        chunk_dir.mkdir(parents=True, exist_ok=True)
        path = chunk_dir / f'{index}.part'
        with open(path, 'wb') as f:
            f.write(data)
        return str(path)

    def chunk_exists(self, session_id: str, index: int) -> bool:
        chunk_path = self.base / 'sessions' / session_id / 'chunks' / f'{index}.part'
        return chunk_path.exists()

    def assemble(self, session_id: str, total_chunks: int, file_id: str) -> Tuple[str, int]:
        final_path = self.base / f"{file_id}.bin"
        total_size = 0
        with open(final_path, 'wb') as target:
            for index in range(total_chunks):
                part_path = self.base / 'sessions' / session_id / 'chunks' / f'{index}.part'
                with open(part_path, 'rb') as src:
                    while True:
                        chunk = src.read(64 * 1024)
                        if not chunk:
                            break
                        total_size += len(chunk)
                        target.write(chunk)
        return str(final_path), total_size

    def stream_blob(self, blob_path: str) -> Iterator[bytes]:
        with open(blob_path, 'rb') as f:
            while True:
                chunk = f.read(64 * 1024)
                if not chunk:
                    break
                yield chunk

    def delete_blob(self, blob_path: str):
        try:
            os.remove(blob_path)
        except FileNotFoundError:
            pass

    def delete_session_scratch(self, session_id: str):
        session_dir = self.base / 'sessions' / session_id
        if not session_dir.exists():
            return
        for path in sorted(session_dir.rglob('*'), reverse=True):
            if path.is_file():
                path.unlink(missing_ok=True)
            elif path.is_dir():
                try:
                    path.rmdir()
                except OSError:
                    pass
        try:
            if session_dir.exists():
                session_dir.rmdir()
        except OSError:
            pass


class S3BlobStore:
    def __init__(self, bucket: str, prefix: str = '', endpoint_url: str | None = None):
        if boto3 is None:
            raise RuntimeError('boto3 is required for S3BlobStore')
        self.bucket = bucket
        self.prefix = prefix.rstrip('/')
        self.s3 = boto3.client('s3', endpoint_url=endpoint_url)

    def _key(self, name: str) -> str:
        return f"{self.prefix}/{name}" if self.prefix else name

    def put_blob(self, file_id: str, data: bytes) -> str:
        key = self._key(f"{file_id}.bin")
        try:
            self.s3.put_object(Bucket=self.bucket, Key=key, Body=data)
        except BotoCoreError as e:
            raise
        return f"s3://{self.bucket}/{key}"

    def put_chunk(self, session_id: str, index: int, data: bytes) -> str:
        # For resumable uploads we store session chunks locally (same as LocalBlobStore)
        base = Path(tempfile.gettempdir()) / 'shadowshare' / 'sessions'
        chunk_dir = base / session_id / 'chunks'
        chunk_dir.mkdir(parents=True, exist_ok=True)
        path = chunk_dir / f'{index}.part'
        with open(path, 'wb') as f:
            f.write(data)
        return str(path)

    def chunk_exists(self, session_id: str, index: int) -> bool:
        chunk_path = Path(tempfile.gettempdir()) / 'shadowshare' / 'sessions' / session_id / 'chunks' / f'{index}.part'
        return chunk_path.exists()

    def assemble(self, session_id: str, total_chunks: int, file_id: str) -> Tuple[str, int]:
        # Assemble into a tempfile then upload to S3
        tmp = Path(tempfile.gettempdir()) / f'shadowshare-{file_id}.bin'
        total_size = 0
        with open(tmp, 'wb') as target:
            for index in range(total_chunks):
                part_path = Path(tempfile.gettempdir()) / 'shadowshare' / 'sessions' / session_id / 'chunks' / f'{index}.part'
                with open(part_path, 'rb') as src:
                    while True:
                        chunk = src.read(64 * 1024)
                        if not chunk:
                            break
                        total_size += len(chunk)
                        target.write(chunk)
        # upload
        key = self._key(f"{file_id}.bin")
        self.s3.upload_file(str(tmp), self.bucket, key)
        try:
            tmp.unlink()
        except Exception:
            pass
        return f"s3://{self.bucket}/{key}", total_size

    def stream_blob(self, blob_path: str) -> Iterator[bytes]:
        # blob_path is s3://bucket/key
        _, _, rest = blob_path.partition('s3://')
        bucket, _, key = rest.partition('/')
        obj = self.s3.get_object(Bucket=bucket, Key=key)
        stream = obj['Body']
        for chunk in stream.iter_chunks(chunk_size=64 * 1024):
            yield chunk

    def delete_blob(self, blob_path: str):
        _, _, rest = blob_path.partition('s3://')
        bucket, _, key = rest.partition('/')
        try:
            self.s3.delete_object(Bucket=bucket, Key=key)
        except Exception:
            pass

    def delete_session_scratch(self, session_id: str):
        base = Path(tempfile.gettempdir()) / 'shadowshare' / 'sessions' / session_id
        if not base.exists():
            return
        for path in sorted(base.rglob('*'), reverse=True):
            if path.is_file():
                try:
                    path.unlink()
                except Exception:
                    pass
            elif path.is_dir():
                try:
                    path.rmdir()
                except Exception:
                    pass


def get_blob_store():
    # Prefer app config when available
    backend = os.getenv('STORAGE_BACKEND', None)
    bucket = None
    prefix = None
    endpoint = None
    try:
        from flask import current_app
        settings = current_app.config.get('APP_SETTINGS') if current_app else None
        if settings:
            backend = getattr(settings, 'storage_backend', backend) or 'local'
            bucket = getattr(settings, 's3_bucket', None)
            prefix = getattr(settings, 's3_prefix', '')
            endpoint = getattr(settings, 's3_endpoint', None)
    except RuntimeError:
        # no app context; fall back to env vars
        backend = backend or os.getenv('STORAGE_BACKEND', 'local')

    if backend == 's3':
        bucket = bucket or os.getenv('SPACES_BUCKET') or os.getenv('S3_BUCKET')
        prefix = prefix or os.getenv('SPACES_PREFIX', '')
        endpoint = endpoint or os.getenv('SPACES_ENDPOINT')
        return S3BlobStore(bucket=bucket, prefix=prefix, endpoint_url=endpoint)
    return LocalBlobStore()
