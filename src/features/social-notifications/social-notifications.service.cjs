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

function getSocialNotifications(guildId) {
  const guildConfig = getGuildConfig(guildId);
  if (!guildConfig.socialNotifications) {
    guildConfig.socialNotifications = {
      enabled: false,
      notifications: []
    };
  }
  return guildConfig.socialNotifications;
}

function getConfig(guildId) {
  const sn = getSocialNotifications(guildId);
  return {
    enabled: sn.enabled || false,
    twitchChannelId: sn.twitchChannelId || null,
    tiktokChannelId: sn.tiktokChannelId || null,
    kickChannelId: sn.kickChannelId || null,
    youtubeChannelId: sn.youtubeChannelId || null
  };
}

function setConfig(guildId, config) {
  const sn = getSocialNotifications(guildId);
  const merged = { ...sn, ...config };
  const guildConfig = getGuildConfig(guildId);
  guildConfig.socialNotifications = merged;
  saveConfig(loadConfig());
}

function addNotification(guildId, notification) {
  const sn = getSocialNotifications(guildId);
  if (!sn.notifications) sn.notifications = [];

  const existing = sn.notifications.find(
    n => n.platform === notification.platform && n.username.toLowerCase() === notification.username.toLowerCase()
  );

  if (existing) {
    return { success: false, error: `${notification.platform} user "${notification.username}" is already being monitored.` };
  }

  const entry = {
    platform: notification.platform,
    username: notification.username,
    channelId: notification.channelId,
    enabled: notification.enabled !== false,
    lastChecked: null,
    isLive: false,
    streamTitle: null,
    addedAt: new Date().toISOString()
  };

  sn.notifications.push(entry);
  const guildConfig = getGuildConfig(guildId);
  guildConfig.socialNotifications = sn;
  saveConfig(loadConfig());

  return { success: true, notification: entry };
}

function removeNotification(guildId, platform, username) {
  const sn = getSocialNotifications(guildId);
  if (!sn.notifications) return { success: false, error: 'No notifications configured.' };

  const index = sn.notifications.findIndex(
    n => n.platform === platform && n.username.toLowerCase() === username.toLowerCase()
  );

  if (index === -1) {
    return { success: false, error: 'Notification not found.' };
  }

  const removed = sn.notifications.splice(index, 1)[0];
  const guildConfig = getGuildConfig(guildId);
  guildConfig.socialNotifications = sn;
  saveConfig(loadConfig());

  return { success: true, notification: removed };
}

function toggleNotification(guildId, platform, username) {
  const sn = getSocialNotifications(guildId);
  if (!sn.notifications) return { success: false, error: 'No notifications configured.' };

  const notification = sn.notifications.find(
    n => n.platform === platform && n.username.toLowerCase() === username.toLowerCase()
  );

  if (!notification) {
    return { success: false, error: 'Notification not found.' };
  }

  notification.enabled = !notification.enabled;

  const guildConfig = getGuildConfig(guildId);
  guildConfig.socialNotifications = sn;
  saveConfig(loadConfig());

  return { success: true, notification };
}

function getEnabledNotifications(guildId) {
  const sn = getSocialNotifications(guildId);
  if (!sn.notifications) return [];

  return sn.notifications.filter(n => n.enabled);
}

function getNotifications(guildId) {
  const sn = getSocialNotifications(guildId);
  return sn.notifications || [];
}

function updateStreamStatus(guildId, platform, username, isLive, title) {
  const sn = getSocialNotifications(guildId);
  if (!sn.notifications) return { success: false, error: 'No notifications configured.' };

  const notification = sn.notifications.find(
    n => n.platform === platform && n.username.toLowerCase() === username.toLowerCase()
  );

  if (!notification) {
    return { success: false, error: 'Notification not found.' };
  }

  const wasLive = notification.isLive;
  notification.isLive = isLive;
  notification.streamTitle = title || notification.streamTitle;
  notification.lastChecked = new Date().toISOString();

  const guildConfig = getGuildConfig(guildId);
  guildConfig.socialNotifications = sn;
  saveConfig(loadConfig());

  return {
    success: true,
    wasLive,
    isLive,
    notification,
    wentLive: !wasLive && isLive
  };
}

module.exports = {
  getConfig,
  setConfig,
  addNotification,
  removeNotification,
  toggleNotification,
  getEnabledNotifications,
  getNotifications,
  updateStreamStatus
};
