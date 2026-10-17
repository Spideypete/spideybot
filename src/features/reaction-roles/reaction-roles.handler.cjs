const { PermissionFlagsBits } = require("discord.js");
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

async function sendConfiguredNotice(guild, settings, message, isError = false) {
  if (!guild || !settings?.notificationChannelId) return false;
  if (isError ? !settings.errorReporting : !settings.updateNotifications) return false;
  try {
    const channel = guild.channels.cache.get(String(settings.notificationChannelId))
      || await guild.channels.fetch(String(settings.notificationChannelId)).catch(() => null);
    if (!channel?.isTextBased?.() || typeof channel.send !== "function") {
      console.warn("[reaction-roles] Configured notification channel is missing or not text-based.");
      return false;
    }
    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (me && channel.permissionsFor(me)?.has("SendMessages") === false) {
      console.warn("[reaction-roles] Bot cannot send messages in the configured notification channel.");
      return false;
    }
    await channel.send({ content: message.slice(0, 1900), allowedMentions: { parse: [] } });
    return true;
  } catch (error) {
    console.warn("[reaction-roles] Could not send configured notice:", error.message);
    return false;
  }
}

async function sendDmConfirmation(user, message, guild, settings) {
  if (!settings?.dmConfirmations && !settings?.dmConfirm) return;
  try {
    await user.send(message);
  } catch (error) {
    console.warn(`[reaction-roles] Could not DM ${user.tag || user.id}; their Discord DMs may be closed: ${error.message}`);
    await sendConfiguredNotice(guild, settings, `⚠️ Role update succeeded for <@${user.id}>, but I could not send the confirmation DM because their DMs may be closed.`, true);
  }
}

async function handleReactionAdd(reaction, user) {
  if (user.bot) return;
  const guild = reaction.message.guild;
  if (!guild) return;

  const settings = service.getConfig(guild.id);
  if (settings.enabled === false) return;
  const entries = service.getEntriesForMessage(guild.id, reaction.message.id);
  const entry = entries.find((e) => entryMatchesEmoji(e, reaction.emoji));
  if (!entry) return;

  const member = await resolveMember(guild, user.id);
  if (!member) return;

  const role = guild.roles.cache.get(entry.roleId) || await guild.roles.fetch(entry.roleId).catch(() => null);
  if (!role) {
    console.warn(`[reaction-roles] Skipping assign: role ${entry.roleId} no longer exists in ${guild.id}.`);
    await sendConfiguredNotice(guild, settings, `❌ Reaction role failed: the configured role no longer exists (role ID ${entry.roleId}).`, true);
    return;
  }
  if (member.roles.cache.has(role.id)) return;

  try {
    const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!botMember) {
      console.error(`[reaction-roles] Cannot assign ${role.name}: could not resolve the bot member in ${guild.name} (${guild.id}).`);
      await sendConfiguredNotice(guild, settings, `❌ Could not assign **${role.name}** to <@${user.id}>: bot member could not be resolved.`, true);
      return;
    }
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      console.error(`[reaction-roles] Cannot assign ${role.name} in ${guild.name}: the bot is missing the Manage Roles permission.`);
      await sendConfiguredNotice(guild, settings, `❌ Could not assign **${role.name}** to <@${user.id}>: SPIDEY BOT needs the **Manage Roles** permission.`, true);
      return;
    }
    if (role.managed || role.position >= botMember.roles.highest.position) {
      console.error(`[reaction-roles] Cannot assign ${role.name} in ${guild.name}: move the SPIDEY BOT role above this role in Server Settings > Roles.`);
      await sendConfiguredNotice(guild, settings, `❌ Could not assign **${role.name}** to <@${user.id}>: move the SPIDEY BOT role above this role in Server Settings → Roles.`, true);
      return;
    }
    if (settings.allowMultiple === false) {
      const otherRoleIds = [...new Set(entries.filter(e => e.roleId !== role.id).map(e => e.roleId))].filter(roleId => member.roles.cache.has(roleId));
      if (otherRoleIds.length) await member.roles.remove(otherRoleIds, "Reaction role single-selection mode");
      for (const otherEntry of entries.filter(e => e.emoji !== entry.emoji)) {
        const otherReaction = reaction.message.reactions.cache.find(r => entryMatchesEmoji(otherEntry, r.emoji));
        if (otherReaction) await otherReaction.users.remove(user.id).catch(() => {});
      }
    }
    await member.roles.add(role, "Reaction role assigned");
    console.log(
      `[reaction-roles] Assigned ${role.name} to ${user.tag} in ${guild.name}`
    );
    await sendConfiguredNotice(guild, settings, `✅ <@${user.id}> was given the **${role.name}** role.`);
    await sendDmConfirmation(user, `✅ You've been given the **${role.name}** role in **${guild.name}**!`, guild, settings);
  } catch (e) {
    if (e.code === 50013 || e.code === "50013") {
      console.error(`[reaction-roles] Discord denied assigning ${role.name} in ${guild.name}. Check that SPIDEY BOT has Manage Roles and its highest role is above the target role.`);
    } else {
      console.error("[reaction-roles] Failed to assign role:", e.message);
    }
    await sendConfiguredNotice(guild, settings, `❌ Failed to assign **${role.name}** to <@${user.id}>: ${e.message || "unknown Discord error"}`, true);
  }
}

async function handleReactionRemove(reaction, user) {
  if (user.bot) return;
  const guild = reaction.message.guild;
  if (!guild) return;

  const settings = service.getConfig(guild.id);
  if (settings.enabled === false || settings.removeOnUnreact === false) return;
  const entries = service.getEntriesForMessage(guild.id, reaction.message.id);
  const entry = entries.find((e) => entryMatchesEmoji(e, reaction.emoji));
  if (!entry) return;

  const member = await resolveMember(guild, user.id);
  if (!member) return;

  const role = guild.roles.cache.get(entry.roleId) || await guild.roles.fetch(entry.roleId).catch(() => null);
  if (!role) {
    console.warn(`[reaction-roles] Skipping remove: role ${entry.roleId} no longer exists in ${guild.id}.`);
    await sendConfiguredNotice(guild, settings, `❌ Reaction role removal failed: the configured role no longer exists (role ID ${entry.roleId}).`, true);
    return;
  }
  if (!member.roles.cache.has(role.id)) return;

  try {
    await member.roles.remove(role, "Reaction role removed");
    console.log(
      `[reaction-roles] Removed ${role.name} from ${user.tag} in ${guild.name}`
    );
    await sendConfiguredNotice(guild, settings, `➖ <@${user.id}> had the **${role.name}** role removed.`);
    await sendDmConfirmation(user, `➖ Your **${role.name}** role in **${guild.name}** has been removed.`, guild, settings);
  } catch (e) {
    console.error("[reaction-roles] Failed to remove role:", e.message);
    await sendConfiguredNotice(guild, settings, `❌ Failed to remove **${role.name}** from <@${user.id}>: ${e.message || "unknown Discord error"}`, true);
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
