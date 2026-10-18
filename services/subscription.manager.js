const crypto = require('crypto');
// Subscription Manager - Handles tier management and feature gating
const fs = require('fs');
const path = require('path');

const configFile = path.join(__dirname, '../config.json');

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

// Per-server plan policy. Limits are enforced by the bot and dashboard APIs.
const PLAN_POLICY = {
  free: {
    reactionRoles: 3, reactionsPerMessage: 5, achievementsMessages: 8, achievementsEmoji: 8,
    customCommands: 5, inviteMilestones: 10, embedMessages: 2, socialAccountsPerSection: 5,
    giveawayInviteMessages: 10, polls: false, emojis: false, music: false, embedStyling: false,
    reactionRoleDmConfirmation: true, achievementAnnouncements: false, reminderBehaviour: false,
    birthdayCustomEvents: false, economyCustomCurrency: false, aiDailyRequests: 50
  },
  premium: {
    reactionRoles: 8, reactionsPerMessage: 10, achievementsMessages: 15, achievementsEmoji: 15,
    customCommands: 25, inviteMilestones: 20, embedMessages: 5, socialAccountsPerSection: 10,
    giveawayInviteMessages: 20, polls: true, emojis: true, music: true, embedStyling: true,
    reactionRoleDmConfirmation: false, achievementAnnouncements: true, reminderBehaviour: true,
    birthdayCustomEvents: true, economyCustomCurrency: true, aiDailyRequests: 50
  },
  pro: {
    reactionRoles: Infinity, reactionsPerMessage: Infinity, achievementsMessages: Infinity, achievementsEmoji: Infinity,
    customCommands: 100, inviteMilestones: 100, embedMessages: 30, socialAccountsPerSection: 20,
    giveawayInviteMessages: 100, polls: true, emojis: true, music: true, embedStyling: true,
    reactionRoleDmConfirmation: false, achievementAnnouncements: true, reminderBehaviour: true,
    birthdayCustomEvents: true, economyCustomCurrency: true, aiDailyRequests: 50
  }
};
const DEFAULT_FEATURE_TOGGLES = {
  reactRoles: { free: 3, premium: 8, pro: Infinity },
  giveaways: { free: 10, premium: 20, pro: 100 },
  xpLeaderboards: { free: true, premium: true, pro: true },
  customCommands: { free: 5, premium: 25, pro: 100 },
  fullServerGuard: { free: true, premium: true, pro: true },
  analytics: { free: true, premium: true, pro: true },
  inviteTracking: { free: 10, premium: 20, pro: 100 },
  automation: { free: true, premium: true, pro: true },
  antiRaid: { free: true, premium: true, pro: true },
  antiSpam: { free: true, premium: true, pro: true }
};
function getGuildPlanPolicy(guildId) {
  const tier = getGuildTier(guildId);
  return { tier, ...(PLAN_POLICY[tier] || PLAN_POLICY.free) };
}
function getPlanLimit(guildId, key) {
  return getGuildPlanPolicy(guildId)[key] ?? PLAN_POLICY.free[key] ?? 0;
}
function isPlanFeatureAllowed(guildId, feature) {
  const policy = getGuildPlanPolicy(guildId);
  if (feature === 'welcome' || feature === 'goodbye' || feature === 'moderator' || feature === 'automod' || feature === 'audit' || feature === 'levels' || feature === 'ticketing' || feature === 'casino' || feature === 'lottery' || feature === 'games' || feature === 'system' || feature === 'achievements' || feature === 'reminders' || feature === 'birthdays' || feature === 'economy' || feature === 'customCommands' || feature === 'inviteTracker' || feature === 'giveaways' || feature === 'embeds' || feature === 'socialAlerts') return true;
  if (feature === 'reactionRoles') return true;
  if (feature === 'music') return policy.music;
  if (feature === 'polls' || feature === 'poll') return policy.polls;
  if (feature === 'emojis' || feature === 'emoji') return policy.emojis;
  if (feature === 'embedStyling') return policy.embedStyling;
  if (feature === 'reminderBehaviour') return policy.reminderBehaviour;
  if (feature === 'birthdayCustomEvents') return policy.birthdayCustomEvents;
  if (feature === 'achievementAnnouncements') return policy.achievementAnnouncements;
  if (feature === 'economyCustomCurrency') return policy.economyCustomCurrency;
  return true;
}
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

function redeemActivationKey(guildId, rawKey) {
  const supplied=String(rawKey||'').trim();
  if(!supplied) return {success:false,error:'Enter a valid activation key.'};
  let keys={};
  try{keys=JSON.parse(process.env.SPIDEY_PREMIUM_KEYS||'{}');}
  catch{return {success:false,error:'Premium activation keys are misconfigured. Ask the bot owner to fix SPIDEY_PREMIUM_KEYS.'};}
  if(!keys||typeof keys!=='object'||Array.isArray(keys))return {success:false,error:'Premium activation keys are misconfigured.'};
  const matched=Object.keys(keys).find(key=>{
    const a=Buffer.from(crypto.createHash('sha256').update(key).digest('hex'));
    const b=Buffer.from(crypto.createHash('sha256').update(supplied).digest('hex'));
    return a.length===b.length&&crypto.timingSafeEqual(a,b);
  });
  if(!matched)return {success:false,error:'That activation key is invalid.'};
  const config=loadConfig(),hash=crypto.createHash('sha256').update(matched).digest('hex');
  config.global_configs=config.global_configs||{};
  config.global_configs.redeemedPremiumKeys=config.global_configs.redeemedPremiumKeys||{};
  if(config.global_configs.redeemedPremiumKeys[hash])return {success:false,error:'That activation key has already been redeemed.'};
  const spec=keys[matched],tier=String(spec?.tier||'premium').toLowerCase(),months=Number(spec?.durationMonths||1);
  if(!['premium','pro'].includes(tier)||!Number.isInteger(months)||months<1||months>12)return {success:false,error:'The activation key has an invalid tier or duration.'};
  setGuildTier(guildId,tier,months);
  const fresh=loadConfig();
  fresh.global_configs=fresh.global_configs||{};
  fresh.global_configs.redeemedPremiumKeys=fresh.global_configs.redeemedPremiumKeys||{};
  fresh.global_configs.redeemedPremiumKeys[hash]={guildId:String(guildId),redeemedAt:Date.now(),tier,months};
  saveConfig(fresh);
  return {success:true,tier,months};
}

function getGuildTier(guildId) {
  const config = loadConfig();
  const guild = config.guilds?.[guildId] || {};
  const tier = String(guild.tier || 'free').toLowerCase();
  if (!['free','premium','pro'].includes(tier)) return 'free';
  if (tier !== 'free' && guild.tierEndDate && Number(guild.tierEndDate) <= Date.now()) return 'free';
  return tier;
}

function getTierLimits(guildId) {
  const tier = getGuildTier(guildId);
  const toggles = getFeatureToggles();
  const policy = PLAN_POLICY[tier] || PLAN_POLICY.free;
  return {
    ...policy,
    maxReactRoles: toggles.reactRoles?.[tier] ?? policy.reactionRoles,
    maxGiveaways: toggles.giveaways?.[tier] ?? policy.giveawayInviteMessages,
    maxCustomCommands: toggles.customCommands?.[tier] ?? policy.customCommands,
    maxInviteMilestones: toggles.inviteTracking?.[tier] ?? policy.inviteMilestones,
    hasXP: toggles.xpLeaderboards?.[tier] ?? true,
    hasCustomCommands: (toggles.customCommands?.[tier] ?? policy.customCommands) > 0,
    hasFullServerGuard: toggles.fullServerGuard?.[tier] ?? true,
    hasAnalytics: toggles.analytics?.[tier] ?? true,
    hasInvites: (toggles.inviteTracking?.[tier] ?? policy.inviteMilestones) > 0,
    hasAutomation: toggles.automation?.[tier] ?? true,
    hasAntiRaid: toggles.antiRaid?.[tier] ?? true,
    hasAntiSpam: toggles.antiSpam?.[tier] ?? true
  };
}

function checkEntitlement(guildId, feature) {
  const limits = getTierLimits(guildId);
  if (feature === 'unlimitedReactRoles') return limits.maxReactRoles > 3;
  if (feature === 'xpLeaderboards') return limits.hasXP;
  if (feature === 'customCommands') return limits.hasCustomCommands;
  if (feature === 'fullServerGuard') return limits.hasFullServerGuard;
  if (feature === 'analytics') return limits.hasAnalytics;
  if (feature === 'inviteTracking') return limits.hasInvites;
  if (feature === 'automation') return limits.hasAutomation;
  if (feature === 'unlimitedGiveaways') return limits.maxGiveaways > 10;
  if (feature in limits) return Boolean(limits[feature]);
  return isPlanFeatureAllowed(guildId, feature);
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
  const tier = getGuildTier(guildId);
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
  getGuildPlanPolicy,
  getPlanLimit,
  isPlanFeatureAllowed,
  PLAN_POLICY,
  redeemActivationKey,
  getTierLimits,
  checkEntitlement,
  setGuildTier,
  getGuildEntitlements,
  getTierFeatures,
  getTierInfo,
  DEFAULT_FEATURE_TOGGLES
};