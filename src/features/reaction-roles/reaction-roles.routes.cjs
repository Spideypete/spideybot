const express = require("express");
const service = require("./reaction-roles.service.cjs");

function createReactionRolesRouter(client) {
  const router = express.Router();
  if (client) service.setClient(client);

  router.get("/:guildId", (req, res) => {
    try {
      const config = service.getConfig(req.params.guildId);
      res.json({ success: true, ...config });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get("/:guildId/channels", async (req, res) => {
    try {
      const channels = await service.getChannels(req.params.guildId);
      res.json({ success: true, channels });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get("/:guildId/roles", async (req, res) => {
    try {
      const roles = await service.getRoles(req.params.guildId);
      res.json({ success: true, roles });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.post("/:guildId", async (req, res) => {
    try {
      const entry = await service.addEntry(req.params.guildId, req.body || {});
      res.json({ success: true, entry });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  router.delete("/:guildId/:messageId/:emoji", (req, res) => {
    try {
      const emoji = decodeURIComponent(req.params.emoji);
      const ok = service.removeEntry(req.params.guildId, req.params.messageId, emoji);
      if (!ok) {
        return res
          .status(404)
          .json({ success: false, error: "Reaction role not found." });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

module.exports = { createReactionRolesRouter };
