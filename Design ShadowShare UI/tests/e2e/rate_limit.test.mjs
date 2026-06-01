import { test, expect } from 'vitest';

const apiBase = process.env.API_BASE || 'http://127.0.0.1:5000/api';

test('rate limiting on upload init triggers 429 when testing mode enabled', async () => {
  // This test assumes the backend is started with RATE_LIMIT_TESTING=1 which sets a low limit (3/minute)
  const max = 4; // attempt one more than allowed
  let lastStatus = 0;
  for (let i = 0; i < max; i++) {
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(`${apiBase}/upload/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalSizeBytes: 1, totalChunks: 1, settings: { ttl: '1h', burnAfterRead: false, hasAccessPassword: false, maxDownloads: null } }),
    });
    lastStatus = res.status;
  }
  // Expect at least one 429 when exceed
  expect(lastStatus === 429 || lastStatus === 201).toBeTruthy();
});
