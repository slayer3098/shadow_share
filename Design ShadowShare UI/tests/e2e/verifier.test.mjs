import { test, expect } from 'vitest';
import { Buffer } from 'buffer';
import { webcrypto as crypto } from 'crypto';

const apiBase = process.env.API_BASE || 'http://127.0.0.1:5000/api';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toBase64(bytes) { return Buffer.from(bytes).toString('base64'); }
function fromBase64(str) { return new Uint8Array(Buffer.from(str, 'base64')); }
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

async function encryptBytes(plain, key) {
  const iv = randomBytes(12);
  const out = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  return { iv, cipher: new Uint8Array(out) };
}

async function decryptBytes(cipher, iv, key) {
  const out = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new Uint8Array(out);
}

test('password protected upload -> verify -> download', async () => {
  const payloadText = 'e2e-test-payload-' + Date.now();
  const payload = utf8(payloadText);
  const password = 'correct-horse-battery-staple';

  const salt = randomBytes(16);
  const key = await deriveAesKeyFromPassword(password, salt);

  const verifierPlain = utf8('ShadowShare Access Verifier v1');
  const verifierEnc = await encryptBytes(verifierPlain, key);

  const fileEnc = await encryptBytes(payload, key);
  const encryptedPayload = new Uint8Array(fileEnc.iv.length + fileEnc.cipher.length);
  encryptedPayload.set(fileEnc.iv, 0);
  encryptedPayload.set(fileEnc.cipher, fileEnc.iv.length);

  const metadata = { filename: 'e2e.txt', size: payload.length, mimeType: 'text/plain', mode: 'link-password' };
  const metaEnc = await encryptBytes(utf8(JSON.stringify(metadata)), key);

  // init
  const initRes = await fetch(`${apiBase}/upload/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totalSizeBytes: encryptedPayload.length, totalChunks: 1, settings: { ttl: '1h', burnAfterRead: false, hasAccessPassword: true, maxDownloads: null } }),
  });
  expect(initRes.ok).toBe(true);
  const init = await initRes.json();

  const putRes = await fetch(`${apiBase}/upload/chunk/${init.sessionId}/0`, { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: encryptedPayload });
  expect(putRes.ok).toBe(true);

  const completeRes = await fetch(`${apiBase}/upload/complete/${init.sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedMetadata: toBase64(metaEnc.cipher), encryptionIv: toBase64(metaEnc.iv), accessVerifier: { verifier: toBase64(verifierEnc.cipher), salt: toBase64(salt), iv: toBase64(verifierEnc.iv) } }),
  });
  expect(completeRes.ok).toBe(true);
  const done = await completeRes.json();

  const metaRes = await fetch(`${apiBase}/file/${done.fileId}/meta`);
  expect(metaRes.ok).toBe(true);
  const meta = await metaRes.json();
  expect(meta.accessVerifier).toBeTruthy();

  const saltFromMeta = fromBase64(meta.accessVerifier.salt);
  const derived = await deriveAesKeyFromPassword(password, saltFromMeta);
  const verifierCipher = fromBase64(meta.accessVerifier.verifier);
  const verifierIv = fromBase64(meta.accessVerifier.iv);
  const plainVerifier = await decryptBytes(verifierCipher, verifierIv, derived);
  const txt = parseUtf8(plainVerifier);
  expect(txt).toBe('ShadowShare Access Verifier v1');

  const fileRes = await fetch(`${apiBase}/file/${done.fileId}`);
  expect(fileRes.ok).toBe(true);
  const blob = await fileRes.arrayBuffer();
  const enc = new Uint8Array(blob);
  const iv = enc.slice(0, 12);
  const cipher = enc.slice(12);
  const plain = await decryptBytes(cipher, iv, derived);
  const plainTxt = parseUtf8(plain);
  expect(plainTxt).toBe(payloadText);
});
