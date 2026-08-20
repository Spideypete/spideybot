const express = require("express");
const service = require("./role-categories.service.cjs");

function createRoleCategoriesRouter(client) {
  const router = express.Router();
  if (client) service.setClient(client);

  router.get("/:guildId", (req, res) => {
    try {
      const categories = service.getCategories(req.params.guildId);
      res.json({ success: true, categories });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.post("/:guildId", async (req, res) => {
    try {
      const category = await service.addCategory(
        req.params.guildId,
        req.body || {}
      );
      res.json({ success: true, category });
    } catch (e) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  router.put("/:guildId/:categoryName", async (req, res) => {
    try {
      const categoryName = decodeURIComponent(req.params.categoryName);
      const category = await service.updateCategory(
        req.params.guildId,
        categoryName,
        req.body || {}
      );
      res.json({ success: true, category });
    } catch (e) {
      const status = e.message.includes("not found") ? 404 : 400;
      res.status(status).json({ success: false, error: e.message });
    }
  });

  router.delete("/:guildId/:categoryName", (req, res) => {
    try {
      const categoryName = decodeURIComponent(req.params.categoryName);
      service.deleteCategory(req.params.guildId, categoryName);
      res.json({ success: true });
    } catch (e) {
      const status = e.message.includes("not found") ? 404 : 400;
      res.status(status).json({ success: false, error: e.message });
    }
  });

  router.post("/:guildId/:categoryName/roles", async (req, res) => {
    try {
      const categoryName = decodeURIComponent(req.params.categoryName);
      const roleId = req.body && req.body.roleId;
      const category = await service.addRoleToCategory(
        req.params.guildId,
        categoryName,
        roleId
      );
      res.json({ success: true, category });
    } catch (e) {
      const status = e.message.includes("not found") ? 404 : 400;
      res.status(status).json({ success: false, error: e.message });
    }
  });

  router.delete(
    "/:guildId/:categoryName/roles/:roleId",
    (req, res) => {
      try {
        const categoryName = decodeURIComponent(req.params.categoryName);
        const roleId = decodeURIComponent(req.params.roleId);
        const result = service.removeRoleFromCategory(
          req.params.guildId,
          categoryName,
          roleId
        );
        res.json({ success: true, ...result });
      } catch (e) {
        const status = e.message.includes("not found") ? 404 : 400;
        res.status(status).json({ success: false, error: e.message });
      }
    }
  );

  return router;
}

module.exports = { createRoleCategoriesRouter };
