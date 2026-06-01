E2E Verifier Test

This project contains a small end-to-end verifier test that exercises the password-protected upload flow (client-side PBKDF2 → AES‑GCM), uploads an encrypted access verifier, then fetches meta and the file and verifies decryption.

Run locally

1. Start the backend (from repo root):

```powershell
Set-Location "e:\Projects\ShadowShare\shadowshare-api"
python run.py
```

2. Run the verifier test (from the UI folder). If your backend runs on port 8000:

```powershell
Set-Location "e:\Projects\ShadowShare\Design ShadowShare UI"
$env:API_BASE='http://127.0.0.1:8000/api'
node scripts/e2e_verifier_test.mjs
```

Or using npm script (override `API_BASE` if needed):

```powershell
$env:API_BASE='http://127.0.0.1:8000/api'
npm run e2e:test
```

CI

A GitHub Actions workflow is included at `.github/workflows/e2e-verifier.yml`. It will:
- install backend and frontend dependencies
- start the backend
- run the E2E verifier test

Notes

- The test uses Node's Web Crypto APIs and requires Node 18+.
- The workflow assumes the backend can be started with `python run.py` and listens on port 8000.
