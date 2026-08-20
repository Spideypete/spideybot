const fs = require('fs')
const path = require('path')
const { loadConfig, saveConfig, getGuildConfig, setGuildConfig, DEFAULT_GUILD_CONFIG } = require('../../config/config-manager.cjs')

const DEFAULT_SERVER_MESSAGES = Object.freeze({
  enableWelcome: false,
  welcomeMessage: 'Welcome {user} to {server}! 🎉',
  welcomeChannel: null,
  welcomeEmbed: null,
  enableGoodbye: false,
  goodbyeMessage: '{user} has left {server}. 👋',
  goodbyeChannel: null,
  goodbyeEmbed: null,
  enableBoost: false,
  boostMessage: '🎉 {user} boosted {server}! Thank you!',
  boostChannel: null,
  boostEmbed: null
})

const VARIABLE_PATTERNS = Object.freeze({
  '{user}': (member) => member?.toString() || '',
  '{username}': (member) => member?.user?.username || '',
  '{displayname}': (member) => member?.displayName || '',
  '{server}': (_, guild) => guild?.name || '',
  '{membercount}': (_, guild) => guild?.memberCount?.toString() || '',
  '{userMention}': (member) => member?.toString() || '',
  '{userTag}': (member) => member?.user?.tag || '',
  '{userId}': (member) => member?.user?.id || '',
  '{userAvatar}': (member) => member?.user?.displayAvatarURL?.() || '',
  '{serverIcon}': (_, guild) => guild?.iconURL?.() || '',
  '{boostCount}': (_, guild) => guild?.premiumSubscriptionCount?.toString() || '0',
  '{boosterCount}': (_, guild) => guild?.premiumSubscriptionCount?.toString() || '0',
  '{serverId}': (_, guild) => guild?.id || ''
})

class ServerMessagesService {
  constructor(configPath) {
    this.configPath = path.resolve(configPath || path.join(process.cwd(), 'config.json'))
  }

  _load() {
    if (fs.existsSync(this.configPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'))
      } catch (err) {
        console.error('Config load error:', err.message)
        return { guilds: {} }
      }
    }
    return { guilds: {} }
  }

  _save(config) {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2))
  }

  _getDefaults() {
    return { ...DEFAULT_SERVER_MESSAGES }
  }

  async getConfig(guildId) {
    const guildConfig = getGuildConfig(guildId)
    const defaults = this._getDefaults()
    const stored = guildConfig.serverMessages || {}
    return { ...defaults, ...stored }
  }

  async setConfig(guildId, config) {
    const defaults = this._getDefaults()
    const merged = { ...defaults, ...config }
    const fullConfig = this._load()
    if (!fullConfig.guilds) fullConfig.guilds = {}
    const guildConfig = getGuildConfig(guildId)
    guildConfig.serverMessages = merged
    fullConfig.guilds[guildId] = guildConfig
    this._save(fullConfig)
    return merged
  }

  async setWelcome(guildId, message, channel, enabled, embed) {
    const config = await this.getConfig(guildId)
    const updates = {
      enableWelcome: enabled !== undefined ? enabled : true,
      welcomeMessage: message,
      welcomeChannel: channel
    }
    if (embed !== undefined) {
      updates.welcomeEmbed = embed
    }
    return this.setConfig(guildId, { ...config, ...updates })
  }

  async setGoodbye(guildId, message, channel, enabled, embed) {
    const config = await this.getConfig(guildId)
    const updates = {
      enableGoodbye: enabled !== undefined ? enabled : true,
      goodbyeMessage: message,
      goodbyeChannel: channel
    }
    if (embed !== undefined) {
      updates.goodbyeEmbed = embed
    }
    return this.setConfig(guildId, { ...config, ...updates })
  }

  async setBoost(guildId, message, channel, enabled, embed) {
    const config = await this.getConfig(guildId)
    const updates = {
      enableBoost: enabled !== undefined ? enabled : true,
      boostMessage: message,
      boostChannel: channel
    }
    if (embed !== undefined) {
      updates.boostEmbed = embed
    }
    return this.setConfig(guildId, { ...config, ...updates })
  }

  replaceVariables(text, member, guild, extraVars = {}) {
    if (!text || typeof text !== 'string') return ''
    let result = text

    for (const [pattern, resolver] of Object.entries(VARIABLE_PATTERNS)) {
      const replacement = resolver(member, guild, extraVars)
      result = result.replace(new RegExp(pattern.replace(/[{}]/g, '\\$&'), 'g'), replacement)
    }

    result = result.replace(/\{[^}]+\}/g, '')
    return result
  }

  buildEmbed(embedConfig, member, guild) {
    if (!embedConfig || typeof embedConfig !== 'object') return null

    const { EmbedBuilder } = require('discord.js')
    const embed = new EmbedBuilder()

    if (embedConfig.title) {
      embed.setTitle(this.replaceVariables(embedConfig.title, member, guild))
    }
    if (embedConfig.description) {
      embed.setDescription(this.replaceVariables(embedConfig.description, member, guild))
    }
    if (embedConfig.color) {
      const color = typeof embedConfig.color === 'string'
        ? parseInt(embedConfig.color.replace('#', ''), 16)
        : embedConfig.color
      if (!isNaN(color)) embed.setColor(color)
    }
    if (embedConfig.thumbnail) {
      const thumb = this.replaceVariables(embedConfig.thumbnail, member, guild)
      if (thumb) embed.setThumbnail(thumb)
    }
    if (embedConfig.image) {
      const img = this.replaceVariables(embedConfig.image, member, guild)
      if (img) embed.setImage(img)
    }
    if (embedConfig.footer) {
      embed.setFooter({ text: this.replaceVariables(embedConfig.footer, member, guild) })
    }
    if (embedConfig.author) {
      const authorName = this.replaceVariables(embedConfig.author.name, member, guild)
      const authorIcon = embedConfig.author.iconURL
        ? this.replaceVariables(embedConfig.author.iconURL, member, guild)
        : undefined
      embed.setAuthor({ name: authorName, iconURL: authorIcon })
    }

    return embed
  }

  async getWelcomeMessage(guildId, member) {
    const config = await this.getConfig(guildId)
    if (!config.enableWelcome || !config.welcomeChannel) return null

    return {
      message: this.replaceVariables(config.welcomeMessage, member, member.guild),
      channelId: config.welcomeChannel,
      embed: this.buildEmbed(config.welcomeEmbed, member, member.guild),
      enabled: config.enableWelcome
    }
  }

  async getGoodbyeMessage(guildId, member) {
    const config = await this.getConfig(guildId)
    if (!config.enableGoodbye || !config.goodbyeChannel) return null

    return {
      message: this.replaceVariables(config.goodbyeMessage, member, member.guild),
      channelId: config.goodbyeChannel,
      embed: this.buildEmbed(config.goodbyeEmbed, member, member.guild),
      enabled: config.enableGoodbye
    }
  }

  async getBoostMessage(guildId, member) {
    const config = await this.getConfig(guildId)
    if (!config.enableBoost || !config.boostChannel) return null

    return {
      message: this.replaceVariables(config.boostMessage, member, member.guild),
      channelId: config.boostChannel,
      embed: this.buildEmbed(config.boostEmbed, member, member.guild),
      enabled: config.enableBoost
    }
  }

  async disable(guildId, type) {
    const config = await this.getConfig(guildId)
    const key = `enable${type.charAt(0).toUpperCase() + type.slice(1)}`
    const updates = { [key]: false }
    return this.setConfig(guildId, { ...config, ...updates })
  }
}

module.exports = { ServerMessagesService, DEFAULT_SERVER_MESSAGES }
