const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const session = require('express-session');
const { createSqliteSessionStore } = require('../services/sqlite-session-store.cjs');

test('SQLite session store persists sessions and supports touch and destroy', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spidey-session-store-'));
  const databasePath = path.join(tempDir, 'sessions.sqlite');
  const store = createSqliteSessionStore({ session, databasePath });
  const sessionData = {
    cookie: { maxAge: 60_000, httpOnly: true },
    authenticated: true,
    user: { id: 'test-user' }
  };

  const call = (method, ...args) => new Promise((resolve, reject) => {
    store[method](...args, (error, value) => error ? reject(error) : resolve(value));
  });

  try {
    await call('set', 'session-1', sessionData);
    const loaded = await call('get', 'session-1');
    assert.equal(loaded.authenticated, true);
    assert.equal(loaded.user.id, 'test-user');

    await call('touch', 'session-1', sessionData);
    assert.equal(await call('length'), 1);

    await call('destroy', 'session-1');
    assert.equal(await call('get', 'session-1'), null);
    assert.equal(await call('length'), 0);
  } finally {
    store.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
