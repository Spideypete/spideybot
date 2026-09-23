// Shared authorization middleware for modular feature APIs.
// OAuth only stores guilds where the user has Discord ADMINISTRATOR permission.
// Every feature endpoint is therefore protected consistently.

function requireFeatureAuth(req, res, next) {
  if (!req.session?.authenticated) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  // Feature routes are mounted as /feature/:guildId/...
  const parts = req.path.split('/').filter(Boolean);
  const guildId = parts[1];

  if (!guildId) {
    return res.status(400).json({ success: false, error: 'Missing guildId' });
  }

  const hasAccess = Array.isArray(req.session.guilds) &&
    req.session.guilds.some(g => String(g.id) === String(guildId));

  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'No administrator access to this server' });
  }

  req.featureGuildId = guildId;
  next();
}

module.exports = { requireFeatureAuth };
