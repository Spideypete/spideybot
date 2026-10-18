'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const subscriptionManager=require('../../../services/subscription.manager.js');
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'achievements.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.exec(`CREATE TABLE IF NOT EXISTS users (
 user_id TEXT NOT NULL, guild_id TEXT NOT NULL,
 message_count INTEGER NOT NULL DEFAULT 0, emoji_count INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY (user_id, guild_id)
)`);
const upsert = db.prepare(`INSERT INTO users (user_id,guild_id,message_count,emoji_count)
 VALUES (@user_id,@guild_id,1,@emoji_count)
 ON CONFLICT(user_id,guild_id) DO UPDATE SET message_count=users.message_count+1, emoji_count=users.emoji_count+excluded.emoji_count`);
const readStats = db.prepare('SELECT user_id,guild_id,message_count,emoji_count FROM users WHERE guild_id=? AND user_id=?');
function countEmoji(content) {
 const text=String(content||'');
 const custom=text.match(/<a?:[A-Za-z0-9_]{2,32}:\d{17,20}>/g)||[];
 const clean=text.replace(/<a?:[A-Za-z0-9_]{2,32}:\d{17,20}>/g,'');
 const unicode=clean.match(/(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)|(?:\p{Regional_Indicator}{2})|(?:[0-9#*]\uFE0F?\u20E3)/gu)||[];
 return custom.length+unicode.length;
}
function getStats(guildId,userId){return readStats.get(String(guildId),String(userId))||{user_id:String(userId),guild_id:String(guildId),message_count:0,emoji_count:0};}
const rowsOf=rows=>(Array.isArray(rows)?rows:[]).map(r=>({threshold:Math.max(1,Number(r.threshold)||1),roleId:String(r.roleId||'')})).filter(r=>r.roleId).sort((a,b)=>a.threshold-b.threshold);
async function awardMilestones(message,stats,config){
 if(config.enabled===false||!message.member)return;
 const policy=subscriptionManager.getGuildPlanPolicy(message.guild.id);
 const botMember=message.guild.members.me;
 for(const item of [
  {total:stats.message_count,rows:rowsOf(config.messages).slice(0,policy.achievementsMessages),metric:'messages'},
  {total:stats.emoji_count,rows:rowsOf(config.emojis).slice(0,policy.achievementsEmoji),metric:'emojis used'}
 ]){
  for(const reward of item.rows){
   if(item.total<reward.threshold||message.member.roles.cache.has(reward.roleId))continue;
   const role=message.guild.roles.cache.get(reward.roleId)||await message.guild.roles.fetch(reward.roleId).catch(()=>null);
   if(!role){console.warn('[ACHIEVEMENTS] Reward role not found:',reward.roleId);continue;}
   if(!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)||role.managed||botMember.roles.highest.comparePositionTo(role)<=0){console.warn('[ACHIEVEMENTS] Missing Manage Roles or role hierarchy prevents role assignment:',role.id);continue;}
   try{
    await message.member.roles.add(role,'Achievement milestone reached: '+item.metric+' '+reward.threshold);
    if(!policy.achievementAnnouncements||config.announce!==false){
     const channelId=policy.achievementAnnouncements?(config.announcementChannelId||message.channelId):message.channelId;
     const channel=message.guild.channels.cache.get(channelId);
     if(channel?.isTextBased()&&channel.send)await channel.send({embeds:[new EmbedBuilder().setColor(0x1595a3).setTitle('🏅 Achievement unlocked!').setDescription(message.author.toString()+' earned '+role.toString()+' for reaching **'+reward.threshold+' '+item.metric+'**.').setTimestamp()]}).catch(e=>console.warn('[ACHIEVEMENTS] Announcement failed:',e.message));
    }
   }catch(e){console.warn('[ACHIEVEMENTS] Role assignment failed:',role.id,e.message);}
  }
 }
}
async function trackMessage(message,config={}) {
 if(!message.guild||message.author.bot||config.enabled===false)return;
 const stats=db.transaction(()=>{upsert.run({user_id:message.author.id,guild_id:message.guild.id,emoji_count:countEmoji(message.content)});return getStats(message.guild.id,message.author.id);})();
 await awardMilestones(message,stats,config);
}
module.exports={trackMessage,getStats,countEmoji,db};
