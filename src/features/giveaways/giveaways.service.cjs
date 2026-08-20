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

function getGiveaways(guildId) {
  const guildConfig = getGuildConfig(guildId);
  if (!guildConfig.giveaways) {
    guildConfig.giveaways = {};
    saveConfig(loadConfig());
  }
  return guildConfig.giveaways;
}

function generateGiveawayId(prize) {
  const slug = prize.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
  return `${slug}_${Date.now().toString(36)}`;
}

function pickWinners(entries, winnerCount) {
  const count = Math.min(winnerCount || 1, entries.length);
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getActive(guildId) {
  const giveaways = getGiveaways(guildId);
  return Object.values(giveaways).filter(g => g.status === 'active');
}

function getEnded(guildId) {
  const giveaways = getGiveaways(guildId);
  return Object.values(giveaways).filter(g => g.status === 'ended' || g.status === 'rerolled');
}

function getGiveaway(guildId, id) {
  const giveaways = getGiveaways(guildId);
  return giveaways[id] || null;
}

function create(guildId, data) {
  const giveaways = getGiveaways(guildId);
  const id = data.id || generateGiveawayId(data.prize || 'giveaway');

  const giveaway = {
    id,
    prize: data.prize || 'Mystery Prize',
    duration: data.duration || 60,
    winners: data.winners || 1,
    channelId: data.channelId || null,
    messageId: data.messageId || null,
    status: 'active',
    entries: Array.isArray(data.entries) ? data.entries : [],
    endedAt: null,
    winnerIds: [],
    createdAt: new Date().toISOString()
  };

  giveaways[id] = giveaway;
  const guildConfig = getGuildConfig(guildId);
  guildConfig.giveaways = giveaways;
  saveConfig(loadConfig());

  return giveaway;
}

function endGiveaway(guildId, id) {
  const giveaways = getGiveaways(guildId);
  const giveaway = giveaways[id];

  if (!giveaway) return null;
  if (giveaway.status !== 'active') return giveaway;

  giveaway.status = 'ended';
  giveaway.endedAt = new Date().toISOString();
  giveaway.winnerIds = pickWinners(giveaway.entries || [], giveaway.winners);

  const guildConfig = getGuildConfig(guildId);
  guildConfig.giveaways = giveaways;
  saveConfig(loadConfig());

  return giveaway;
}

function reroll(guildId, id) {
  const giveaways = getGiveaways(guildId);
  const giveaway = giveaways[id];

  if (!giveaway) return null;

  giveaway.status = 'rerolled';
  giveaway.endedAt = new Date().toISOString();
  giveaway.winnerIds = pickWinners(giveaway.entries || [], giveaway.winners);

  const guildConfig = getGuildConfig(guildId);
  guildConfig.giveaways = giveaways;
  saveConfig(loadConfig());

  return giveaway;
}

function deleteGiveaway(guildId, id) {
  const giveaways = getGiveaways(guildId);
  if (!giveaways[id]) return false;

  delete giveaways[id];
  const guildConfig = getGuildConfig(guildId);
  guildConfig.giveaways = giveaways;
  saveConfig(loadConfig());

  return true;
}

function addEntry(guildId, id, userId) {
  const giveaways = getGiveaways(guildId);
  const giveaway = giveaways[id];

  if (!giveaway || giveaway.status !== 'active') return null;
  if (!giveaway.entries) giveaway.entries = [];
  if (!giveaway.entries.includes(userId)) {
    giveaway.entries.push(userId);
    const guildConfig = getGuildConfig(guildId);
    guildConfig.giveaways = giveaways;
    saveConfig(loadConfig());
  }
  return giveaway;
}

function removeEntry(guildId, id, userId) {
  const giveaways = getGiveaways(guildId);
  const giveaway = giveaways[id];

  if (!giveaway || giveaway.status !== 'active') return null;
  if (giveaway.entries) {
    giveaway.entries = giveaway.entries.filter(uid => uid !== userId);
    const guildConfig = getGuildConfig(guildId);
    guildConfig.giveaways = giveaways;
    saveConfig(loadConfig());
  }
  return giveaway;
}

module.exports = {
  getActive,
  getEnded,
  getGiveaway,
  create,
  endGiveaway,
  reroll,
  deleteGiveaway,
  addEntry,
  removeEntry,
  pickWinners
};
