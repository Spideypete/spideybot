'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function createSqliteSessionStore({ session, databasePath }) {
  if (!session || typeof session.Store !== 'function') {
    throw new TypeError('An express-session module is required');
  }
  if (!databasePath || typeof databasePath !== 'string') {
    throw new Error('SESSION_DB_PATH must point to a persistent session database file');
  }

  fs.mkdirSync(path.dirname(path.resolve(databasePath)), { recursive: true });
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      expires INTEGER NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires);
  `);

  const select = db.prepare('SELECT data, expires FROM sessions WHERE sid = ?');
  const upsert = db.prepare(`
    INSERT INTO sessions (sid, expires, data) VALUES (@sid, @expires, @data)
    ON CONFLICT(sid) DO UPDATE SET expires = excluded.expires, data = excluded.data
  `);
  const remove = db.prepare('DELETE FROM sessions WHERE sid = ?');
  const removeExpired = db.prepare('DELETE FROM sessions WHERE expires <= ?');
  const updateExpiry = db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?');

  class SqliteSessionStore extends session.Store {
    get(sid, callback) {
      try {
        const row = select.get(sid);
        if (!row) return callback(null, null);
        if (row.expires <= Date.now()) {
          remove.run(sid);
          return callback(null, null);
        }
        return callback(null, JSON.parse(row.data));
      } catch (error) {
        return callback(error);
      }
    }

    set(sid, sess, callback = () => {}) {
      try {
        const expires = sess.cookie?.expires
          ? new Date(sess.cookie.expires).getTime()
          : Date.now() + (Number(sess.cookie?.maxAge) || 24 * 60 * 60 * 1000);
        upsert.run({ sid, expires, data: JSON.stringify(sess) });
        removeExpired.run(Date.now());
        callback(null);
      } catch (error) {
        callback(error);
      }
    }

    touch(sid, sess, callback = () => {}) {
      try {
        const expires = sess.cookie?.expires
          ? new Date(sess.cookie.expires).getTime()
          : Date.now() + (Number(sess.cookie?.maxAge) || 24 * 60 * 60 * 1000);
        updateExpiry.run(expires, sid);
        callback(null);
      } catch (error) {
        callback(error);
      }
    }

    destroy(sid, callback = () => {}) {
      try {
        remove.run(sid);
        callback(null);
      } catch (error) {
        callback(error);
      }
    }

    clear(callback = () => {}) {
      try {
        db.exec('DELETE FROM sessions');
        callback(null);
      } catch (error) {
        callback(error);
      }
    }

    length(callback) {
      try {
        const row = db.prepare('SELECT COUNT(*) AS count FROM sessions WHERE expires > ?').get(Date.now());
        callback(null, row.count);
      } catch (error) {
        callback(error);
      }
    }

    close() {
      db.close();
    }
  }

  return new SqliteSessionStore();
}

module.exports = { createSqliteSessionStore };
