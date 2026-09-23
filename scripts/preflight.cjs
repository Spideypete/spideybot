// Lightweight startup dependency preflight.
// This intentionally does not require index.cjs because that starts the web server
// and Discord gateway. It validates the modular dependency graph used by startup.

const modules = [
  '../src/config/config-manager.cjs',
  '../src/utils/storage.cjs',
  '../src/routes/features.js',
  '../src/features/logging/logging.service.cjs',
  '../src/features/logging/logging.handler.cjs',
  '../src/features/logging/logging.routes.cjs',
  '../src/features/server-guard/server-guard.service.cjs',
  '../src/features/server-guard/server-guard.handler.cjs',
  '../src/features/server-guard/server-guard.routes.cjs',
  '../src/features/reaction-roles/reaction-roles.handler.cjs',
  '../src/features/reaction-roles/reaction-roles.routes.cjs',
  '../src/features/role-categories/role-categories.routes.cjs',
  '../src/features/server-messages/server-messages.service.cjs',
  '../src/features/server-messages/server-messages.handler.cjs',
  '../src/features/server-messages/server-messages.routes.cjs',
  '../src/features/custom-commands/custom-commands.service.cjs',
  '../src/features/custom-commands/custom-commands.handler.cjs',
  '../src/features/custom-commands/custom-commands.routes.cjs',
  '../src/features/levels/levels.handler.cjs',
  '../src/features/levels/levels.routes.cjs',
  '../src/features/giveaways/giveaways.handler.cjs',
  '../src/features/giveaways/giveaways.routes.cjs',
  '../src/features/tickets/tickets.handler.cjs',
  '../src/features/tickets/tickets.routes.cjs',
  '../src/features/social-notifications/social-notifications.handler.cjs',
  '../src/features/social-notifications/social-notifications.routes.cjs',
  '../src/features/invites/invites.handler.cjs',
  '../src/features/invites/invites.routes.cjs'
];

const failures = [];

for (const modulePath of modules) {
  try {
    require(modulePath);
    console.log('OK', modulePath);
  } catch (error) {
    failures.push({ modulePath, error: error.message });
    console.error('FAIL', modulePath, '-', error.message);
  }
}

if (failures.length) {
  console.error(`\nPreflight failed: ${failures.length} module(s) could not load.`);
  process.exit(1);
}

console.log(`\nPreflight passed: ${modules.length} modular dependencies loaded.`);
