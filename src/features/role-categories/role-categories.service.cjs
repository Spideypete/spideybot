const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "role-categories.json");

const TEXT_CHANNEL_TYPES = new Set([0, 5]);

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      if (parsed && typeof parsed === "object" && parsed.guilds) return parsed;
    }
  } catch (e) {
    console.error("[role-categories] Failed to load data:", e.message);
  }
  return { guilds: {} };
}

function saveData(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

class RoleCategoriesService {
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
      this.data.guilds[guildId] = {};
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

  _normalizeCategory(category) {
    const name = typeof category.name === "string" ? category.name.trim() : "";
    if (!name) throw new Error("Category name is required.");
    return {
      name,
      roles: Array.isArray(category.roles)
        ? category.roles.map(String)
        : [],
      banner: typeof category.banner === "string" ? category.banner : null,
      channelId:
        category.channelId != null ? String(category.channelId) : null,
      messageId:
        category.messageId != null ? String(category.messageId) : null,
    };
  }

  async _validateChannel(guildId, channelId) {
    if (channelId == null) return;
    const guild = await this._resolveGuild(guildId);
    if (!guild) return;
    const channel =
      guild.channels.cache.get(channelId) ||
      (await guild.channels.fetch(channelId).catch(() => null));
    if (!channel) {
      throw new Error(`Channel ${channelId} does not exist in this server.`);
    }
  }

  async _validateRole(guildId, roleId) {
    if (roleId == null) return;
    const guild = await this._resolveGuild(guildId);
    if (!guild) return;
    const role =
      guild.roles.cache.get(roleId) ||
      (await guild.roles.fetch(roleId).catch(() => null));
    if (!role) {
      throw new Error(`Role ${roleId} does not exist in this server.`);
    }
  }

  getCategories(guildId) {
    const cfg = this._guildConfig(guildId, true);
    return Object.values(cfg).map((c) => ({ ...c }));
  }

  async addCategory(guildId, category) {
    const normalized = this._normalizeCategory(category);
    await this._validateChannel(guildId, normalized.channelId);
    for (const roleId of normalized.roles) {
      await this._validateRole(guildId, roleId);
    }
    const cfg = this._guildConfig(guildId, true);
    if (cfg[normalized.name]) {
      throw new Error(`Category "${normalized.name}" already exists.`);
    }
    cfg[normalized.name] = normalized;
    this._persist();
    return { ...normalized };
  }

  async updateCategory(guildId, name, updates) {
    const cfg = this._guildConfig(guildId, false);
    if (!cfg || !cfg[name]) {
      throw new Error(`Category "${name}" not found.`);
    }
    const current = cfg[name];
    const merged = { ...current, ...updates };
    const normalized = this._normalizeCategory(merged);
    await this._validateChannel(guildId, normalized.channelId);
    for (const roleId of normalized.roles) {
      await this._validateRole(guildId, roleId);
    }

    if (normalized.name !== name) {
      if (cfg[normalized.name]) {
        throw new Error(`Category "${normalized.name}" already exists.`);
      }
      delete cfg[name];
    }
    cfg[normalized.name] = normalized;
    this._persist();
    return { ...normalized };
  }

  deleteCategory(guildId, name) {
    const cfg = this._guildConfig(guildId, false);
    if (!cfg || !cfg[name]) {
      throw new Error(`Category "${name}" not found.`);
    }
    delete cfg[name];
    this._persist();
    return true;
  }

  async addRoleToCategory(guildId, categoryName, roleId) {
    if (!roleId) throw new Error("roleId is required.");
    roleId = String(roleId);
    await this._validateRole(guildId, roleId);
    const cfg = this._guildConfig(guildId, false);
    if (!cfg || !cfg[categoryName]) {
      throw new Error(`Category "${categoryName}" not found.`);
    }
    const category = cfg[categoryName];
    if (!category.roles.includes(roleId)) {
      category.roles.push(roleId);
      this._persist();
    }
    return { ...category };
  }

  removeRoleFromCategory(guildId, categoryName, roleId) {
    roleId = String(roleId);
    const cfg = this._guildConfig(guildId, false);
    if (!cfg || !cfg[categoryName]) {
      throw new Error(`Category "${categoryName}" not found.`);
    }
    const category = cfg[categoryName];
    const before = category.roles.length;
    category.roles = category.roles.filter((r) => r !== roleId);
    if (category.roles.length === before) {
      return { ...category, removed: false };
    }
    this._persist();
    return { ...category, removed: true };
  }
}

module.exports = new RoleCategoriesService();
module.exports.RoleCategoriesService = RoleCategoriesService;
