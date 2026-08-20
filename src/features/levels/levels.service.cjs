const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../../config.json');

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
  return { guilds: {} };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getGuildConfig(guildId) {
  const config = loadConfig();
  if (!config.guilds[guildId]) {
    config.guilds[guildId] = {};
    saveConfig(config);
  }
  return config.guilds[guildId];
}

function getXpLevelsConfig(guildId) {
  const guildConfig = getGuildConfig(guildId);
  if (!guildConfig['xp-levels']) {
    guildConfig['xp-levels'] = {
      xpPerLevel: 500,
      xpPerMessage: 15,
      levelRoles: {},
      announcementChannel: null,
      announceLevelUps: true,
      autoNickname: false,
      nicknameTemplate: '{name} {level}'
    };
    saveConfig(loadConfig());
  }
  return guildConfig['xp-levels'];
}

function getLevelsData(guildId) {
  const guildConfig = getGuildConfig(guildId);
  if (!guildConfig.levels) {
    guildConfig.levels = {};
    saveConfig(loadConfig());
  }
  return guildConfig.levels;
}

function getConfig(guildId) {
  return getXpLevelsConfig(guildId);
}

function setConfig(guildId, config) {
  const guildConfig = getGuildConfig(guildId);
  guildConfig['xp-levels'] = { ...guildConfig['xp-levels'], ...config };
  saveConfig(loadConfig());
  return guildConfig['xp-levels'];
}

function calculateLevel(totalXp, xpPerLevel) {
  const safeXpPerLevel = Math.max(1, xpPerLevel || 500);
  return Math.floor(Math.sqrt(totalXp / safeXpPerLevel));
}

function getUserLevel(guildId, userId) {
  const levels = getLevelsData(guildId);
  const xp = levels[`${userId}_xp`] || 0;
  const config = getXpLevelsConfig(guildId);
  const level = calculateLevel(xp, config.xpPerLevel);
  return { xp, level };
}

function addXp(guildId, userId, amount) {
  const levels = getLevelsData(guildId);
  const config = getXpLevelsConfig(guildId);
  const oldXp = levels[`${userId}_xp`] || 0;
  const oldLevel = calculateLevel(oldXp, config.xpPerLevel);
  const newXp = oldXp + amount;
  levels[`${userId}_xp`] = newXp;
  levels[`${userId}_xp_time`] = Date.now();
  const newLevel = calculateLevel(newXp, config.xpPerLevel);
  const guildConfig = getGuildConfig(guildId);
  guildConfig.levels = levels;
  saveConfig(loadConfig());
  return { xp: newXp, level: newLevel, leveledUp: newLevel > oldLevel };
}

function removeXp(guildId, userId, amount) {
  const levels = getLevelsData(guildId);
  const config = getXpLevelsConfig(guildId);
  const oldXp = levels[`${userId}_xp`] || 0;
  const newXp = Math.max(0, oldXp - amount);
  levels[`${userId}_xp`] = newXp;
  const guildConfig = getGuildConfig(guildId);
  guildConfig.levels = levels;
  saveConfig(loadConfig());
  const newLevel = calculateLevel(newXp, config.xpPerLevel);
  return { xp: newXp, level: newLevel };
}

function setLevel(guildId, userId, level) {
  const levels = getLevelsData(guildId);
  const config = getXpLevelsConfig(guildId);
  const targetXp = level * level * config.xpPerLevel;
  levels[`${userId}_xp`] = targetXp;
  const guildConfig = getGuildConfig(guildId);
  guildConfig.levels = levels;
  saveConfig(loadConfig());
  return { xp: targetXp, level };
}

function getLeaderboard(guildId, limit = 10) {
  const levels = getLevelsData(guildId);
  const config = getXpLevelsConfig(guildId);
  const entries = Object.keys(levels)
    .filter(key => !key.includes('_xp_time'))
    .map(key => {
      const userId = key.replace('_xp', '');
      const xp = levels[key] || 0;
      const level = calculateLevel(xp, config.xpPerLevel);
      return { userId, xp, level };
    })
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
  return entries;
}

function resetAllXp(guildId) {
  const guildConfig = getGuildConfig(guildId);
  guildConfig.levels = {};
  saveConfig(loadConfig());
}

function getCooldown(guildId, userId) {
  const levels = getLevelsData(guildId);
  return levels[`${userId}_xp_time`] || 0;
}

function canGainXp(guildId, userId, cooldownMs = 60000) {
  const lastTime = getCooldown(guildId, userId);
  return Date.now() - lastTime > cooldownMs;
}

module.exports = {
  getConfig,
  setConfig,
  addXp,
  removeXp,
  setLevel,
  getUserLevel,
  getLeaderboard,
  resetAllXp,
  calculateLevel,
  canGainXp,
  getCooldown
};
