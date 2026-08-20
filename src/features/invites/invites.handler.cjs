const { Events } = require('discord.js');
const invitesService = require('./invites.service.cjs');

const guildInviteCache = new Map();

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    guildInviteCache.set(guild.id, new Map(invites.map(inv => [inv.code, inv])));
  } catch (err) {
    console.error(`Failed to cache invites for guild ${guild.id}:`, err.message);
  }
}

function findUsedInvite(guild, oldInvites, newInvites) {
  for (const [code, newInvite] of newInvites) {
    const oldInvite = oldInvites.get(code);
    if (!oldInvite) continue;

    if (newInvite.uses > oldInvite.uses) {
      return newInvite;
    }
  }
  return null;
}

async function handleInviteCreate(guild, invite) {
  const invites = invitesService.getInvites(guild.id);
  if (!invites.enabled) return;

  invitesService.trackInvite(guild.id, invite);

  const cache = guildInviteCache.get(guild.id) || new Map();
  cache.set(invite.code, invite);
  guildInviteCache.set(guild.id, cache);
}

async function handleInviteDelete(guild, invite) {
  const invites = invitesService.getInvites(guild.id);
  if (!invites.enabled) return;

  invitesService.removeInvite(guild.id, invite.code);

  const cache = guildInviteCache.get(guild.id);
  if (cache) {
    cache.delete(invite.code);
  }
}

async function handleGuildMemberAdd(member) {
  const invites = invitesService.getInvites(member.guild.id);
  if (!invites.enabled) return;

  let oldCache = guildInviteCache.get(member.guild.id);
  if (!oldCache) {
    await cacheGuildInvites(member.guild);
    oldCache = guildInviteCache.get(member.guild.id);
  }

  if (!oldCache) return;

  try {
    const newInvites = await member.guild.invites.fetch();
    const newCache = new Map(newInvites.map(inv => [inv.code, inv]));
    const usedInvite = findUsedInvite(member.guild, oldCache, newCache);

    if (usedInvite) {
      invitesService.recordJoin(member.guild.id, usedInvite.code, member.id);
    } else {
      const vanity = await member.guild.fetchVanityData().catch(() => null);
      if (vanity?.code) {
        invitesService.recordJoin(member.guild.id, vanity.code, member.id);
      }
    }

    guildInviteCache.set(member.guild.id, newCache);
  } catch (err) {
    console.error(`Invite tracking error for guild ${member.guild.id}:`, err.message);
  }
}

async function handleGuildMemberRemove(member) {
  const invites = invitesService.getInvites(member.guild.id);
  if (!invites.enabled) return;

  invitesService.recordLeave(member.guild.id, member.id);
}

async function syncGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    for (const invite of invites.values()) {
      invitesService.trackInvite(guild.id, invite);
    }
    await cacheGuildInvites(guild);
    return { success: true, count: invites.size };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function registerHandlers(client) {
  client.on(Events.GuildCreate, async (guild) => {
    await cacheGuildInvites(guild);
  });

  client.on(Events.InviteCreate, async (invite) => {
    await handleInviteCreate(invite.guild, invite);
  });

  client.on(Events.InviteDelete, async (invite) => {
    await handleInviteDelete(invite.guild, invite);
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    await handleGuildMemberAdd(member);
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    await handleGuildMemberRemove(member);
  });
}

module.exports = {
  registerHandlers,
  cacheGuildInvites,
  syncGuildInvites,
  handleInviteCreate,
  handleInviteDelete,
  handleGuildMemberAdd,
  handleGuildMemberRemove,
  findUsedInvite
};
