const service = require("./reaction-roles.service.cjs");

let registered = false;

function emojiCandidates(emoji) {
  const candidates = new Set();
  if (!emoji) return candidates;
  if (emoji.id) {
    candidates.add(emoji.id);
    candidates.add(`${emoji.name}:${emoji.id}`);
    candidates.add(`<:${emoji.name}:${emoji.id}>`);
    candidates.add(`<a:${emoji.name}:${emoji.id}>`);
  }
  if (emoji.name) candidates.add(emoji.name);
  const str = emoji.toString();
  if (str) candidates.add(str);
  return candidates;
}

function entryMatchesEmoji(entry, emoji) {
  const candidates = emojiCandidates(emoji);
  return candidates.has(entry.emoji);
}

async function resolveMember(guild, userId) {
  try {
    return guild.members.cache.get(userId) || (await guild.members.fetch(userId));
  } catch (e) {
    return null;
  }
}

async function fetchReaction(reaction) {
  try {
    if (reaction.partial) reaction = await reaction.fetch();
    if (reaction.message && reaction.message.partial) {
      reaction.message = await reaction.message.fetch();
    }
    return reaction;
  } catch (e) {
    console.warn("[reaction-roles] Failed to fetch reaction/message:", e.message);
    return null;
  }
}

async function handleReactionAdd(reaction, user) {
  if (user.bot) return;
  const guild = reaction.message.guild;
  if (!guild) return;

  const entries = service.getEntriesForMessage(guild.id, reaction.message.id);
  const entry = entries.find((e) => entryMatchesEmoji(e, reaction.emoji));
  if (!entry) return;

  const member = await resolveMember(guild, user.id);
  if (!member) return;

  const role = guild.roles.cache.get(entry.roleId);
  if (!role) {
    console.warn(
      `[reaction-roles] Skipping assign: role ${entry.roleId} no longer exists in ${guild.id}.`
    );
    return;
  }
  if (member.roles.cache.has(role.id)) return;

  try {
    await member.roles.add(role, "Reaction role assigned");
    console.log(
      `[reaction-roles] Assigned ${role.name} to ${user.tag} in ${guild.name}`
    );
    if (service.getConfig(guild.id).dmConfirmations) {
      await user
        .send(`✅ You've been given the **${role.name}** role in **${guild.name}**!`)
        .catch(() => {});
    }
  } catch (e) {
    console.error("[reaction-roles] Failed to assign role:", e.message);
  }
}

async function handleReactionRemove(reaction, user) {
  if (user.bot) return;
  const guild = reaction.message.guild;
  if (!guild) return;

  const entries = service.getEntriesForMessage(guild.id, reaction.message.id);
  const entry = entries.find((e) => entryMatchesEmoji(e, reaction.emoji));
  if (!entry) return;

  const member = await resolveMember(guild, user.id);
  if (!member) return;

  const role = guild.roles.cache.get(entry.roleId);
  if (!role) {
    console.warn(
      `[reaction-roles] Skipping remove: role ${entry.roleId} no longer exists in ${guild.id}.`
    );
    return;
  }
  if (!member.roles.cache.has(role.id)) return;

  try {
    await member.roles.remove(role, "Reaction role removed");
    console.log(
      `[reaction-roles] Removed ${role.name} from ${user.tag} in ${guild.name}`
    );
    if (service.getConfig(guild.id).dmConfirmations) {
      await user
        .send(`➖ Your **${role.name}** role in **${guild.name}** has been removed.`)
        .catch(() => {});
    }
  } catch (e) {
    console.error("[reaction-roles] Failed to remove role:", e.message);
  }
}

function registerReactionRolesHandler(client) {
  service.setClient(client);
  if (registered) return;
  registered = true;

  client.on("messageReactionAdd", async (reaction, user) => {
    const fetched = await fetchReaction(reaction);
    if (fetched) await handleReactionAdd(fetched, user);
  });

  client.on("messageReactionRemove", async (reaction, user) => {
    const fetched = await fetchReaction(reaction);
    if (fetched) await handleReactionRemove(fetched, user);
  });
}

module.exports = { registerReactionRolesHandler };
