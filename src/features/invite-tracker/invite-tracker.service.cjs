'use strict';

const snapshots = new Map();
const recentJoinTimes = new Map();
const getTracker = (svc, guildId) => svc.get(guildId).inviteTracker || {enabled:true,logJoins:true,logLeaves:true,rewardRolesEnabled:false,logChannelId:null,rewards:[],counts:{},joinedBy:{}};
const key = (guildId, inviteCode) => guildId + ':' + inviteCode;

async function fetchInvites(guild) {
  try { return await guild.invites.fetch(); }
  catch (error) { console.warn('[INVITE TRACKER] Cannot fetch invites for', guild.id, error.message); return null; }
}
function snapshotKey(guildId) { return guildId; }
async function refreshGuild(guild) {
  const invites = await fetchInvites(guild);
  if (!invites) return;
  const map = new Map();
  for (const invite of invites.values()) map.set(invite.code, {uses: Number(invite.uses || 0), inviterId: invite.inviter?.id || null});
  snapshots.set(snapshotKey(guild.id), map);
}
function getStats(guildId, userId, svcRef) {
  const svc = svcRef || module.exports._svc;
  const cfg = svc ? getTracker(svc, guildId) : {counts:{}};
  const c = cfg.counts?.[userId] || {joins:0,leaves:0};
  return {joins:Math.max(0,Number(c.joins)||0),leaves:Math.max(0,Number(c.leaves)||0),active:Math.max(0,(Number(c.joins)||0)-(Number(c.leaves)||0))};
}
function leaderboard(guildId, limit=10) {
  const svc = module.exports._svc;
  if (!svc) return [];
  const cfg = getTracker(svc,guildId);
  return Object.keys(cfg.counts||{}).map(userId=>({userId,...getStats(guildId,userId,svc)})).sort((a,b)=>b.active-a.active||b.joins-a.joins).slice(0,limit);
}
function adjust(guildId,userId,action,amount=0) {
  const svc = module.exports._svc;
  if(!svc)return;
  const cfg=getTracker(svc,guildId),counts={...(cfg.counts||{})},current={joins:0,leaves:0,...(counts[userId]||{})};
  if(action==='reset')counts[userId]={joins:0,leaves:0};
  else if(action==='add')current.joins=Math.max(0,Number(current.joins)||0)+Math.max(0,Number(amount)||0);
  else if(action==='remove')current.joins=Math.max(0,(Number(current.joins)||0)-Math.max(0,Number(amount)||0));
  if(action!=='reset')counts[userId]=current;
  svc.save(guildId,{inviteTracker:{...cfg,counts}});
}
async function rewardInviter(guild, inviterId, cfg, count) {
  if(!cfg.rewardRolesEnabled || !inviterId)return;
  const member=await guild.members.fetch(inviterId).catch(()=>null);
  if(!member)return;
  for(const reward of (cfg.rewards||[]).filter(r=>Number(r.threshold)>0&&r.roleId&&count>=Number(r.threshold))){
    const role=guild.roles.cache.get(reward.roleId)||await guild.roles.fetch(reward.roleId).catch(()=>null);
    if(!role||member.roles.cache.has(role.id)||role.managed||role.position>=guild.members.me?.roles.highest.position)continue;
    if(!guild.members.me?.permissions.has('ManageRoles')){console.warn('[INVITE TRACKER] Missing Manage Roles permission in',guild.id);return;}
    await member.roles.add(role,'Invite milestone reward').catch(err=>console.warn('[INVITE TRACKER] Could not assign role:',err.message));
  }
}
async function logEvent(guild,cfg,content) {
  if(!cfg.logChannelId)return;
  const channel=guild.channels.cache.get(cfg.logChannelId)||await guild.channels.fetch(cfg.logChannelId).catch(()=>null);
  if(channel?.isTextBased?.())await channel.send({content,allowedMentions:{parse:[]}}).catch(err=>console.warn('[INVITE TRACKER] Could not send log:',err.message));
}
function detectSuspiciousJoin(member, cfg) {
  if (cfg.fraudDetectionEnabled !== true) return [];
  const reasons = [];
  const minimumHours = Math.max(0, Number(cfg.minimumAccountAgeHours) || 0);
  const createdAt = Number(member.user?.createdTimestamp) || 0;
  if (minimumHours > 0 && createdAt > 0 && Date.now() - createdAt < minimumHours * 3600000) {
    reasons.push('Discord account is newer than ' + minimumHours + ' hour(s)');
  }
  const windowMs = Math.max(10, Number(cfg.rapidJoinWindowSeconds) || 60) * 1000;
  const threshold = Math.max(2, Number(cfg.rapidJoinThreshold) || 5);
  const now = Date.now(), key = member.guild.id;
  const recent = (recentJoinTimes.get(key) || []).filter(ts => now - ts <= windowMs);
  recent.push(now); recentJoinTimes.set(key, recent);
  if (recent.length >= threshold) reasons.push(recent.length + ' members joined within ' + Math.round(windowMs / 1000) + ' seconds');
  return reasons;
}
async function onJoin(member) {
  if(member.user.bot)return;
  const svc=module.exports._svc;if(!svc)return;
  const cfg=getTracker(svc,member.guild.id);
  if(cfg.enabled===false || svc.get(member.guild.id).plugins?.inviteTracker===false)return;
  const before=snapshots.get(snapshotKey(member.guild.id))||new Map();
  const current=await fetchInvites(member.guild);
  let used=null;
  if(current){
    for(const invite of current.values()){
      const prior=before.get(invite.code);
      if(prior&&Number(invite.uses||0)>prior.uses){used=invite;break;}
      if(!prior&&Number(invite.uses||0)>0){used=invite;break;}
    }
    const next=new Map();for(const invite of current.values())next.set(invite.code,{uses:Number(invite.uses||0),inviterId:invite.inviter?.id||null});
    snapshots.set(snapshotKey(member.guild.id),next);
  }
  if(!used?.inviter?.id){
    await logEvent(member.guild,cfg,'👋 '+member.user.tag+' joined, but the invite could not be identified.');
    return;
  }
  const inviterId=used.inviter.id,counts={...(cfg.counts||{})},row={joins:0,leaves:0,...(counts[inviterId]||{})};
  row.joins=(Number(row.joins)||0)+1;counts[inviterId]=row;
  const joinedBy={...(cfg.joinedBy||{}),[member.id]:inviterId};
  svc.save(member.guild.id,{inviteTracker:{...cfg,counts,joinedBy}});
  const active=Math.max(0,row.joins-(Number(row.leaves)||0));
  const fraudReasons=detectSuspiciousJoin(member,cfg);
  if(fraudReasons.length)await logEvent(member.guild,cfg,'⚠️ Potentially suspicious join: '+member.user.tag+' (invite from <@'+inviterId+'>). '+fraudReasons.join('; ')+'.');
  if(!fraudReasons.length||cfg.blockRewardsForFlagged!==true)await rewardInviter(member.guild,inviterId,cfg,active);
  if(cfg.logJoins!==false)await logEvent(member.guild,cfg,'📨 '+member.user.tag+' joined using an invite from <@'+inviterId+'>. Inviter now has **'+active+'** active invite(s).');
}
async function onLeave(member) {
  if(member.user?.bot)return;
  const svc=module.exports._svc;if(!svc)return;
  const cfg=getTracker(svc,member.guild.id),inviterId=cfg.joinedBy?.[member.id];
  if(!inviterId)return;
  const counts={...(cfg.counts||{})},row={joins:0,leaves:0,...(counts[inviterId]||{})};
  row.leaves=(Number(row.leaves)||0)+1;counts[inviterId]=row;
  const joinedBy={...(cfg.joinedBy||{})};delete joinedBy[member.id];
  svc.save(member.guild.id,{inviteTracker:{...cfg,counts,joinedBy}});
  if(cfg.logLeaves!==false)await logEvent(member.guild,cfg,'👋 '+(member.user?.tag||member.id)+' left. <@'+inviterId+'> now has **'+Math.max(0,row.joins-row.leaves)+'** active invite(s).');
}
function initialize(client,svc) {
  module.exports._svc=svc;
  client.once('ready',async()=>{for(const guild of client.guilds.cache.values())await refreshGuild(guild);});
  client.on('inviteCreate',invite=>refreshGuild(invite.guild));
  client.on('inviteDelete',invite=>refreshGuild(invite.guild));
  client.on('guildCreate',guild=>refreshGuild(guild));
  client.on('guildMemberAdd',member=>onJoin(member).catch(err=>console.error('[INVITE TRACKER JOIN]',err.message)));
  client.on('guildMemberRemove',member=>onLeave(member).catch(err=>console.error('[INVITE TRACKER LEAVE]',err.message)));
}
module.exports={initialize,getStats,leaderboard,adjust};
