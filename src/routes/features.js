const express = require('express');

// Feature routers
const loggingRoutes = require('./logging/logging.routes.cjs');
const serverGuardRoutes = require('./server-guard/server-guard.routes.cjs');
const reactionRolesRoutes = require('./reaction-roles/reaction-roles.routes.cjs');
const roleCategoriesRoutes = require('./role-categories/role-categories.routes.cjs');
const serverMessagesRoutes = require('./server-messages/server-messages.routes.cjs');
const customCommandsRoutes = require('./custom-commands/custom-commands.routes.cjs');
const levelsRoutes = require('./levels/levels.routes.cjs');
const giveawaysRoutes = require('./giveaways/giveaways.routes.cjs');
const ticketsRoutes = require('./tickets/tickets.routes.cjs');
const socialNotificationsRoutes = require('./social-notifications/social-notifications.routes.cjs');
const invitesRoutes = require('./invites/invites.routes.cjs');

function createFeaturesRouter(client, configManager) {
  const router = express.Router();

  // Mount all feature routes
  router.use('/logging', createLoggingRouter(client));
  router.use('/server-guard', serverGuardRoutes(client, configManager));
  router.use('/reaction-roles', reactionRolesRoutes(client, configManager));
  router.use('/role-categories', roleCategoriesRoutes(client, configManager));
  router.use('/server-messages', serverMessagesRoutes(client, configManager));
  router.use('/custom-commands', customCommandsRoutes(client, configManager));
  router.use('/levels', levelsRoutes(client, configManager));
  router.use('/giveaways', giveawaysRoutes(client, configManager));
  router.use('/tickets', ticketsRoutes(client, configManager));
  router.use('/social-notifications', socialNotificationsRoutes(client, configManager));
  router.use('/invites', invitesRoutes(client, configManager));

  return router;
}

module.exports = { createFeaturesRouter };
