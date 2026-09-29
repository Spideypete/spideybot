const { getGuildConfig, updateGuildConfig } = require('../../config/config-manager.cjs');

const DEFAULTS = {
  enabled: true, prefix: '!',
  automod: { enabled: false, antiInvite: true, antiLink: false, antiSpam: true, maxMessages: 6, windowMs: 8000, caps: false, massMention: true, maxMentions: 5, words: [] },
  audit: { enabled: false, channelId: null },
  welcome: { enabled: false, channelId: null, message: 'Welcome {user} to {server}! We now have {membercount} members.' },
  autorole: { enabled: false, roleId: null },
  sticky: {}, counting: {}, profiles: {}, warnings: {}, commandToggles: {}, blacklist: [],
  economy: { enabled: true, currency: 'coins', daily: 100, workMin: 20, workMax: 60, cooldown: 300000, users: {}, shop: [] },
  levels: { enabled: true, xpPerMessage: 15, xpPerLevel: 500, announceChannel: null, announce: true, rewards: {}, users: {} }
};

const clone = v => JSON.parse(JSON.stringify(v));
function get(guildId) {
  const c = getGuildConfig(guildId);
  if (!c.testifySuite) updateGuildConfig(guildId, { testifySuite: clone(DEFAULTS) });
  const fresh = getGuildConfig(guildId);
  const out = { ...clone(DEFAULTS), ...(fresh.testifySuite || {}) };
  for (const k of ['automod','audit','welcome','autorole','economy','levels']) out[k] = { ...clone(DEFAULTS[k]), ...(out[k] || {}) };
  return out;
}
function save(guildId, patch) { const next = { ...get(guildId), ...patch }; updateGuildConfig(guildId, { testifySuite: next }); return next; }
function balance(guildId, id) { const c=get(guildId), e=c.economy; e.users=e.users||{}; e.users[id]=e.users[id]||{cash:0,bank:0,daily:0,work:0,inventory:[],pet:null}; save(guildId,{economy:e}); return e.users[id]; }
function addWarning(guildId,userId,entry) { const c=get(guildId); c.warnings[userId]=c.warnings[userId]||[]; c.warnings[userId].push(entry); save(guildId,{warnings:c.warnings}); return c.warnings[userId]; }
function getWarnings(guildId,userId) { return get(guildId).warnings?.[userId]||[]; }
function addXp(guildId,userId,amount) {
  const c=get(guildId), l=c.levels; l.users=l.users||{}; const u=l.users[userId]||{xp:0,level:0}; u.xp+=Math.max(0,amount);
  let levelled=false; while(u.xp >= (u.level+1)*l.xpPerLevel){u.level++;levelled=true;} l.users[userId]=u; save(guildId,{levels:l}); return {user:u,levelled};
}
function topXp(guildId) { return Object.entries(get(guildId).levels.users||{}).map(([id,u])=>({id,...u})).sort((a,b)=>b.level-a.level||b.xp-a.xp).slice(0,20); }
function topMoney(guildId) { return Object.entries(get(guildId).economy.users||{}).map(([id,u])=>({id,cash:u.cash||0,bank:u.bank||0,total:(u.cash||0)+(u.bank||0)})).sort((a,b)=>b.total-a.total).slice(0,20); }
function toggle(guildId,key,value) { const c=get(guildId); c.commandToggles[key]=!!value; save(guildId,{commandToggles:c.commandToggles}); return c.commandToggles; }
module.exports={DEFAULTS,get,save,balance,addWarning,getWarnings,addXp,topXp,topMoney,toggle};
