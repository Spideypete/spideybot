const { ConfigManager, DEFAULT_GUILD_CONFIG } = require('./config-manager.cjs')

class Storage {
  constructor(configManager) {
    this.configManager = configManager
  }

  async get(guildId, feature, key) {
    const guildConfig = await this.configManager.getGuildConfig(guildId)
    const featureData = guildConfig[feature]
    if (!featureData || typeof featureData !== 'object') return undefined
    return key ? featureData[key] : featureData
  }

  async set(guildId, feature, key, value) {
    const guildConfig = await this.configManager.getGuildConfig(guildId)
    if (!isPlainObject(guildConfig[feature])) {
      guildConfig[feature] = {}
    }
    guildConfig[feature][key] = value
    await this.configManager.setGuildConfig(guildId, guildConfig)
  }

  async setMany(guildId, feature, values) {
    if (!isPlainObject(values)) {
      throw new TypeError('Values must be a plain object')
    }
    const guildConfig = await this.configManager.getGuildConfig(guildId)
    if (!isPlainObject(guildConfig[feature])) {
      guildConfig[feature] = {}
    }
    Object.assign(guildConfig[feature], values)
    await this.configManager.setGuildConfig(guildId, guildConfig)
  }

  async delete(guildId, feature, key) {
    const guildConfig = await this.configManager.getGuildConfig(guildId)
    const featureData = guildConfig[feature]
    if (featureData && key in featureData) {
      delete featureData[key]
      await this.configManager.setGuildConfig(guildId, guildConfig)
    }
  }

  async getAll(guildId, feature) {
    const guildConfig = await this.configManager.getGuildConfig(guildId)
    const featureData = guildConfig[feature]
    if (!featureData || typeof featureData !== 'object') return {}
    return { ...featureData }
  }

  async clear(guildId, feature) {
    const guildConfig = await this.configManager.getGuildConfig(guildId)
    guildConfig[feature] = {}
    await this.configManager.setGuildConfig(guildId, guildConfig)
  }

  async has(guildId, feature, key) {
    const guildConfig = await this.configManager.getGuildConfig(guildId)
    const featureData = guildConfig[feature]
    return !!(featureData && key in featureData)
  }
}

function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) return false
  if (Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === null || proto === Object.prototype
}

module.exports = { Storage }
