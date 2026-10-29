const fs = require("fs");
const path = require("path");

const filePath = process.env.SPIDEY_STAT_CHANNELS_FILE ||
  (fs.existsSync("/data") ? "/data/spidey-stat-channels.json" : path.join(__dirname, "..", "data", "spidey-stat-channels.json"));
let state = { guilds: {} };
try {
  if (fs.existsSync(filePath)) {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (parsed && parsed.guilds) state = parsed;
  }
} catch (error) {
  console.error("[stat-channels] Could not load saved counter configuration:", error.message);
}
let writeQueue = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(state, null, 2);
  writeQueue = writeQueue.then(async () => {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    const temp = filePath + ".tmp";
    await fs.promises.writeFile(temp, snapshot, "utf8");
    await fs.promises.rename(temp, filePath);
  }).catch(error => console.error("[stat-channels] Could not save counters:", error.message));
}
function getGuildCounters(guildId) {
  if (!state.guilds[guildId]) state.guilds[guildId] = [];
  if (!Array.isArray(state.guilds[guildId])) state.guilds[guildId] = [];
  return state.guilds[guildId];
}
function list(guildId) {
  return getGuildCounters(String(guildId)).map(item => ({ ...item }));
}
function add(guildId, counter) {
  const items = getGuildCounters(String(guildId));
  if (items.some(item => item.channelId === counter.channelId)) throw new Error("That channel already has a statistics counter.");
  if (items.length >= 20) throw new Error("A server can have up to 20 statistics counters.");
  const item = {
    id: String(counter.channelId),
    channelId: String(counter.channelId),
    metric: String(counter.metric),
    label: String(counter.label || "").trim().slice(0, 45),
    roleId: counter.roleId ? String(counter.roleId) : null,
    createdAt: new Date().toISOString()
  };
  items.push(item);
  persist();
  return { ...item };
}
function remove(guildId, counterId) {
  const items = getGuildCounters(String(guildId));
  const next = items.filter(item => item.id !== String(counterId) && item.channelId !== String(counterId));
  if (next.length === items.length) return false;
  state.guilds[String(guildId)] = next;
  persist();
  return true;
}
function metricValue(guild, counter) {
  const members = guild.members.cache;
  switch (counter.metric) {
    case "members": return guild.memberCount ?? members.size;
    case "humans": return members.filter(member => !member.user.bot).size;
    case "bots": return members.filter(member => member.user.bot).size;
    case "channels": return guild.channels.cache.filter(channel => channel.type !== 4).size;
    case "online": return members.filter(member => !member.user.bot && member.presence && member.presence.status !== "offline").size;
    case "roleMembers": {
      if (!counter.roleId) return 0;
      const role = guild.roles.cache.get(counter.roleId);
      return role ? role.members.size : 0;
    }
    default: return null;
  }
}
async function refreshGuild(client, guildId) {
  const guild = client.guilds.cache.get(String(guildId));
  if (!guild) return;
  const counters = list(guild.id);
  if (!counters.length) return;
  // Do not request every guild member over the Gateway on each refresh.
  // Member-based counters use the members already cached by normal bot activity.
  for (const counter of counters) {
    try {
      const channel = guild.channels.cache.get(counter.channelId) || await guild.channels.fetch(counter.channelId).catch(() => null);
      if (!channel || typeof channel.setName !== "function") {
        // A deleted/inaccessible channel can never be updated. Remove its stale
        // configuration so this warning does not repeat every five minutes.
        const current = getGuildCounters(guild.id);
        state.guilds[guild.id] = current.filter(item => item.id !== counter.id && item.channelId !== counter.channelId);
        persist();
        console.warn("[stat-channels] Removed stale counter for unavailable/non-renamable channel", counter.channelId, "in guild", guild.id, "- recreate it in the dashboard if needed.");
        continue;
      }
      const value = metricValue(guild, counter);
      if (value === null) continue;
      const prefix = counter.label || ({
        members: "Members", humans: "People", bots: "Bots", channels: "Channels",
        online: "Online", roleMembers: "Role members"
      }[counter.metric] || "Stats");
      const name = (prefix + ": " + Number(value).toLocaleString("en-US")).slice(0, 100);
      if (channel.name !== name) await channel.setName(name, "SPIDEY BOT live server statistics counter");
    } catch (error) {
      console.error("[stat-channels] Could not update counter", counter.channelId, error.message);
    }
  }
}
async function refreshAll(client) {
  for (const guildId of Object.keys(state.guilds)) {
    try { await refreshGuild(client, guildId); } catch (error) {
      console.error("[stat-channels] Guild refresh failed", guildId, error.message);
    }
  }
}
module.exports = { list, add, remove, refreshGuild, refreshAll };
