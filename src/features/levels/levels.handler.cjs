const { Events, EmbedBuilder } = require('discord.js');
const levelsService = require('./levels.service.cjs');

const XP_COOLDOWN = 60 * 1000;
const memberLevelCache = new Map();

function getMemberCacheKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

async function handleMessageCreate(message) {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.content.startsWith('/')) return;

  const guildId = message.guild.id;
  const userId = message.author.id;

  const config = levelsService.getConfig(guildId);
  if (!config || config.enabled === false) return;

  let leveledResult = null;
  if (levelsService.canGainXp(guildId, userId, XP_COOLDOWN)) {
    const xpGain = Math.max(0, Number(config.xpPerMessage ?? 15));
    if (xpGain > 0) leveledResult = levelsService.addXp(guildId, userId, xpGain);
  }
  // Bonus XP is awarded once per eligible message and capped to discourage emoji spam.
  if (config.emojiXpEnabled === true && message.content) {
    const unicodeEmojiCount = (message.content.match(/\p{Extended_Pictographic}/gu) || []).length;
    const customEmojiCount = (message.content.match(/<a?:[A-Za-z0-9_]+:\d+>/g) || []).length;
    const emojiCount = Math.min(20, unicodeEmojiCount + customEmojiCount);
    const perEmoji = Math.max(0, Number(config.emojiXpPerMessage ?? 2));
    const cap = Math.max(0, Number(config.maxEmojiXpPerMessage ?? 6));
    const bonusXp = Math.min(cap, emojiCount * perEmoji);
    if (bonusXp > 0) {
      const bonusResult = levelsService.addXp(guildId, userId, bonusXp);
      if (bonusResult.leveledUp) leveledResult = bonusResult;
    }
  }
  if (leveledResult?.leveledUp) await handleLevelUp(message.guild, message.member, leveledResult.level, config);
}

async function handleLevelUp(guild, member, newLevel, config) {
  if (!member || !guild) return;

  const key = getMemberCacheKey(guild.id, member.id);
  memberLevelCache.set(key, newLevel);

  if (config.announceLevelUps !== false) {
    const channelId = config.announcementChannel;
    let announced = false;

    if (channelId) {
      const channel = guild.channels.cache.get(channelId);
      if (channel) {
        try {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor('#9151ff')
                .setTitle('🎉 Level Up!')
                .setDescription(`${member} just reached **Level ${newLevel}**!`)
                .setTimestamp()
            ]
          });
          announced = true;
        } catch (err) {
          console.error('Failed to send level up announcement:', err.message);
        }
      }
    }

    if (!announced) {
      try {
        await member.send(`🎉 You just reached **Level ${newLevel}** in **${guild.name}**!`);
      } catch (err) {
        // DMs may be disabled
      }
    }
  }

  await assignLevelRole(guild, member, newLevel, config);
  await updateNickname(guild, member, newLevel, config);
}

async function assignLevelRole(guild, member, level, config) {
  if (!member || !guild) return;
  const levelRoles = config.levelRoles || {};
  const keepOld = guild.keepOldLevelRoles !== false;

  try {
    if (!keepOld) {
      for (let lvl = 1; lvl < level; lvl++) {
        const roleId = levelRoles[`level_${lvl}`];
        if (roleId && member.roles.cache.has(roleId)) {
          const role = guild.roles.cache.get(roleId);
          if (role) await member.roles.remove(role).catch(() => {});
        }
      }
    }

    const newRoleId = levelRoles[`level_${level}`];
    if (newRoleId) {
      const role = guild.roles.cache.get(newRoleId);
      if (role) await member.roles.add(role).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to assign level role:', err.message);
  }
}

async function updateNickname(guild, member, level, config) {
  if (!member || !guild || config.autoNickname !== true) return;

  try {
    const template = config.nicknameTemplate || '{name} {level}';
    const nick = template
      .replace(/{name}/g, member.displayName || member.user.username)
      .replace(/{level}/g, String(level));

    if (member.manageable) {
      await member.setNickname(nick).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to update nickname:', err.message);
  }
}

async function handleGuildMemberUpdate(oldMember, newMember) {
  if (!oldMember || !newMember) return;
  if (!newMember.guild) return;

  const oldLevel = memberLevelCache.get(getMemberCacheKey(newMember.guild.id, oldMember.id)) || 0;
  const newLevel = memberLevelCache.get(getMemberCacheKey(newMember.guild.id, newMember.id)) || oldLevel;

  if (newLevel > oldLevel && newLevel !== oldLevel) {
    const config = levelsService.getConfig(newMember.guild.id);
    await assignLevelRole(newMember.guild, newMember, newLevel, config);
    await updateNickname(newMember.guild, newMember, newLevel, config);
  }
}

const voiceIntervals = new Map();
function voiceKey(guildId, userId) { return `${guildId}:${userId}`; }
function stopVoiceXp(guildId, userId) {
  const key = voiceKey(guildId, userId), timer = voiceIntervals.get(key);
  if (timer) clearInterval(timer);
  voiceIntervals.delete(key);
}
function startVoiceXp(member) {
  if (!member?.guild || member.user?.bot || !member.voice?.channelId) return;
  const guildId = member.guild.id, userId = member.id;
  stopVoiceXp(guildId, userId);
  const config = levelsService.getConfig(guildId);
  if (!config || config.enabled === false || config.voiceXpEnabled !== true) return;
  const intervalMinutes = Math.max(1, Number(config.voiceXpIntervalMinutes ?? 5));
  const timer = setInterval(async () => {
    try {
      const current = member.guild.members.cache.get(userId);
      if (!current || current.user.bot || !current.voice.channelId || current.voice.selfDeaf || current.voice.serverDeaf) { stopVoiceXp(guildId, userId); return; }
      const latest = levelsService.getConfig(guildId);
      if (latest.enabled === false || latest.voiceXpEnabled !== true) { stopVoiceXp(guildId, userId); return; }
      const amount = Math.max(0, Number(latest.voiceXpPerInterval ?? 5));
      if (!amount) return;
      const result = levelsService.addXp(guildId, userId, amount);
      if (result.leveledUp) await handleLevelUp(current.guild, current, result.level, latest);
    } catch (err) { console.error('[LEVELS VOICE XP]', err.message); }
  }, intervalMinutes * 60 * 1000);
  voiceIntervals.set(voiceKey(guildId, userId), timer);
}

function registerHandlers(client) {
  client.on(Events.MessageCreate, async (message) => {
    await handleMessageCreate(message);
  });
  client.on(Events.VoiceStateUpdate, (_oldState, newState) => {
    const member = newState.member;
    if (!member) return;
    if (!newState.channelId) stopVoiceXp(newState.guild.id, member.id);
    else startVoiceXp(member);
  });
  client.on(Events.ClientReady, () => {
    for (const guild of client.guilds.cache.values()) for (const state of guild.voiceStates.cache.values()) if (state.channelId && state.member) startVoiceXp(state.member);
  });

  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    await handleGuildMemberUpdate(oldMember, newMember);
  });
}

module.exports = {
  registerHandlers,
  handleMessageCreate,
  handleGuildMemberUpdate,
  handleLevelUp,
  XP_COOLDOWN
};
