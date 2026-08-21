const { EmbedBuilder } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../../config/config-manager.cjs');

class LoggingService {
  _getLoggingConfig(guildId) {
    const guildConfig = getGuildConfig(guildId);
    return guildConfig.logging || {};
  }

  getConfig(guildId) {
    const logging = this._getLoggingConfig(guildId);
    return {
      messageLogging: logging.messageLogging || { enabled: false, logDeleted: true, logEdited: true, logBulkDelete: true, logChannel: null },
      moderationLogging: logging.moderationLogging || { enabled: false, logChannel: null, logWarns: true, logKicks: true, logBans: true, logMutes: true }
    };
  }

  setConfig(guildId, config) {
    const logging = this._getLoggingConfig(guildId);
    const updated = { ...logging, ...config };
    updateGuildConfig(guildId, { logging: updated });
    return this.getConfig(guildId);
  }

  shouldLogMessageDelete(guildId) {
    const config = this.getConfig(guildId);
    return config.messageLogging.enabled !== false && config.messageLogging.logDeleted && config.messageLogging.logChannel;
  }

  shouldLogMessageEdit(guildId) {
    const config = this.getConfig(guildId);
    return config.messageLogging.enabled !== false && config.messageLogging.logEdited && config.messageLogging.logChannel;
  }

  shouldLogBulkDelete(guildId) {
    const config = this.getConfig(guildId);
    return config.messageLogging.enabled !== false && config.messageLogging.logBulkDelete && config.messageLogging.logChannel;
  }

  getMessageLogChannel(guildId) {
    const config = this.getConfig(guildId);
    return config.messageLogging.logChannel;
  }

  getModLogChannel(guildId) {
    const config = this.getConfig(guildId);
    return config.moderationLogging.logChannel;
  }

  shouldLogModAction(guildId, action) {
    const config = this.getConfig(guildId);
    if (!config.moderationLogging.enabled || !config.moderationLogging.logChannel) return false;
    const toggleMap = { WARN: 'logWarns', KICK: 'logKicks', BAN: 'logBans', MUTE: 'logMutes', UNMUTE: 'logMutes' };
    const toggleKey = toggleMap[action];
    return toggleKey ? config.moderationLogging[toggleKey] !== false : true;
  }

  async logMessageDelete(guild, message, deleter = 'Unknown') {
    if (!this.shouldLogMessageDelete(guild.id)) return;
    const logChannel = guild.channels.cache.get(this.getMessageLogChannel(guild.id));
    if (!logChannel) return;

    const content = message.content || '*No text content*';
    const attachmentCount = message.attachments?.size || 0;

    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle('🗑️ Message Deleted')
      .addFields(
        { name: 'Author', value: message.author?.tag || 'Unknown', inline: true },
        { name: 'Deleted By', value: deleter, inline: true },
        { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
        { name: 'Message ID', value: message.id, inline: true },
        { name: 'Content', value: content.substring(0, 1000) }
      )
      .setFooter({ text: attachmentCount > 0 ? `Attachments: ${attachmentCount}` : '' })
      .setTimestamp();

    const jumpLink = `[Jump to message](https://discord.com/channels/${guild.id}/${message.channel.id}/${message.id})`;
    embed.addFields({ name: 'Link', value: jumpLink });

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }

  async logMessageEdit(guild, oldMessage, newMessage) {
    if (!this.shouldLogMessageEdit(guild.id)) return;
    const logChannel = guild.channels.cache.get(this.getMessageLogChannel(guild.id));
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor(0xFFBD39)
      .setTitle('✏️ Message Edited')
      .addFields(
        { name: 'Author', value: newMessage.author?.tag || 'Unknown', inline: true },
        { name: 'Channel', value: `<#${newMessage.channel.id}>`, inline: true },
        { name: 'Message ID', value: newMessage.id, inline: true },
        { name: 'Before', value: (oldMessage.content || '*empty*').substring(0, 500) },
        { name: 'After', value: (newMessage.content || '*empty*').substring(0, 500) }
      )
      .setTimestamp();

    const jumpLink = `[Jump to message](https://discord.com/channels/${guild.id}/${newMessage.channel.id}/${newMessage.id})`;
    embed.addFields({ name: 'Link', value: jumpLink });

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }

  async logBulkDelete(guild, messages) {
    if (!this.shouldLogBulkDelete(guild.id)) return;
    const logChannel = guild.channels.cache.get(this.getMessageLogChannel(guild.id));
    if (!logChannel) return;

    const first = messages.first();
    let deleter = 'Unknown';
    try {
      const auditLogs = await guild.fetchAuditLogs({ type: 'MESSAGE_BULK_DELETE', limit: 1 });
      const deleteEntry = auditLogs.entries.first();
      if (deleteEntry) deleter = deleteEntry.executor.tag;
    } catch (e) { /* Audit log may not be available */ }

    const msgPreviews = messages.first(5).map(m => m.content?.substring(0, 100) || '*image/attachment*').join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🗑️ Bulk Message Delete')
      .addFields(
        { name: 'Deleted By', value: deleter, inline: true },
        { name: 'Channel', value: `<#${first.channel.id}>`, inline: true },
        { name: 'Total Messages', value: `${messages.size}`, inline: true },
        { name: 'Message IDs', value: messages.map(m => m.id).slice(0, 5).join('\n'), inline: false }
      )
      .setTimestamp();

    if (msgPreviews) {
      embed.addFields({ name: 'Recent Messages (preview)', value: msgPreviews.substring(0, 500) });
    }

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = { LoggingService };
