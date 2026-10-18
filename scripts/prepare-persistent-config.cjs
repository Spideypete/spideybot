// Prepares a durable config.json symlink when SPIDEYBOT_CONFIG_PATH points to a
// mounted persistent volume. With no variable set, local development is unchanged.
const fs = require('fs');
const path = require('path');

const configuredPath = process.env.SPIDEYBOT_CONFIG_PATH;
if (!configuredPath) {
  console.log('[PERSISTENCE] SPIDEYBOT_CONFIG_PATH is unset; using the local config.json.');
  process.exit(0);
}

const persistentPath = path.resolve(configuredPath);
const repoConfigPath = path.resolve(__dirname, '..', 'config.json');
if (persistentPath === repoConfigPath) {
  console.log('[PERSISTENCE] Config path already points to config.json; no symlink needed.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(persistentPath), { recursive: true });

// Seed the volume exactly once. Never overwrite an existing persistent config on
// deploy/restart, because it contains the server owners' saved settings and data.
if (!fs.existsSync(persistentPath)) {
  if (!fs.existsSync(repoConfigPath)) {
    throw new Error('[PERSISTENCE] Neither persistent config nor bundled config.json exists.');
  }
  const seed = fs.readFileSync(repoConfigPath, 'utf8');
  JSON.parse(seed); // Fail safely instead of seeding malformed JSON.
  const tempPath = persistentPath + '.seed-' + process.pid;
  fs.writeFileSync(tempPath, seed, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  try {
    fs.renameSync(tempPath, persistentPath);
  } catch (err) {
    try { fs.unlinkSync(tempPath); } catch (_) {}
    if (!fs.existsSync(persistentPath)) throw err;
  }
  console.log('[PERSISTENCE] Seeded persistent config from the bundled config.json.');
} else {
  // Refuse to continue with corrupt persisted data; do not silently replace it.
  JSON.parse(fs.readFileSync(persistentPath, 'utf8'));
  console.log('[PERSISTENCE] Existing persistent config found; keeping saved settings.');
}

try {
  const stat = fs.lstatSync(repoConfigPath);
  if (stat.isSymbolicLink()) {
    const target = path.resolve(path.dirname(repoConfigPath), fs.readlinkSync(repoConfigPath));
    if (target === persistentPath) process.exit(0);
  }
  fs.unlinkSync(repoConfigPath);
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

fs.symlinkSync(persistentPath, repoConfigPath, 'file');
console.log('[PERSISTENCE] config.json now points to the persistent config volume.');
