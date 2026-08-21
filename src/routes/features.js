const express = require('express');

// Feature routers - all paths relative to src/routes/features.js
const { createLoggingRouter } = require('../features/logging/logging.routes.cjs');
const serverGuardRoutes = require('../features/server-guard/server-guard.routes.cjs');
const { createReactionRolesRouter } = require('../features/reaction-roles/reaction-roles.routes.cjs');
const { createRoleCategoriesRouter } = require('../features/role-categories/role-categories.routes.cjs');
const { createServerMessagesRoutes } = require('../features/server-messages/server-messages.routes.cjs');
const { createCustomCommandsRoutes } = require('../features/custom-commands/custom-commands.routes.cjs');
const levelsRoutes = require('../features/levels/levels.routes.cjs');
const giveawaysRoutes = require('../features/giveaways/giveaways.routes.cjs');
const ticketsRoutes = require('../features/tickets/tickets.routes.cjs');
const socialNotificationsRoutes = require('../features/social-notifications/social-notifications.routes.cjs');
const invitesRoutes = require('../features/invites/invites.routes.cjs');

function createFeaturesRouter(client, configManager) {
  const router = express.Router();

  router.use('/logging', createLoggingRouter(client));
  router.use('/server-guard', serverGuardRoutes);
  router.use('/reaction-roles', createReactionRolesRouter(client));
  router.use('/role-categories', createRoleCategoriesRouter(client));
  router.use('/server-messages', createServerMessagesRoutes(configManager?.configPath));
  router.use('/custom-commands', createCustomCommandsRoutes(configManager?.configPath));
  router.use('/levels', levelsRoutes);
  router.use('/giveaways', giveawaysRoutes);
  router.use('/tickets', ticketsRoutes);
  router.use('/social-notifications', socialNotificationsRoutes);
  router.use('/invites', invitesRoutes);

  return router;
}

module.exports = { createFeaturesRouter };
