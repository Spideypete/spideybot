const express = require('express');
const { requireFeatureAuth } = require('./feature-auth.cjs');
const { createLoggingRouter } = require('../features/logging/logging.routes.cjs');
const serverGuardRoutes = require('../features/server-guard/server-guard.routes.cjs');
const { createReactionRolesRouter } = require('../features/reaction-roles/reaction-roles.routes.cjs');
const { createRoleCategoriesRouter } = require('../features/role-categories/role-categories.routes.cjs');
const { createServerMessagesRoutes } = require('../features/server-messages/server-messages.routes.cjs');
const { createCustomCommandsRoutes } = require('../features/custom-commands/custom-commands.routes.cjs');
const levelsRoutes = require('../features/levels/levels.routes.cjs');
const { createGiveawaysRouter } = require('../features/giveaways/giveaways.routes.cjs');
const ticketsRoutes = require('../features/tickets/tickets.routes.cjs');
const socialNotificationsRoutes = require('../features/social-notifications/social-notifications.routes.cjs');
const invitesRoutes = require('../features/invites/invites.routes.cjs');
const testifySuiteRoutes = require('../features/testify-suite/testify-suite.routes.cjs');

function createFeaturesRouter(client, configManager) {
  const router = express.Router();
  router.use(requireFeatureAuth);
  router.use('/logging', createLoggingRouter(client));
  router.use('/server-guard', serverGuardRoutes);
  router.use('/reaction-roles', createReactionRolesRouter(client));
  router.use('/role-categories', createRoleCategoriesRouter(client));
  router.use('/server-messages', createServerMessagesRoutes(configManager?.configPath));
  router.use('/custom-commands', createCustomCommandsRoutes(configManager?.configPath));
  router.use('/levels', levelsRoutes);
  router.use('/giveaways', createGiveawaysRouter(client));
  router.use('/tickets', ticketsRoutes);
  router.use('/social-notifications', socialNotificationsRoutes);
  router.use('/invites', invitesRoutes);
  router.use('/testify-suite', testifySuiteRoutes);
  return router;
}
module.exports = { createFeaturesRouter };
