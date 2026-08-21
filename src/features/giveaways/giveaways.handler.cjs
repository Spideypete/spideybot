const { Events, EmbedBuilder } = require('discord.js');
const giveawaysService = require('./giveaways.service.cjs');

const CHECK_INTERVAL = 30 * 1000;
let checkInterval = null;

async function checkExpiredGiveaways() {
  try {
    const config = require('../../../config.json');
    const guildIds = Object.keys(config.guilds || {});

    for (const guildId of guildIds) {
      const giveaways = giveawaysService.getActive(guildId);
      const now = Date.now();

      for (const giveaway of giveaways) {
        const createdAt = new Date(giveaway.createdAt).getTime();
        const durationMs = (giveaway.duration || 60) * 60 * 1000;
        const endsAt = createdAt + durationMs;

        if (now >= endsAt) {
          await endGiveaway(guildId, giveaway);
        }
      }
    }
  } catch (err) {
    console.error('Giveaway check error:', err.message);
  }
}

async function endGiveaway(guildId, giveaway) {
  const ended = giveawaysService.endGiveaway(guildId, giveaway.id);
  if (!ended) return;

  const guild = global.client?.guilds?.cache?.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(giveaway.channelId);
  if (!channel) return;

  const winnerMentions = ended.winnerIds.map(id => `<@${id}>`).join(', ') || 'No winners';
  const winnerText = ended.winnerIds.length > 0 ? winnerMentions : 'No entries';

  try {
    if (giveaway.messageId) {
      const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
      if (message) {
        const embed = message.embeds[0];
        if (embed) {
          const updated = new EmbedBuilder(embed)
            .setTitle('🎁 Giveaway Ended')
            .setDescription(`**${ended.prize}**\n\nWinners: ${winnerText}`)
            .setFooter({ text: `SPIDEY BOT • Ended: ${new Date().toLocaleString()}` })
            .setColor('#ED4245');
          await message.edit({ embeds: [updated], content: null }).catch(() => {});
        }
      }
    }

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle('🎁 Giveaway Ended')
          .setDescription(`**${ended.prize}**\n\nWinners: ${winnerText}`)
          .setTimestamp()
      ]
    }).catch(() => {});
  } catch (err) {
    console.error('Failed to announce giveaway winners:', err.message);
  }
}

async function handleReactionAdd(reaction, user) {
  if (user.bot) return;
  if (reaction.partial) { try { await reaction.fetch(); } catch (e) { return; } }
  if (reaction.message.partial) { try { await reaction.message.fetch(); } catch (e) { return; } }

  const message = reaction.message;
  const guildId = message.guild?.id;
  if (!guildId) return;

  const config = require('../../../config.json');
  const giveaways = config.guilds[guildId]?.giveaways || {};

  for (const [id, giveaway] of Object.entries(giveaways)) {
    if (giveaway.messageId === message.id && giveaway.status === 'active') {
      if (reaction.emoji.name === '🎁' || reaction.emoji.name === '🎉') {
        giveawaysService.addEntry(guildId, id, user.id);
      }
      break;
    }
  }
}

async function handleReactionRemove(reaction, user) {
  if (user.bot) return;
  if (reaction.partial) { try { await reaction.fetch(); } catch (e) { return; } }
  if (reaction.message.partial) { try { await reaction.message.fetch(); } catch (e) { return; } }

  const message = reaction.message;
  const guildId = message.guild?.id;
  if (!guildId) return;

  const config = require('../../../config.json');
  const giveaways = config.guilds[guildId]?.giveaways || {};

  for (const [id, giveaway] of Object.entries(giveaways)) {
    if (giveaway.messageId === message.id && giveaway.status === 'active') {
      if (reaction.emoji.name === '🎁' || reaction.emoji.name === '🎉') {
        giveawaysService.removeEntry(guildId, id, user.id);
      }
      break;
    }
  }
}

function startChecker() {
  if (checkInterval) return;
  checkExpiredGiveaways();
  checkInterval = setInterval(checkExpiredGiveaways, CHECK_INTERVAL);
}

function stopChecker() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

function registerHandlers(client) {
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    await handleReactionAdd(reaction, user);
  });

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    await handleReactionRemove(reaction, user);
  });

  startChecker();
}

module.exports = {
  registerHandlers,
  startChecker,
  stopChecker,
  checkExpiredGiveaways,
  endGiveaway
};
