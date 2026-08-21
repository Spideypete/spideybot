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
  constructor() {
    this.configPath = CONFIG_FILE;
  }

  loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } catch (err) {
        console.error('Config load error:', err.message);
        return { guilds: {} };
      }
    }
    return { guilds: {} };
  }

  saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  getGuildConfig(guildId) {
    const config = this.loadConfig();
    if (!config.guilds[guildId]) {
      config.guilds[guildId] = { ...DEFAULT_GUILD_CONFIG };
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
      config.guilds[guildId] = { ...DEFAULT_GUILD_CONFIG };
    }
    config.guilds[guildId] = { ...config.guilds[guildId], ...updates };
    this.saveConfig(config);
    return config.guilds[guildId];
  }
}

module.exports = { ConfigManager };
