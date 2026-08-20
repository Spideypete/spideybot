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

  if (!levelsService.canGainXp(guildId, userId, XP_COOLDOWN)) return;

  const xpGain = config.xpPerMessage || 15;
  const result = levelsService.addXp(guildId, userId, xpGain);

  if (result.leveledUp) {
    await handleLevelUp(message.guild, message.member, result.level, config);
  }
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

function registerHandlers(client) {
  client.on(Events.MessageCreate, async (message) => {
    await handleMessageCreate(message);
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
