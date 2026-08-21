// src/features/server-guard/server-guard.service.cjs
// Server Guard Service - Business logic for security configuration per guild

const { getGuildConfig, setGuildConfig, updateGuildConfig } = require('../../config/config-manager.cjs');

const DEFAULT_SERVER_GUARD_CONFIG = {
  raidProtection: {
    enabled: true,
    usersPerLimit: 10,
    banRaidUsers: false
  },
  antiSpam: {
    enabled: true,
    messagesPerLimit: 5,
    action: 'warn'
  },
  linkScanning: {
    enabled: true,
    detectPhishing: true,
    blockScamSites: true,
    malwareDetection: true
  },
  antiNuke: {
    enabled: true,
    mode: 'monitor',
    maxActions: 10
  },
  joinGate: {
    enabled: true,
    accountAgeCheck: true,
    minAccountAge: 3,
    suspiciousAvatars: true,
    usernameAnalysis: true
  },
  rateLimiting: {
    enabled: true,
    requestsPerMin: 100,
    dosProtection: true,
    action: 'throttle'
  },
  profanityFilter: {
    enabled: false,
    action: 'delete'
  },
  badWords: []
};

const SUPPORTED_FEATURES = [
  'raidProtection',
  'antiSpam',
  'linkScanning',
  'antiNuke',
  'joinGate',
  'rateLimiting',
  'profanityFilter'
];

function getServerGuardConfig(guildId) {
  const guildConfig = getGuildConfig(guildId);
  
  if (!guildConfig.serverGuard) {
    guildConfig.serverGuard = { ...DEFAULT_SERVER_GUARD_CONFIG };
    if (Array.isArray(guildConfig.badWords)) {
      guildConfig.serverGuard.badWords = guildConfig.badWords;
    }
    if (guildConfig.antiSpam) guildConfig.serverGuard.antiSpam = guildConfig.antiSpam;
    if (guildConfig.linkScanning) guildConfig.serverGuard.linkScanning = guildConfig.linkScanning;
    if (guildConfig.rateLimiting) guildConfig.serverGuard.rateLimiting = guildConfig.rateLimiting;
    if (guildConfig.profanityFilterEnabled !== undefined) guildConfig.serverGuard.profanityFilter = { enabled: guildConfig.profanityFilterEnabled, action: 'delete' };
    if (guildConfig.antiNuke) guildConfig.serverGuard.antiNuke = guildConfig.antiNuke;
    if (guildConfig.joinGate) guildConfig.serverGuard.joinGate = guildConfig.joinGate;
    if (guildConfig.raidProtection) guildConfig.serverGuard.raidProtection = guildConfig.raidProtection;
    updateGuildConfig(guildId, { serverGuard: guildConfig.serverGuard });
  }
  
  const config = guildConfig.serverGuard;
  
  if (!config.raidProtection) config.raidProtection = { ...DEFAULT_SERVER_GUARD_CONFIG.raidProtection };
  if (!config.antiSpam) config.antiSpam = { ...DEFAULT_SERVER_GUARD_CONFIG.antiSpam };
  if (!config.linkScanning) config.linkScanning = { ...DEFAULT_SERVER_GUARD_CONFIG.linkScanning };
  if (!config.antiNuke) config.antiNuke = { ...DEFAULT_SERVER_GUARD_CONFIG.antiNuke };
  if (!config.joinGate) config.joinGate = { ...DEFAULT_SERVER_GUARD_CONFIG.joinGate };
  if (!config.rateLimiting) config.rateLimiting = { ...DEFAULT_SERVER_GUARD_CONFIG.rateLimiting };
  if (!config.profanityFilter) config.profanityFilter = { ...DEFAULT_SERVER_GUARD_CONFIG.profanityFilter };
  if (!Array.isArray(config.badWords)) config.badWords = [];
  
  return config;
}

function setServerGuardConfig(guildId, config) {
  const sanitized = { ...config };
  
  if (!sanitized.raidProtection) sanitized.raidProtection = { ...DEFAULT_SERVER_GUARD_CONFIG.raidProtection };
  if (!sanitized.antiSpam) sanitized.antiSpam = { ...DEFAULT_SERVER_GUARD_CONFIG.antiSpam };
  if (!sanitized.linkScanning) sanitized.linkScanning = { ...DEFAULT_SERVER_GUARD_CONFIG.linkScanning };
  if (!sanitized.antiNuke) sanitized.antiNuke = { ...DEFAULT_SERVER_GUARD_CONFIG.antiNuke };
  if (!sanitized.joinGate) sanitized.joinGate = { ...DEFAULT_SERVER_GUARD_CONFIG.joinGate };
  if (!sanitized.rateLimiting) sanitized.rateLimiting = { ...DEFAULT_SERVER_GUARD_CONFIG.rateLimiting };
  if (!sanitized.profanityFilter) sanitized.profanityFilter = { ...DEFAULT_SERVER_GUARD_CONFIG.profanityFilter };
  if (!Array.isArray(sanitized.badWords)) sanitized.badWords = [];
  
  updateGuildConfig(guildId, { serverGuard: sanitized });
  return sanitized;
}

function toggleFeature(guildId, feature) {
  if (!SUPPORTED_FEATURES.includes(feature)) {
    throw new Error(`Unsupported feature: ${feature}`);
  }
  
  const config = getServerGuardConfig(guildId);
  const featureConfig = config[feature];
  
  if (!featureConfig || typeof featureConfig.enabled === 'undefined') {
    config[feature] = { enabled: true };
  } else {
    config[feature].enabled = !config[feature].enabled;
  }
  
  updateGuildConfig(guildId, { serverGuard: config });
  return config[feature].enabled;
}

function isFeatureEnabled(guildId, feature) {
  if (!SUPPORTED_FEATURES.includes(feature)) {
    return false;
  }
  
  const config = getServerGuardConfig(guildId);
  const featureConfig = config[feature];
  
  if (!featureConfig) return false;
  return featureConfig.enabled !== false;
}

function getWhitelist(guildId) {
  const config = getGuildConfig(guildId);
  if (!Array.isArray(config.serverGuardWhitelist)) {
    config.serverGuardWhitelist = [];
    updateGuildConfig(guildId, { serverGuardWhitelist: config.serverGuardWhitelist });
  }
  return config.serverGuardWhitelist;
}

function addToWhitelist(guildId, userId) {
  if (!/^\d{17,19}$/.test(userId)) {
    throw new Error('Invalid Discord user ID');
  }
  
  const whitelist = getWhitelist(guildId);
  if (!whitelist.includes(userId)) {
    whitelist.push(userId);
    updateGuildConfig(guildId, { serverGuardWhitelist: whitelist });
  }
  return whitelist;
}

function removeFromWhitelist(guildId, userId) {
  const whitelist = getWhitelist(guildId);
  const index = whitelist.indexOf(userId);
  if (index !== -1) {
    whitelist.splice(index, 1);
    updateGuildConfig(guildId, { serverGuardWhitelist: whitelist });
  }
  return whitelist;
}

function isWhitelisted(guildId, userId) {
  const whitelist = getWhitelist(guildId);
  return whitelist.includes(userId);
}

module.exports = {
  DEFAULT_SERVER_GUARD_CONFIG,
  SUPPORTED_FEATURES,
  getServerGuardConfig,
  setServerGuardConfig,
  toggleFeature,
  isFeatureEnabled,
  getWhitelist,
  addToWhitelist,
  removeFromWhitelist,
  isWhitelisted
};
