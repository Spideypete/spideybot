// Gatekeeper Middleware - Enforces tier-based feature limits
const { checkEntitlement, getTierLimits, getGuildEntitlements } = require('../services/subscription.manager');

function createGatekeeper(feature) {
  return (req, res, next) => {
    const guildId = req.query.guildId || req.params.guildId;
    
    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID required' });
    }
    
    const hasAccess = checkEntitlement(guildId, feature);
    
    if (!hasAccess) {
      const limits = getTierLimits(guildId);
      const entitlements = getGuildEntitlements(guildId);
      
      return res.status(403).json({
        error: 'Premium required',
        upgradeRequired: true,
        currentTier: entitlements.tier,
        entitlements: entitlements.entitlements
      });
    }
    
    next();
  };
}

// Specific gatekeepers for common features
const requireUnlimitedReactRoles = createGatekeeper('unlimitedReactRoles');
const requireXP = createGatekeeper('xpLeaderboards');
const requireCustomCommands = createGatekeeper('customCommands');
const requireAnalytics = createGatekeeper('analytics');
const requireInvites = createGatekeeper('inviteTracking');
const requireAutomation = createGatekeeper('automation');
const requireUnlimitedGiveaways = createGatekeeper('unlimitedGiveaways');

module.exports = {
  createGatekeeper,
  requireUnlimitedReactRoles,
  requireXP,
  requireCustomCommands,
  requireAnalytics,
  requireInvites,
  requireAutomation,
  requireUnlimitedGiveaways
};