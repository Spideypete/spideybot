const { getGuildConfig, updateGuildConfig } = require('../../config/config-manager.cjs');

const DEFAULTS = {
  enabled: true, prefix: '!',
  plugins: {},
  channels: {}, roles: {}, messages: {},
  automod: { enabled: false, notifyUser: true, presetProfanity: true, presetSlurs: false, presetSexual: false, antiInvite: true, antiLink: true, antiSpam: true, antiDuplicate: true, maxMessages: 6, windowMs: 8000, caps: false, massMention: true, maxMentions: 5, screenUsername: true, screenNickname: true, screenActionTimeout: false, action: 'delete', timeoutMinutes: 10, alertStaff: true, logChannelId: null, words: [], customRules: [] },
  audit: { enabled: false, channelId: null, ignoreChannelIds: [], events: { messageDelete: true, messageUpdate: true, messageDeleteBulk: true, memberJoin: true, memberLeave: true, memberUpdate: true, bans: true, voice: true, channels: true, roles: true, guild: true }, entries: [] },
  welcome: { enabled: false, channelId: null, message: 'Welcome {user} to {server}! We now have {membercount} members.' },
  autorole: { enabled: false, roleId: null },
  sticky: {}, counting: {}, profiles: {}, warnings: {}, commandToggles: {}, blacklist: [],
  economy: { enabled: true, currency: 'coins', daily: 100, workMin: 20, workMax: 60, cooldown: 300000, users: {}, shop: [] },
  levels: { enabled: true, xpPerMessage: 15, xpPerLevel: 500, xpCooldownSeconds: 60, announceChannel: null, announce: true, rewards: {}, users: {} },
  polls: { enabled: true, defaultChannelId: null, anonymous: true, allowMultipleVotes: false, maxOptions: 20, defaultDurationMinutes: 0, adminDelete: true, active: {} },
  tickets: { enabled: true, categoryId: null, ticketChannelId: null, supportRoleId: null, logChannelId: null, transcriptChannelId: null, ticketPrefix: 'ticket', maxTicketsPerUser: 1, panelTitle: 'Need help? Open a ticket', panelDescription: 'Select the button below to contact our support team.', buttonLabel: 'Create Ticket', welcomeMessage: 'Hello {user}, please describe your issue and a staff member will be with you shortly.', questions: [], allowUserClose: true, claimEnabled: true, allowReopen: true, transcriptsEnabled: true, autoCloseHours: 0, records: {}, nextNumber: 1 }
};

const clone=v=>JSON.parse(JSON.stringify(v));
function get(guildId){
  const c=getGuildConfig(guildId);
  // Migrate existing per-server settings without losing users' saved configuration.
  const legacyKey = Object.keys(c).find(key => key.toLowerCase().startsWith('test') && key.toLowerCase().endsWith('suite'));
  const legacy = legacyKey ? c[legacyKey] : null;
  if(!c.spideySuite)updateGuildConfig(guildId,{spideySuite:clone(legacy||DEFAULTS)});
  const fresh=getGuildConfig(guildId);
  const out={...clone(DEFAULTS),...(fresh.spideySuite||legacy||{})};
  for(const k of ['plugins','channels','roles','messages','sticky','counting','profiles','warnings','commandToggles','automod','audit','welcome','autorole','economy','levels','tickets','polls']){
    const base=clone(DEFAULTS[k]||{});
    out[k]={...base,...(out[k]||{})};
  }
  // blacklist is a list, not a keyed settings object. Older configs may contain
  // an object, so normalize it safely instead of calling .includes on an object.
  if(Array.isArray(out.blacklist)){
    out.blacklist=out.blacklist.map(String);
  }else if(out.blacklist&&typeof out.blacklist==='object'){
    out.blacklist=Object.entries(out.blacklist).filter(([,blocked])=>blocked===true).map(([id])=>String(id));
  }else{
    out.blacklist=[];
  }
  return out;
}
function save(guildId,patch){
  const current=get(guildId);
  const next={...current,...(patch||{})};
  for(const k of ['plugins','channels','roles','messages','sticky','counting','profiles','warnings','commandToggles','blacklist','automod','audit','welcome','autorole','economy','levels','tickets','polls']){
    if(patch&&patch[k]&&typeof patch[k]==='object'&&!Array.isArray(patch[k]))next[k]={...(current[k]||{}),...patch[k]};
  }
  updateGuildConfig(guildId,{spideySuite:next});
  return next;
}
function balance(guildId,id){const c=get(guildId),e=c.economy;e.users=e.users||{};e.users[id]=e.users[id]||{cash:0,bank:0,daily:0,work:0,inventory:[],pet:null};save(guildId,{economy:e});return e.users[id];}
function addWarning(guildId,userId,entry){const c=get(guildId);c.warnings[userId]=c.warnings[userId]||[];c.warnings[userId].push(entry);save(guildId,{warnings:c.warnings});return c.warnings[userId];}
function getWarnings(guildId,userId){return get(guildId).warnings?.[userId]||[];}
function addXp(guildId,userId,amount){const c=get(guildId),l=c.levels;l.users=l.users||{};const u=l.users[userId]||{xp:0,level:0};const previousLevel=Math.max(0,Number(u.level)||0);u.xp=Math.max(0,Number(u.xp)||0)+Math.max(0,Number(amount)||0);const perLevel=Math.max(1,Number(l.xpPerLevel)||500);u.level=Math.floor(u.xp/perLevel);l.users[userId]=u;save(guildId,{levels:l});return {user:u,levelled:u.level>previousLevel,previousLevel};}
function topXp(guildId){return Object.entries(get(guildId).levels.users||{}).map(([id,u])=>({id,...u})).sort((a,b)=>b.level-a.level||b.xp-a.xp).slice(0,20);}
function topMoney(guildId){return Object.entries(get(guildId).economy.users||{}).map(([id,u])=>({id,cash:u.cash||0,bank:u.bank||0,total:(u.cash||0)+(u.bank||0)})).sort((a,b)=>b.total-a.total).slice(0,20);}
function toggle(guildId,key,value){return save(guildId,{commandToggles:{[key]:!!value}}).commandToggles;}
module.exports={DEFAULTS,get,save,balance,addWarning,getWarnings,addXp,topXp,topMoney,toggle};
