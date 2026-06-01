S3 / Postgres configuration

Environment variables used by the backend:

- `DATABASE_URL` - SQLAlchemy database url (e.g. `postgresql://user:pass@host:5432/dbname`). If not set, defaults to SQLite `sqlite:///shadowshare.db`.
- `STORAGE_BACKEND` - `local` (default) or `s3` to use S3-compatible storage.
- `SPACES_BUCKET` or `S3_BUCKET` - bucket name for S3/DO Spaces when `STORAGE_BACKEND=s3`.
- `SPACES_ENDPOINT` - optional custom S3 endpoint (e.g. `https://nyc3.digitaloceanspaces.com`).
- `SPACES_PREFIX` - optional prefix to store objects under.
- `REDIS_URL` - optional Redis URL for rate-limiting and distributed locks (e.g. `redis://localhost:6379/0`).

Running with Postgres and S3 locally (example using Docker)

1. Start Postgres:

```powershell
docker run --name shadowshare-postgres -e POSTGRES_PASSWORD=pass -e POSTGRES_USER=ss -e POSTGRES_DB=shadowshare -p 5432:5432 -d postgres:15
```

2. Start a local S3-compatible server (MinIO):

```powershell
docker run -p 9000:9000 --name minio -e MINIO_ROOT_USER=minio -e MINIO_ROOT_PASSWORD=minio123 -d quay.io/minio/minio server /data
```

3. Start Redis (for rate-limits and locks):

```powershell
docker run -p 6379:6379 --name shadowshare-redis -d redis:7
```

4. Set env vars and create DB tables:

```powershell
$env:DATABASE_URL='postgresql://ss:pass@127.0.0.1:5432/shadowshare'
$env:STORAGE_BACKEND='s3'
$env:S3_BUCKET='shadowshare-test'
$env:SPACES_ENDPOINT='http://127.0.0.1:9000'
$env:SPACES_PREFIX='test'
$env:REDIS_URL='redis://127.0.0.1:6379/0'
python manage.py createdb
```

5. Run the app:

```powershell
python manage.py run
```

Notes

- When `STORAGE_BACKEND=s3`, credentials are taken from standard AWS env vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) or from your environment as required by `boto3`.
- Alembic is scaffolded under `shadowshare-api/alembic/` and is configured to use the application's SQLAlchemy metadata for auto-generation. Use `alembic revision --autogenerate -m "msg"` then `alembic upgrade head` from the `shadowshare-api` folder.
