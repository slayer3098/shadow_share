import { Buffer } from 'buffer';

const apiBase = process.env.API_BASE || 'http://127.0.0.1:5000/api';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}
function fromBase64(str) {
  return new Uint8Array(Buffer.from(str, 'base64'));
}
function toBase64Url(bytes) {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(s) {
  const normalized = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (normalized.length % 4)) % 4;
  return fromBase64(normalized + '='.repeat(pad));
}
function utf8(str) { return textEncoder.encode(str); }
function parseUtf8(bytes) { return textDecoder.decode(bytes); }
function randomBytes(len) { const b = new Uint8Array(len); crypto.getRandomValues(b); return b; }

async function deriveAesKeyFromPassword(password, salt) {
  const baseKey = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', iterations: 100000, salt },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function exportRawKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

async function encryptBytes(plain, key) {
  const iv = randomBytes(12);
  const out = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return { iv, cipher: new Uint8Array(out) };
}

async function decryptBytes(cipher, iv, key) {
  const out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new Uint8Array(out);
}

async function run() {
  console.log('Starting E2E verifier test against', apiBase);

  // prepare plaintext
  const payloadText = 'e2e-test-payload-' + Date.now();
  const payload = utf8(payloadText);

  const password = 'correct-horse-battery-staple';
  const salt = randomBytes(16);
  const key = await deriveAesKeyFromPassword(password, salt);

  // verifier
  const verifierPlain = utf8('ShadowShare Access Verifier v1');
  const verifierEnc = await encryptBytes(verifierPlain, key);

  // encrypt file
  const fileEnc = await encryptBytes(payload, key);
  const encryptedPayload = new Uint8Array(fileEnc.iv.length + fileEnc.cipher.length);
  encryptedPayload.set(fileEnc.iv, 0);
  encryptedPayload.set(fileEnc.cipher, fileEnc.iv.length);

  // encrypt metadata
  const metadata = { filename: 'e2e.txt', size: payload.length, mimeType: 'text/plain', mode: 'link-password' };
  const metaEnc = await encryptBytes(utf8(JSON.stringify(metadata)), key);

  // upload init
  const totalSize = encryptedPayload.length;
  const totalChunks = 1;

  console.log('Initializing upload...');
  const initRes = await fetch(`${apiBase}/upload/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totalSizeBytes: totalSize, totalChunks, settings: { ttl: '1h', burnAfterRead: false, hasAccessPassword: true, maxDownloads: null } }),
  });
  if (!initRes.ok) throw new Error('upload/init failed ' + initRes.status);
  const init = await initRes.json();

  console.log('Uploading chunk...');
  const putRes = await fetch(`${apiBase}/upload/chunk/${init.sessionId}/0`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: encryptedPayload });
  if (!putRes.ok) throw new Error('upload/chunk failed ' + putRes.status);

  console.log('Completing upload...');
  const completeRes = await fetch(`${apiBase}/upload/complete/${init.sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedMetadata: toBase64(metaEnc.cipher), encryptionIv: toBase64(metaEnc.iv), accessVerifier: { verifier: toBase64(verifierEnc.cipher), salt: toBase64(salt), iv: toBase64(verifierEnc.iv) } }),
  });
  if (!completeRes.ok) {
    const txt = await completeRes.text();
    throw new Error('upload/complete failed ' + completeRes.status + ' ' + txt);
  }
  const done = await completeRes.json();
  console.log('Upload done, fileId=', done.fileId);

  // viewer: fetch meta, derive key, verify verifier
  console.log('Fetching meta...');
  const metaRes = await fetch(`${apiBase}/file/${done.fileId}/meta`);
  if (!metaRes.ok) throw new Error('meta fetch failed ' + metaRes.status);
  const meta = await metaRes.json();
  if (!meta.accessVerifier) throw new Error('meta missing accessVerifier');

  const saltFromMeta = fromBase64(meta.accessVerifier.salt);
  const derived = await deriveAesKeyFromPassword(password, saltFromMeta);
  const verifierCipher = fromBase64(meta.accessVerifier.verifier);
  const verifierIv = fromBase64(meta.accessVerifier.iv);
  const plainVerifier = await decryptBytes(verifierCipher, verifierIv, derived);
  const txt = parseUtf8(plainVerifier);
  if (txt !== 'ShadowShare Access Verifier v1') throw new Error('verifier mismatch');
  console.log('Verifier OK');

  // download file
  console.log('Downloading file...');
  const fileRes = await fetch(`${apiBase}/file/${done.fileId}`);
  if (!fileRes.ok) throw new Error('download failed ' + fileRes.status);
  const blob = await fileRes.arrayBuffer();
  const enc = new Uint8Array(blob);
  const iv = enc.slice(0, 12);
  const cipher = enc.slice(12);
  const plain = await decryptBytes(cipher, iv, derived);
  const plainTxt = parseUtf8(plain);
  if (plainTxt !== payloadText) throw new Error('downloaded payload mismatch');

  console.log('E2E verifier test passed');
}

run().catch((err) => { console.error('E2E test failed:', err); process.exit(1); });
