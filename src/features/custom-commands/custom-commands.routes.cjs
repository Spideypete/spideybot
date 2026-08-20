const express = require('express');
const { CustomCommandsService } = require('./custom-commands.service.cjs');

function createCustomCommandsRoutes(configPath) {
  const router = express.Router();
  const service = new CustomCommandsService();

  function requireAuth(req, res, next) {
    if (!req.session?.authenticated) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
  }

  function requireGuildAccess(req, res, next) {
    const guildId = req.params.guildId;
    const hasAccess = req.session?.guilds?.some((g) => g.id === guildId);
    if (!hasAccess) {
      return res.status(403).json({ error: "You don't have admin permissions in this server" });
    }
    next();
  }

  router.get('/:guildId/categories', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const categories = await service.getCategories(req.params.guildId);
      res.json(categories);
    } catch (err) {
      console.error('[CustomCommands] GET categories error:', err);
      res.status(500).json({ error: 'Failed to load categories' });
    }
  });

  router.get('/:guildId', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const commands = await service.getAll(req.params.guildId);
      res.json(commands);
    } catch (err) {
      console.error('[CustomCommands] GET error:', err);
      res.status(500).json({ error: 'Failed to load custom commands' });
    }
  });

  router.get('/:guildId/:name', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const command = await service.get(req.params.guildId, req.params.name);
      if (!command) {
        return res.status(404).json({ error: 'Custom command not found' });
      }
      res.json(command);
    } catch (err) {
      console.error('[CustomCommands] GET by name error:', err);
      res.status(500).json({ error: 'Failed to load custom command' });
    }
  });

  router.post('/:guildId', requireAuth, requireGuildAccess, express.json(), async (req, res) => {
    try {
      const { name, response, enabled, allowedRoles, cooldown, aliases, description, category } = req.body;
      if (!name || response === undefined) {
        return res.status(400).json({ error: 'Name and response are required' });
      }
      const command = await service.create(req.params.guildId, {
        name,
        response,
        enabled,
        allowedRoles,
        cooldown,
        aliases,
        description,
        category
      });
      res.status(201).json(command);
    } catch (err) {
      console.error('[CustomCommands] POST error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  router.put('/:guildId/:name', requireAuth, requireGuildAccess, express.json(), async (req, res) => {
    try {
      const updates = req.body;
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }
      const command = await service.update(req.params.guildId, req.params.name, updates);
      res.json(command);
    } catch (err) {
      console.error('[CustomCommands] PUT error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/:guildId/:name', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      await service.delete(req.params.guildId, req.params.name);
      res.json({ success: true });
    } catch (err) {
      console.error('[CustomCommands] DELETE error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/:guildId/:name/toggle', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const command = await service.toggle(req.params.guildId, req.params.name);
      res.json(command);
    } catch (err) {
      console.error('[CustomCommands] TOGGLE error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createCustomCommandsRoutes };
