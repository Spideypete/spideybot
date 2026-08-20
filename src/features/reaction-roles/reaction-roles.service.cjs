const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "reaction-roles.json");

const TEXT_CHANNEL_TYPES = new Set([0, 5]);

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      if (parsed && typeof parsed === "object" && parsed.guilds) return parsed;
    }
  } catch (e) {
    console.error("[reaction-roles] Failed to load data:", e.message);
  }
  return { guilds: {} };
}

function saveData(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

class ReactionRolesService {
  constructor() {
    this.client = null;
    this.data = loadData();
  }

  setClient(client) {
    this.client = client;
  }

  _guildConfig(guildId, create) {
    if (!this.data.guilds[guildId]) {
      if (!create) return null;
      this.data.guilds[guildId] = { entries: [], dmConfirmations: false };
    }
    return this.data.guilds[guildId];
  }

  _persist() {
    saveData(this.data);
  }

  async _resolveGuild(guildId) {
    if (!this.client) return null;
    try {
      return (
        this.client.guilds.cache.get(guildId) ||
        (await this.client.guilds.fetch(guildId))
      );
    } catch (e) {
      return null;
    }
  }

  async _validateEntry(guildId, entry) {
    const guild = await this._resolveGuild(guildId);
    if (!guild) {
      console.warn(
        `[reaction-roles] Cannot validate entry for guild ${guildId}: bot is not connected to that guild.`
      );
      return;
    }
    const role =
      guild.roles.cache.get(entry.roleId) ||
      (await guild.roles.fetch(entry.roleId).catch(() => null));
    if (!role) {
      throw new Error(`Role ${entry.roleId} does not exist in this server.`);
    }
    const channel =
      guild.channels.cache.get(entry.channelId) ||
      (await guild.channels.fetch(entry.channelId).catch(() => null));
    if (!channel) {
      throw new Error(`Channel ${entry.channelId} does not exist in this server.`);
    }
  }

  getConfig(guildId) {
    const cfg = this._guildConfig(guildId, true);
    return { entries: cfg.entries, dmConfirmations: cfg.dmConfirmations };
  }

  setConfig(guildId, config) {
    const entries = Array.isArray(config)
      ? config
      : (config && config.entries) || [];
    const dmConfirmations =
      config && typeof config.dmConfirmations === "boolean"
        ? config.dmConfirmations
        : false;
    this.data.guilds[guildId] = { entries, dmConfirmations };
    this._persist();
    return this.getConfig(guildId);
  }

  async addEntry(guildId, entry) {
    if (!entry || !entry.messageId || !entry.channelId || !entry.emoji || !entry.roleId) {
      throw new Error("messageId, channelId, emoji and roleId are required.");
    }
    const normalized = {
      messageId: String(entry.messageId),
      channelId: String(entry.channelId),
      emoji: String(entry.emoji),
      roleId: String(entry.roleId),
      description: typeof entry.description === "string" ? entry.description : "",
    };
    await this._validateEntry(guildId, normalized);

    const cfg = this._guildConfig(guildId, true);
    const exists = cfg.entries.find(
      (e) => e.messageId === normalized.messageId && e.emoji === normalized.emoji
    );
    if (exists) {
      throw new Error("A reaction role with this message and emoji already exists.");
    }
    cfg.entries.push(normalized);
    this._persist();
    return normalized;
  }

  removeEntry(guildId, messageId, emoji) {
    const cfg = this._guildConfig(guildId, false);
    if (!cfg) return false;
    const before = cfg.entries.length;
    cfg.entries = cfg.entries.filter(
      (e) => !(e.messageId === String(messageId) && e.emoji === emoji)
    );
    if (cfg.entries.length === before) return false;
    this._persist();
    return true;
  }

  getEntry(guildId, messageId, emoji) {
    const cfg = this._guildConfig(guildId, false);
    if (!cfg) return null;
    return (
      cfg.entries.find(
        (e) => e.messageId === String(messageId) && e.emoji === emoji
      ) || null
    );
  }

  getEntriesForMessage(guildId, messageId) {
    const cfg = this._guildConfig(guildId, false);
    if (!cfg) return [];
    return cfg.entries.filter((e) => e.messageId === String(messageId));
  }

  setDmConfirmations(guildId, enabled) {
    const cfg = this._guildConfig(guildId, true);
    cfg.dmConfirmations = !!enabled;
    this._persist();
    return cfg.dmConfirmations;
  }

  async getChannels(guildId) {
    const guild = await this._resolveGuild(guildId);
    if (!guild) return [];
    return guild.channels.cache
      .filter((c) => TEXT_CHANNEL_TYPES.has(c.type))
      .map((c) => ({ id: c.id, name: c.name, type: c.type }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getRoles(guildId) {
    const guild = await this._resolveGuild(guildId);
    if (!guild) return [];
    return guild.roles.cache
      .filter((r) => r.id !== guild.id)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        managed: r.managed,
        position: r.position,
      }))
      .sort((a, b) => b.position - a.position);
  }
}

module.exports = new ReactionRolesService();
module.exports.ReactionRolesService = ReactionRolesService;
