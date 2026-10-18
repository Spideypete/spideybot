const express = require('express');
const router = express.Router();
const socialNotificationsService = require('./social-notifications.service.cjs');
const socialNotificationsHandler = require('./social-notifications.handler.cjs');
const subscriptionManager = require('../../../services/subscription.manager.js');

function auth(req, res, next) {
  if (!req.session?.authenticated) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

function requireGuildAccess(req, res, next) {
  const guildId = req.params.guildId;
  const allowed = Array.isArray(req.session?.guilds) && req.session.guilds.some(g => String(g.id) === String(guildId));
  if (!allowed) return res.status(403).json({ error: "You don't have admin permissions in this server" });
  next();
}

router.get('/:guildId', auth, requireGuildAccess, (req, res) => {
  const notifications = socialNotificationsService.getNotifications(req.params.guildId);
  const config = socialNotificationsService.getConfig(req.params.guildId);

  res.json({
    config,
    notifications
  });
});

router.post('/:guildId', auth, requireGuildAccess, express.json(), (req, res) => {
  const { guildId } = req.params;
  const { platform, username, channelId } = req.body;

  // A body containing only configuration keys updates the server-wide notification switch/channels.
  if (!platform && !username && !channelId) {
    if (typeof req.body?.enabled !== 'boolean' && !req.body?.twitchChannelId && !req.body?.youtubeChannelId && !req.body?.kickChannelId && !req.body?.tiktokChannelId && !req.body?.rumbleChannelId) {
      return res.status(400).json({ success: false, error: 'Provide a notification or configuration update' });
    }
    socialNotificationsService.setConfig(guildId, req.body);
    return res.json({ success: true, config: socialNotificationsService.getConfig(guildId) });
  }

  if (!platform || !username || !channelId) {
    return res.status(400).json({ success: false, error: 'Missing required fields: platform, username, channelId' });
  }

  const validPlatforms = ['twitch', 'tiktok', 'kick', 'youtube', 'rumble'];
  if (!validPlatforms.includes(platform.toLowerCase())) {
    return res.status(400).json({ success: false, error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` });
  }

  try {
    const policy = subscriptionManager.getGuildPlanPolicy(guildId);
    const existingForPlatform = socialNotificationsService.getNotifications(guildId).filter(n => String(n.platform || '').toLowerCase() === platform.toLowerCase());
    const alreadyExists = existingForPlatform.some(n => String(n.username || '').toLowerCase() === String(username).toLowerCase());
    if (!alreadyExists && existingForPlatform.length >= policy.socialAccountsPerSection) {
      return res.status(403).json({ success: false, error: 'This server has reached its '+policy.socialAccountsPerSection+' account limit for '+platform.toUpperCase()+' on the '+policy.tier.toUpperCase()+' plan.', upgradeRequired: true, currentTier: policy.tier, limit: policy.socialAccountsPerSection, currentCount: existingForPlatform.length });
    }
    const result = socialNotificationsService.addNotification(guildId, {
      platform: platform.toLowerCase(),
      username,
      channelId
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, notification: result.notification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:guildId/:platform/:username', auth, requireGuildAccess, express.json(), (req, res) => {
  const { guildId, platform, username } = req.params;

  try {
    const result = socialNotificationsService.removeNotification(guildId, platform, decodeURIComponent(username));
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, notification: result.notification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:guildId/:platform/:username/toggle', auth, requireGuildAccess, express.json(), (req, res) => {
  const { guildId, platform, username } = req.params;

  try {
    const result = socialNotificationsService.toggleNotification(guildId, platform, decodeURIComponent(username));
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, notification: result.notification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:guildId/check', auth, requireGuildAccess, express.json(), async (req, res) => {
  const { guildId } = req.params;

  try {
    const results = await socialNotificationsHandler.checkNow(guildId, req.app.locals.discordClient);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
