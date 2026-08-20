const express = require('express');
const router = express.Router();
const socialNotificationsService = require('./social-notifications.service.cjs');
const socialNotificationsHandler = require('./social-notifications.handler.cjs');

function auth(req, res, next) {
  if (!req.session?.authenticated) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

router.get('/:guildId', auth, (req, res) => {
  const notifications = socialNotificationsService.getNotifications(req.params.guildId);
  const config = socialNotificationsService.getConfig(req.params.guildId);

  res.json({
    config,
    notifications
  });
});

router.post('/:guildId', auth, express.json(), (req, res) => {
  const { guildId } = req.params;
  const { platform, username, channelId } = req.body;

  if (!platform || !username || !channelId) {
    return res.status(400).json({ success: false, error: 'Missing required fields: platform, username, channelId' });
  }

  const validPlatforms = ['twitch', 'tiktok', 'kick', 'youtube'];
  if (!validPlatforms.includes(platform.toLowerCase())) {
    return res.status(400).json({ success: false, error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` });
  }

  try {
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

router.delete('/:guildId/:platform/:username', auth, express.json(), (req, res) => {
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

router.post('/:guildId/:platform/:username/toggle', auth, express.json(), (req, res) => {
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

router.post('/:guildId/check', auth, express.json(), async (req, res) => {
  const { guildId } = req.params;

  try {
    const results = await socialNotificationsHandler.checkNow(guildId);
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
