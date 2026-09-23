// src/config/config-manager.cjs
// Config manager for guild configuration persistence

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../../config.json');

const DEFAULT_GUILD_CONFIG = {
  welcomeChannelId: null,
  welcomeMessage: 'Welcome to our server! 🎉',
  roleCategories: {},
  prefix: '/',
  modLogChannelId: null,
  twitchChannelId: null,
  twitchUsers: [],
  tiktokChannelId: null,
  tiktokUsers: [],
  kickChannelId: null,
  kickUsers: [],
  activities: [],
  musicLoopMode: false,
  musicShuffle: false,
  musicVolume: 100,
  warnings: {},
  economy: {},
  levels: {},
  'xp-levels': {
    xpPerLevel: 500,
    xpPerMessage: 15,
    levelRoles: {},
    announcementChannel: null,
    announceLevelUps: true,
    autoNickname: false,
    nicknameTemplate: '{name} {level}'
  },
  keepOldLevelRoles: true
};

class ConfigManager {
  constructor(configPath = CONFIG_FILE) {
    this.configPath = configPath;
  }

  _cloneDefaultGuildConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_GUILD_CONFIG));
  }

  _writeConfigAtomic(config) {
    const dir = path.dirname(this.configPath);
    const tempPath = this.configPath + '.tmp-' + process.pid + '-' + Date.now();
    const data = JSON.stringify(config, null, 2);
    const fd = fs.openSync(tempPath, 'w', 0o600);
    try {
      fs.writeFileSync(fd, data, 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tempPath, this.configPath);
    try { fs.chmodSync(this.configPath, 0o600); } catch (_) {}
  }

  loadConfig() {
    if (fs.existsSync(this.configPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } catch (err) {
        console.error('Config load error:', err.message);
        return { guilds: {} };
      }
    }
    return { guilds: {} };
  }

  saveConfig(config) {
    this._writeConfigAtomic(config);
  }

  getGuildConfig(guildId) {
    const config = this.loadConfig();
    if (!config.guilds[guildId]) {
      config.guilds[guildId] = this._cloneDefaultGuildConfig();
      this.saveConfig(config);
    }
    return config.guilds[guildId];
  }

  setGuildConfig(guildId, guildConfig) {
    const config = this.loadConfig();
    config.guilds[guildId] = guildConfig;
    this.saveConfig(config);
    return guildConfig;
  }

  updateGuildConfig(guildId, updates) {
    const config = this.loadConfig();
    if (!config.guilds[guildId]) {
      config.guilds[guildId] = this._cloneDefaultGuildConfig();
    }
    config.guilds[guildId] = { ...config.guilds[guildId], ...updates };
    this.saveConfig(config);
    return config.guilds[guildId];
  }
}

// Backward-compatible singleton helpers used by feature services.
// Keep ConfigManager available for new code while preserving the original
// functional API used by older feature modules.
const defaultConfigManager = new ConfigManager();

const loadConfig = () => defaultConfigManager.loadConfig();
const saveConfig = (config) => defaultConfigManager.saveConfig(config);
const getGuildConfig = (guildId) => defaultConfigManager.getGuildConfig(guildId);
const setGuildConfig = (guildId, guildConfig) => defaultConfigManager.setGuildConfig(guildId, guildConfig);
const updateGuildConfig = (guildId, updates) => defaultConfigManager.updateGuildConfig(guildId, updates);

module.exports = {
  ConfigManager,
  DEFAULT_GUILD_CONFIG,
  loadConfig,
  saveConfig,
  getGuildConfig,
  setGuildConfig,
  updateGuildConfig
};
