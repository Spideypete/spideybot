const express = require('express')
const { ServerMessagesService } = require('./server-messages.service.cjs')

function createServerMessagesRoutes(configPath) {
  const router = express.Router()
  const service = new ServerMessagesService(configPath)

  function requireAuth(req, res, next) {
    if (!req.session?.authenticated) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    next()
  }

  function requireGuildAccess(req, res, next) {
    const guildId = req.params.guildId
    const hasAccess = req.session?.guilds?.some((g) => g.id === guildId)
    if (!hasAccess) {
      return res.status(403).json({ error: "You don't have admin permissions in this server" })
    }
    next()
  }

  router.get('/:guildId', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const config = await service.getConfig(req.params.guildId)
      res.json(config)
    } catch (err) {
      console.error('[ServerMessages] GET error:', err)
      res.status(500).json({ error: 'Failed to load server messages config' })
    }
  })

  router.post('/:guildId/welcome', requireAuth, requireGuildAccess, express.json(), async (req, res) => {
    try {
      const { message, channel, enabled, embed } = req.body
      if (!message && !channel && enabled === undefined && !embed) {
        return res.status(400).json({ error: 'No changes provided' })
      }
      const config = await service.setWelcome(req.params.guildId, message, channel, enabled, embed)
      res.json({ success: true, config })
    } catch (err) {
      console.error('[ServerMessages] POST welcome error:', err)
      res.status(500).json({ error: 'Failed to save welcome config' })
    }
  })

  router.post('/:guildId/goodbye', requireAuth, requireGuildAccess, express.json(), async (req, res) => {
    try {
      const { message, channel, enabled, embed } = req.body
      if (!message && !channel && enabled === undefined && !embed) {
        return res.status(400).json({ error: 'No changes provided' })
      }
      const config = await service.setGoodbye(req.params.guildId, message, channel, enabled, embed)
      res.json({ success: true, config })
    } catch (err) {
      console.error('[ServerMessages] POST goodbye error:', err)
      res.status(500).json({ error: 'Failed to save goodbye config' })
    }
  })

  router.post('/:guildId/boost', requireAuth, requireGuildAccess, express.json(), async (req, res) => {
    try {
      const { message, channel, enabled, embed } = req.body
      if (!message && !channel && enabled === undefined && !embed) {
        return res.status(400).json({ error: 'No changes provided' })
      }
      const config = await service.setBoost(req.params.guildId, message, channel, enabled, embed)
      res.json({ success: true, config })
    } catch (err) {
      console.error('[ServerMessages] POST boost error:', err)
      res.status(500).json({ error: 'Failed to save boost config' })
    }
  })

  router.delete('/:guildId/:type', requireAuth, requireGuildAccess, async (req, res) => {
    try {
      const { type } = req.params
      const validTypes = ['welcome', 'goodbye', 'boost']
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be welcome, goodbye, or boost' })
      }
      await service.disable(req.params.guildId, type)
      res.json({ success: true, message: `${type} disabled` })
    } catch (err) {
      console.error('[ServerMessages] DELETE error:', err)
      res.status(500).json({ error: 'Failed to disable message type' })
    }
  })

  return router
}

module.exports = { createServerMessagesRoutes }
