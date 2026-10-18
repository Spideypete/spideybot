const fs = require("fs");
const path = require("path");

const preferredPath = process.env.SPIDEY_STATS_FILE ||
  (fs.existsSync("/data") ? "/data/spidey-server-statistics.json" : path.join(__dirname, "..", "data", "spidey-server-statistics.json"));
let state = { guilds: {} };
try {
  if (fs.existsSync(preferredPath)) {
    const parsed = JSON.parse(fs.readFileSync(preferredPath, "utf8"));
    if (parsed && typeof parsed === "object" && parsed.guilds) state = parsed;
  }
} catch (error) {
  console.error("[server-statistics] Could not load saved statistics:", error.message);
}
let writeQueue = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(state);
  writeQueue = writeQueue.then(async () => {
    await fs.promises.mkdir(path.dirname(preferredPath), { recursive: true });
    const temp = preferredPath + ".tmp";
    await fs.promises.writeFile(temp, snapshot, "utf8");
    await fs.promises.rename(temp, preferredPath);
  }).catch(error => console.error("[server-statistics] Could not persist statistics:", error.message));
}
function getGuild(guildId) {
  if (!state.guilds[guildId]) state.guilds[guildId] = { messages: 0, joinsByDay: {} };
  const record = state.guilds[guildId];
  if (!Number.isFinite(record.messages)) record.messages = 0;
  if (!record.joinsByDay || typeof record.joinsByDay !== "object") record.joinsByDay = {};
  return record;
}
function dayKey(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function trackMessage(message) {
  if (!message?.guild?.id || message.author?.bot) return;
  getGuild(message.guild.id).messages += 1;
  persist();
}
function trackJoin(member) {
  if (!member?.guild?.id || member.user?.bot) return;
  const record = getGuild(member.guild.id);
  const key = dayKey();
  record.joinsByDay[key] = (Number(record.joinsByDay[key]) || 0) + 1;
  persist();
}
function getGuildStats(guildId, now = new Date()) {
  const record = getGuild(String(guildId));
  const year = now.getFullYear(), month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const labels = [], joins = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = [year, String(month + 1).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
    labels.push(String(day));
    joins.push(Number(record.joinsByDay[key]) || 0);
  }
  return { messages: record.messages, joinLabels: labels, joinsThisMonth: joins, trackingSince: record.trackingSince || null };
}
module.exports = { trackMessage, trackJoin, getGuildStats };
