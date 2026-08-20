const { CustomCommandsService } = require('./custom-commands.service.cjs');
const { getGuildConfig } = require('../../config/config-manager.cjs');
const { EmbedBuilder } = require('discord.js');

let service = null;

function initialize(client, configPath, reservedNames = []) {
  service = new CustomCommandsService(reservedNames);

  client.removeAllListeners('messageCreate');
  client.on('messageCreate', handleMessageCreate);
}

async function handleMessageCreate(message) {
  if (!service) return;
  if (message.author.bot) return;
  if (!message.guild) return;

  const guildConfig = getGuildConfig(message.guild.id);
  const prefix = guildConfig.prefix || '/';

  if (!message.content.startsWith(prefix)) return;

  const input = message.content.slice(prefix.length).trim().split(/\s+/)[0];
  if (!input) return;

  const command = service.findMatch(message.guild.id, input);
  if (!command || !command.enabled) return;

  if (command.allowedRoles && command.allowedRoles.length > 0) {
    if (!message.member) return;
    const hasRole = message.member.roles.cache.some(r => command.allowedRoles.includes(r.id));
    if (!hasRole) return;
  }

  const cooldownKey = `${message.guild.id}:${message.author.id}:${command.name}`;
  const now = Date.now();
  if (command.cooldown > 0) {
    const lastUsed = service.cooldowns.get(cooldownKey);
    if (lastUsed && now - lastUsed < command.cooldown * 1000) {
      return;
    }
    service.cooldowns.set(cooldownKey, now);
  }

  const response = typeof command.response === 'string' ? command.response : String(command.response || '');
  if (!response) return;

  try {
    await message.channel.send(response);
  } catch (err) {
    console.error(`[CustomCommands] Failed to send response for "${command.name}":`, err.message);
    return;
  }

  service.recordUsage(message.guild.id, command.name);

  const logChannelId = guildConfig.customCommandLogChannelId;
  if (logChannelId) {
    const logChannel = message.guild.channels.cache.get(logChannelId);
    if (logChannel) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('Custom Command Used')
            .addFields(
              { name: 'Command', value: command.name, inline: true },
              { name: 'User', value: message.author.toString(), inline: true },
              { name: 'Channel', value: message.channel.toString(), inline: true }
            )
            .setTimestamp()
        ]
      }).catch(() => {});
    }
  }
}

module.exports = {
  initialize,
  handleMessageCreate
};
