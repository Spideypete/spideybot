const fs = require('fs');
const path = require('path');
const { loadConfig, saveConfig, getGuildConfig } = require('../../config/config-manager.cjs');

const CONFIG_FILE = path.join(__dirname, '../../config.json');

const DEFAULT_COMMAND = Object.freeze({
  response: '',
  enabled: true,
  allowedRoles: [],
  cooldown: 0,
  aliases: [],
  description: '',
  category: 'general',
  createdAt: null,
  updatedAt: null,
  lastUsedAt: null,
  useCount: 0
});

const NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

class CustomCommandsService {
  constructor(reservedNames = []) {
    this.reservedNames = new Set(reservedNames.map(n => String(n).toLowerCase()));
    this.cooldowns = new Map();
  }

  _load() {
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } catch (err) {
        console.error('[CustomCommands] Config load error:', err.message);
        return { guilds: {} };
      }
    }
    return { guilds: {} };
  }

  _save(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  _getCommandsMap(guildId) {
    const config = this._load();
    if (!config.guilds[guildId]) {
      config.guilds[guildId] = getGuildConfig(guildId);
    }
    return config.guilds[guildId].customCommandsData || {};
  }

  _setCommandsMap(guildId, commandsMap) {
    const config = this._load();
    if (!config.guilds[guildId]) {
      config.guilds[guildId] = getGuildConfig(guildId);
    }
    config.guilds[guildId].customCommandsData = commandsMap;
    this._save(config);
  }

  _validateName(name) {
    const str = String(name).trim();
    if (!str) return 'Command name is required';
    if (str.length < 2) return 'Command name must be at least 2 characters';
    if (str.length > 32) return 'Command name must be 32 characters or less';
    if (!NAME_REGEX.test(str)) return 'Command name can only contain letters, numbers, dashes, and underscores';
    if (str.startsWith('-') || str.startsWith('_')) return 'Command name cannot start with a dash or underscore';
    return null;
  }

  _normalizeCommand(cmd) {
    if (!cmd || typeof cmd !== 'object') return null;
    return {
      ...DEFAULT_COMMAND,
      ...cmd,
      name: String(cmd.name || '').trim(),
      createdAt: cmd.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  async getAll(guildId) {
    const commands = this._getCommandsMap(guildId);
    return Object.values(commands)
      .map(cmd => this._normalizeCommand(cmd))
      .filter(Boolean);
  }

  async get(guildId, name) {
    const commands = this._getCommandsMap(guildId);
    const key = String(name).toLowerCase();
    const cmd = commands[key];
    if (!cmd) return null;
    return this._normalizeCommand(cmd);
  }

  async create(guildId, commandData) {
    const name = String(commandData.name).trim();
    const validationError = this._validateName(name);
    if (validationError) {
      throw new Error(validationError);
    }

    const key = name.toLowerCase();
    if (this.reservedNames.has(key)) {
      throw new Error(`"${name}" is a reserved bot command name`);
    }

    const commands = this._getCommandsMap(guildId);
    if (commands[key]) {
      throw new Error(`Custom command "${name}" already exists`);
    }

    const newCmd = this._normalizeCommand({
      name,
      response: commandData.response || '',
      enabled: commandData.enabled ?? true,
      allowedRoles: Array.isArray(commandData.allowedRoles) ? commandData.allowedRoles : [],
      cooldown: typeof commandData.cooldown === 'number' ? commandData.cooldown : 0,
      aliases: Array.isArray(commandData.aliases) ? commandData.aliases : [],
      description: typeof commandData.description === 'string' ? commandData.description : '',
      category: typeof commandData.category === 'string' ? commandData.category : 'general',
      createdAt: new Date().toISOString()
    });

    commands[key] = newCmd;
    this._setCommandsMap(guildId, commands);
    return newCmd;
  }

  async update(guildId, name, updates) {
    if (!updates || typeof updates !== 'object') {
      throw new Error('Invalid updates object');
    }

    const commands = this._getCommandsMap(guildId);
    const oldKey = String(name).toLowerCase();
    const existing = commands[oldKey];
    if (!existing) {
      throw new Error(`Custom command "${name}" not found`);
    }

    if (updates.name && String(updates.name).trim() !== name) {
      const newName = String(updates.name).trim();
      const validationError = this._validateName(newName);
      if (validationError) {
        throw new Error(validationError);
      }
      const newKey = newName.toLowerCase();
      if (this.reservedNames.has(newKey)) {
        throw new Error(`"${newName}" is a reserved bot command name`);
      }
      if (commands[newKey] && newKey !== oldKey) {
        throw new Error(`Custom command "${newName}" already exists`);
      }
      delete commands[oldKey];
      commands[newKey] = {
        ...existing,
        ...updates,
        name: newName,
        updatedAt: new Date().toISOString()
      };
    } else {
      commands[oldKey] = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };
    }

    this._setCommandsMap(guildId, commands);
    return this._normalizeCommand(commands[updates.name ? String(updates.name).toLowerCase() : oldKey]);
  }

  async delete(guildId, name) {
    const commands = this._getCommandsMap(guildId);
    const key = String(name).toLowerCase();
    if (!commands[key]) {
      throw new Error(`Custom command "${name}" not found`);
    }
    delete commands[key];
    this._setCommandsMap(guildId, commands);
    return { success: true };
  }

  async toggle(guildId, name) {
    const commands = this._getCommandsMap(guildId);
    const key = String(name).toLowerCase();
    const cmd = commands[key];
    if (!cmd) {
      throw new Error(`Custom command "${name}" not found`);
    }
    commands[key] = {
      ...cmd,
      enabled: !cmd.enabled,
      updatedAt: new Date().toISOString()
    };
    this._setCommandsMap(guildId, commands);
    return this._normalizeCommand(commands[key]);
  }

  findMatch(guildId, input) {
    const commands = this._getCommandsMap(guildId);
    const lowerInput = String(input).toLowerCase();

    const direct = commands[lowerInput];
    if (direct && direct.enabled) {
      return this._normalizeCommand(direct);
    }

    for (const cmd of Object.values(commands)) {
      if (!cmd || !cmd.enabled) continue;
      if (Array.isArray(cmd.aliases)) {
        if (cmd.aliases.some(a => String(a).toLowerCase() === lowerInput)) {
          return this._normalizeCommand(cmd);
        }
      }
    }

    return null;
  }

  async getCategories(guildId) {
    const commands = await this.getAll(guildId);
    const categories = new Set();
    commands.forEach(cmd => {
      if (cmd && cmd.category) categories.add(cmd.category);
    });
    return Array.from(categories).sort();
  }

  recordUsage(guildId, commandName) {
    const commands = this._getCommandsMap(guildId);
    const key = String(commandName).toLowerCase();
    const cmd = commands[key];
    if (!cmd) return;
    commands[key] = {
      ...cmd,
      lastUsedAt: new Date().toISOString(),
      useCount: (cmd.useCount || 0) + 1
    };
    this._setCommandsMap(guildId, commands);
  }
}

module.exports = { CustomCommandsService };
