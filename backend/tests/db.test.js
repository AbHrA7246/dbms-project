import test from 'node:test';
import assert from 'node:assert/strict';
import { testConnection, closePool } from '../src/config/db.js';

test('Database configuration safeguards', async (t) => {
  t.after(async () => {
    await closePool();
  });

  await t.test('testConnection handles connection attempt gracefully without crashing', async () => {
    const result = await testConnection();
    assert.ok(typeof result === 'object');
    assert.ok('connected' in result);
    // Either connected (boolean) or error code present
    if (!result.connected) {
      assert.ok(result.code);
      assert.ok(result.hint);
    }
  });
});
