// Subscription Manager - Handles tier management and feature gating
const fs = require('fs');
const path = require('path');

const configFile = path.join(__dirname, 'config.json');

function loadConfig() {
  try {
    const data = fs.readFileSync(configFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { creator: {}, guilds: {} };
  }
}

function saveConfig(config) {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

// Default feature toggles
const DEFAULT_FEATURE_TOGGLES = {
  reactRoles: { free: 3, premium: Infinity, pro: Infinity },
  giveaways: { free: 1, premium: Infinity, pro: Infinity },
  xpLeaderboards: { free: false, premium: true, pro: true },
  customCommands: { free: false, premium: true, pro: true },
  fullServerGuard: { free: false, premium: true, pro: true },
  analytics: { free: false, premium: false, pro: true },
  inviteTracking: { free: false, premium: false, pro: true },
  automation: { free: false, premium: false, pro: true },
  antiRaid: { free: true, premium: true, pro: true },
  antiSpam: { free: true, premium: true, pro: true }
};

function getFeatureToggles() {
  const config = loadConfig();
  return config.global_configs?.featureToggles || DEFAULT_FEATURE_TOGGLES;
}

function setFeatureToggles(featureToggles) {
  const config = loadConfig();
  if (!config.global_configs) config.global_configs = {};
  config.global_configs.featureToggles = featureToggles;
  saveConfig(config);
}

function getGuildTier(guildId) {
  const config = loadConfig();
  const guild = config.guilds[guildId] || {};
  
  if (!guild.tier || guild.tier === 'free') return 'free';
  if (guild.tier === 'premium' || guild.tier === 'pro') return guild.tier;
  
  // Check if expired
  if (guild.tierEndDate && guild.tierEndDate < Date.now()) {
    return 'free';
  }
  
  return guild.tier || 'free';
}

function getTierLimits(guildId) {
  const tier = getGuildTier(guildId);
  const toggles = getFeatureToggles();
  
  return {
    maxReactRoles: toggles.reactRoles?.[tier] ?? 3,
    maxGiveaways: toggles.giveaways?.[tier] ?? 1,
    hasXP: toggles.xpLeaderboards?.[tier] ?? false,
    hasCustomCommands: toggles.customCommands?.[tier] ?? false,
    hasFullServerGuard: toggles.fullServerGuard?.[tier] ?? false,
    hasAnalytics: toggles.analytics?.[tier] ?? false,
    hasInvites: toggles.inviteTracking?.[tier] ?? false,
    hasAutomation: toggles.automation?.[tier] ?? false,
    hasAntiRaid: toggles.antiRaid?.[tier] ?? true,
    hasAntiSpam: toggles.antiSpam?.[tier] ?? true
  };
}

function checkEntitlement(guildId, feature) {
  const limits = getTierLimits(guildId);
  
  switch (feature) {
    case 'unlimitedReactRoles':
      return limits.maxReactRoles !== 3;
    case 'xpLeaderboards':
      return limits.hasXP;
    case 'customCommands':
      return limits.hasCustomCommands;
    case 'fullServerGuard':
      return limits.hasFullServerGuard;
    case 'analytics':
      return limits.hasAnalytics;
    case 'inviteTracking':
      return limits.hasInvites;
    case 'automation':
      return limits.hasAutomation;
    case 'unlimitedGiveaways':
      return limits.maxGiveaways === Infinity;
    default:
      return false;
  }
}

function setGuildTier(guildId, tier, durationMonths = 0) {
  const config = loadConfig();
  if (!config.guilds[guildId]) config.guilds[guildId] = {};
  
  config.guilds[guildId].tier = tier;
  
  if (tier !== 'free' && durationMonths > 0) {
    const now = Date.now();
    const msPerMonth = 30 * 24 * 60 * 60 * 1000;
    config.guilds[guildId].tierStartDate = now;
    config.guilds[guildId].tierEndDate = now + (durationMonths * msPerMonth);
    config.guilds[guildId].tierDurationMonths = durationMonths;
  } else {
    delete config.guilds[guildId].tierStartDate;
    delete config.guilds[guildId].tierEndDate;
    delete config.guilds[guildId].tierDurationMonths;
  }
  
  saveConfig(config);
  return config.guilds[guildId];
}

function getGuildEntitlements(guildId) {
  const tier = getGuildTier(guildId);
  const limits = getTierLimits(guildId);
  const config = loadConfig();
  const guildConfig = config.guilds[guildId] || {};
  
  const roleCategories = guildConfig.roleCategories || {};
  let totalReactRoles = 0;
  Object.values(roleCategories).forEach(cat => {
    if (cat.roles && Array.isArray(cat.roles)) {
      totalReactRoles += cat.roles.length;
    }
  });
  
  const giveaways = guildConfig.giveaways || {};
  const activeGiveaways = Object.values(giveaways).filter(g => g.status === 'active').length;
  
  return {
    tier,
    entitlements: {
      maxReactRoles: limits.maxReactRoles,
      currentReactRoles: totalReactRoles,
      canAddReactRole: totalReactRoles < limits.maxReactRoles,
      maxGiveaways: limits.maxGiveaways,
      currentGiveaways: activeGiveaways,
      canCreateGiveaway: activeGiveaways < limits.maxGiveaways,
      hasXP: limits.hasXP,
      hasCustomCommands: limits.hasCustomCommands,
      hasFullServerGuard: limits.hasFullServerGuard,
      hasAnalytics: limits.hasAnalytics,
      hasInvites: limits.hasInvites,
      hasAutomation: limits.hasAutomation
    }
  };
}

function getTierFeatures(tier) {
  const toggles = getFeatureToggles();
  const features = {};
  
  for (const [feature, tiers] of Object.entries(toggles)) {
    if (tiers[tier] === true || tiers[tier] === Infinity) {
      features[feature] = true;
    } else if (typeof tiers[tier] === 'number') {
      features[feature] = tiers[tier];
    }
  }
  
  return features;
}

function getTierInfo(guildId) {
  const config = loadConfig();
  const guildConfig = config.guilds[guildId] || {};
  const tier = guildConfig.tier || 'free';
  const tierEndDate = guildConfig.tierEndDate || null;
  const tierDurationMonths = guildConfig.tierDurationMonths || 0;
  
  let remainingMonths = 0;
  if (tierEndDate && tier !== 'free') {
    const now = Date.now();
    const msRemaining = tierEndDate - now;
    remainingMonths = Math.max(0, Math.ceil(msRemaining / (30 * 24 * 60 * 60 * 1000)));
  }
  
  return { guildId, tier, tierEndDate, tierDurationMonths, remainingMonths };
}

module.exports = {
  getFeatureToggles,
  setFeatureToggles,
  getGuildTier,
  getTierLimits,
  checkEntitlement,
  setGuildTier,
  getGuildEntitlements,
  getTierFeatures,
  getTierInfo,
  DEFAULT_FEATURE_TOGGLES
};