const express = require('express');
const router = express.Router();
const invitesService = require('./invites.service.cjs');
const invitesHandler = require('./invites.handler.cjs');

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
  const { guildId } = req.params;
  const invites = invitesService.getAllInvites(guildId);
  const config = invitesService.getConfig(guildId);

  res.json({
    config,
    invites
  });
});

router.get('/:guildId/leaderboard', auth, requireGuildAccess, (req, res) => {
  const { guildId } = req.params;
  const leaderboard = invitesService.getInviteLeaderboard(guildId);

  res.json({ leaderboard });
});

router.get('/:guildId/:inviteCode', auth, requireGuildAccess, (req, res) => {
  const { guildId, inviteCode } = req.params;
  const invite = invitesService.getInvite(guildId, decodeURIComponent(inviteCode));

  if (!invite) {
    return res.status(404).json({ success: false, error: 'Invite not found' });
  }

  res.json({ invite });
});

router.post('/:guildId/sync', auth, requireGuildAccess, express.json(), async (req, res) => {
  const { guildId } = req.params;
  const guild = global.client?.guilds?.cache?.get(guildId);

  if (!guild) {
    return res.status(404).json({ success: false, error: 'Guild not found' });
  }

  try {
    const result = await invitesHandler.syncGuildInvites(guild);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    res.json({ success: true, synced: result.count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
