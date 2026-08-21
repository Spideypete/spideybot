const express = require('express');
const { LoggingService } = require('./logging.service.cjs');

const service = new LoggingService();

function createLoggingRouter(client) {
  const router = express.Router();

  router.get('/:guildId', (req, res) => {
    if (!req.session.authenticated) return res.status(401).json({ error: 'Not authenticated' });
    const guildId = req.params.guildId;
    const hasAccess = req.session.guilds?.some(g => g.id === guildId);
    if (!hasAccess) return res.status(403).json({ error: 'No admin permissions' });

    try {
      const config = service.getConfig(guildId);
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/:guildId', express.json(), (req, res) => {
    if (!req.session.authenticated) return res.status(401).json({ error: 'Not authenticated' });
    const guildId = req.params.guildId;
    const hasAccess = req.session.guilds?.some(g => g.id === guildId);
    if (!hasAccess) return res.status(403).json({ error: 'No admin permissions' });

    try {
      const config = service.setConfig(guildId, req.body);
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createLoggingRouter };
