import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import { closePool } from '../src/config/db.js';

test('App API endpoints', async (t) => {
  // Start server on an ephemeral port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(async () => {
    server.close();
    await closePool();
  });

  await t.test('GET /api returns service metadata', async () => {
    const res = await fetch(`${baseUrl}/api`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.service, 'EcoCycle Backend API');
    assert.equal(data.status, 'running');
  });

  await t.test('GET /api/health returns valid health JSON without leaking secrets', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.status === 'ok' || data.status === 'degraded');
    assert.equal(data.service, 'ecocycle-backend');
    assert.ok(data.database);
    assert.ok(typeof data.database.status === 'string');
    // Ensure no sensitive passwords or connection strings are present
    const serialized = JSON.stringify(data);
    assert.equal(serialized.includes('password'), false);
  });

  await t.test('GET /non-existent-route returns structured 404', async () => {
    const res = await fetch(`${baseUrl}/api/does-not-exist`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.error, 'Not Found');
  });
});
