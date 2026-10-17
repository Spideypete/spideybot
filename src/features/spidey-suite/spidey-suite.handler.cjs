const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const svc=require('./spidey-suite.service.cjs');
const { ServerMessagesService } = require('../server-messages/server-messages.service.cjs');
const serverMessages = new ServerMessagesService();
const advice=['Be curious before being certain.','Small consistent actions compound.','Ask clear questions and verify assumptions.','Leave systems easier to understand than you found them.'];
const jokes=['Why did the scarecrow win an award? Because he was outstanding in his field.','I only know 25 letters of the alphabet. I do not know y.','Why do programmers prefer dark mode? Because light attracts bugs.'];
const wyr=['Unlimited money or unlimited time?','Always early or always prepared?','Explore space or the deep ocean?'];
const levelXpCooldown=new Map();
const achievements=require('../achievements/achievements.service.cjs');
const inviteTracker=require('../invite-tracker/invite-tracker.service.cjs');
const ticketRuntime=require('../tickets/ticketing.runtime.cjs');
const fmt=n=>new Intl.NumberFormat().format(Math.max(0,n||0));
const isAdmin=i=>!!i.member?.permissions?.has(PermissionFlagsBits.Administrator);
const who=i=>i.options.getUser('user')||i.user;
const COMMAND_FEATURE={
  goodbye:'welcome',avatar:'members',userinfo:'members',serverinfo:'members',roleinfo:'members',botinfo:'system',membercount:'members',permissions:'members',profile:'members',rank:'levels',
  daily:'economy',beg:'economy',deposit:'economy',withdraw:'economy',inventory:'economy',shop:'economy',buy:'economy',give:'economy',rob:'economy',crime:'economy',pet:'economy',
  poll:'polls',deletepoll:'polls',calculator:'community',ascii:'community',advice:'community',dadjoke:'community',wouldyourrather:'community',hack:'community',relationship:'community',
  warn:'moderator',warnings:'moderator',kick:'moderator',ban:'moderator',mute:'moderator',unmute:'moderator',purge:'moderator',softban:'moderator',unban:'moderator',clearwarnings:'moderator',slowmode:'moderator',lock:'moderator',unlock:'moderator',nickname:'moderator',role:'moderator',announce:'moderator',say:'moderator',thread:'ticketing',ticket:'ticketing',
  automod:'automod',automodwords:'automod',automodlinks:'automod',automodspam:'automod',auditlog:'audit',setprefix:'welcome',sticky:'commands',unsticky:'commands',counting:'community',welcome:'welcome',autorole:'welcome',verify:'moderator',commandtoggle:'commands',
  levelrewards:'levels',setlevelreward:'levels',resetxp:'levels',addxp:'levels',setxp:'levels',removexp:'levels',
  blacklist:'moderator',unblacklist:'moderator'
};
const featureForCommand=n=>COMMAND_FEATURE[n]||null;
const featureIsOn=(c,key)=>!key||c.plugins?.[key]!==false;
async function sendModerationLog(i,action,target,reason){
  try{
    const configPath=path.join(__dirname,'../../../config.json');
    const rootConfig=JSON.parse(fs.readFileSync(configPath,'utf8'));
    const guildConfig=rootConfig.guilds?.[i.guild.id]||{};
    const modLogging=guildConfig.logging?.moderationLogging||{};
    const toggleMap={WARN:'logWarns',KICK:'logKicks',BAN:'logBans',MUTE:'logMutes',UNMUTE:'logMutes'};
    if(modLogging[toggleMap[action]]===false)return;
    const channelId=modLogging.modLogChannel||guildConfig.modLogChannelId||modLogging.logChannel;
    if(!channelId)return;
    const channel=i.guild.channels.cache.get(String(channelId))||await i.guild.channels.fetch(String(channelId)).catch(()=>null);
    if(!channel?.isTextBased())return;
    const color=action==='WARN'?0xffbd39:action==='KICK'?0xff6b6b:action==='BAN'?0xed4245:0x5865f2;
    const embed=new EmbedBuilder().setColor(color).setTitle('🛡️ '+action).addFields(
      {name:'Moderator',value:String(i.user.tag||i.user.username),inline:true},
      {name:'Target',value:String(target.tag||target.username||target.id),inline:true},
      {name:'Reason',value:String(reason||'No reason provided').slice(0,1024)}
    ).setTimestamp();
    await channel.send({embeds:[embed]});
  }catch(error){console.error('[MODERATION LOG]',error.message||error);}
}
function profile(i,u,c){const l=c.levels.users?.[u.id]||{level:0,xp:0},e=c.economy.users?.[u.id]||{cash:0,bank:0},p=c.profiles?.[u.id]||{};return new EmbedBuilder().setColor(0x6d3df5).setTitle(p.displayName||u.username).setThumbnail(u.displayAvatarURL({size:256})).addFields({name:'Level',value:String(l.level),inline:true},{name:'XP',value:String(l.xp),inline:true},{name:'Cash',value:fmt(e.cash),inline:true},{name:'Bank',value:fmt(e.bank),inline:true},{name:'Bio',value:p.bio||'No bio set.'});}

async function execute(i,ctx){
  if(!i.isChatInputCommand()||!i.guild)return false;
  const root=i.commandName,sub=i.options.getSubcommand(false),alias={'info:avatar':'avatar','info:userinfo':'userinfo','info:serverinfo':'serverinfo','info:roleinfo':'roleinfo','info:botinfo':'botinfo','info:membercount':'membercount','info:permissions':'permissions','info:profile':'profile','info:rank':'rank','economy:daily':'daily','economy:beg':'beg','economy:deposit':'deposit','economy:withdraw':'withdraw','economy:inventory':'inventory','economy:shop':'shop','economy:buy':'buy','economy:give':'give','economy:rob':'rob','economy:crime':'crime','economy:pet':'pet','fun:poll':'poll','fun:deletepoll':'deletepoll','fun:calculator':'calculator','fun:ascii':'ascii','fun:advice':'advice','fun:dadjoke':'dadjoke','fun:wouldyourrather':'wouldyourrather','fun:hack':'hack','fun:relationship':'relationship','mod:warn':'warn','mod:warnings':'warnings','mod:kick':'kick','mod:ban':'ban','mod:mute':'mute','mod:unmute':'unmute','mod:purge':'purge','mod:softban':'softban','mod:unban':'unban','mod:clearwarnings':'clearwarnings','mod:slowmode':'slowmode','mod:lock':'lock','mod:unlock':'unlock','mod:nickname':'nickname','mod:role':'role','mod:announce':'announce','mod:say':'say','mod:thread':'thread','automod:toggle':'automod','automod:words':'automodwords','automod:links':'automodlinks','automod:spam':'automodspam','config:auditlog':'auditlog','config:prefix':'setprefix','config:sticky':'sticky','config:unsticky':'unsticky','config:counting':'counting','config:welcome':'welcome','config:goodbye':'goodbye','config:autorole':'autorole','config:verify':'verify','config:toggle':'commandtoggle','levels:rewards':'levelrewards','levels:setreward':'setlevelreward','levels:reset':'resetxp','levels:addxp':'addxp','levels:setxp':'setxp','levels:removexp':'removexp','system:stats':'botstats','system:guilds':'guildlist','system:blacklist':'blacklist','system:unblacklist':'unblacklist','system:reload':'reloadconfig','system:debug':'debug','invites:stats':'invitesstats','invites:leaderboard':'invitesleaderboard','invites:add':'invitesadd','invites:remove':'invitesremove','invites:reset':'invitesreset'},n=alias[(root+':'+sub)]||root;
  const deferredModerationCommands=['warn','warnings','kick','ban','mute','unmute','unban'];
  // Acknowledge these interactions immediately, before config checks or Discord API requests.
  if(deferredModerationCommands.includes(n)&&!i.deferred&&!i.replied) await i.deferReply({ephemeral:true});
  const respondEarly=payload=>i.deferred||i.replied?i.editReply(payload):i.reply(payload);
  const c=svc.get(i.guild.id),u=who(i);
  const custom=(Array.isArray(c.customCommands?.items)?c.customCommands.items:[]).find(x=>x.name===root&&x.enabled!==false);
  if(custom){
    if(c.blacklist?.includes(i.user.id)){await respondEarly({content:'You are blocked from using SPIDEY BOT features in this server.',ephemeral:true});return true;}
    try{
      if(custom.counterEnabled!==false){custom.count=Math.max(0,Number(custom.count)||0)+1;svc.save(i.guild.id,{customCommands:c.customCommands});}
      const count=Number(custom.count)||0,replace=(text)=>String(text||'').replace(/\{count\}/gi,String(count)).replace(/\{user\}/gi,i.user.toString()).replace(/\{username\}/gi,i.user.username).replace(/\{server\}/gi,i.guild.name).replace(/\{counterLabel\}/gi,String(custom.counterLabel||'Count'));
      const content=replace(custom.messageTemplate).slice(0,2000);
      await i.reply({content:content||'Command executed.',allowedMentions:{parse:[]}});
    }catch(err){console.error('[CUSTOM COMMAND]',err);if(!i.replied&&!i.deferred)await i.reply({content:'Could not run this custom command. Please try again.',ephemeral:true}).catch(()=>{});}
    return true;
  }
  if(c.blacklist?.includes(i.user.id)){await i.reply({content:'You are blocked from using SPIDEY BOT features in this server.',ephemeral:true});return true;}
  const featureKey=featureForCommand(n);
  if(!featureIsOn(c,featureKey)){await respondEarly({content:'That feature is currently disabled by this server.',ephemeral:true});return true;}
  if(c.commandToggles?.[n]===false&&!isAdmin(i)){await respondEarly({content:'That command is disabled by this server.',ephemeral:true});return true;}
  const respond=payload=>{
    if(i.deferred||i.replied){
      if(payload&&typeof payload==='object'&&!Array.isArray(payload)){
        const {ephemeral,...editPayload}=payload;
        return i.editReply(editPayload);
      }
      return i.editReply(payload);
    }
    return i.reply(payload);
  };
  try{
    if(n==='avatar'){await i.reply(u.displayAvatarURL({size:1024,dynamic:true}));return true;}
    if(n==='userinfo'){const m=await i.guild.members.fetch(u.id).catch(()=>null);await i.reply({embeds:[new EmbedBuilder().setColor(0x1595a3).setTitle(u.tag).setThumbnail(u.displayAvatarURL()).addFields({name:'ID',value:u.id,inline:true},{name:'Joined',value:m?.joinedAt?.toISOString()||'Unknown',inline:true},{name:'Created',value:u.createdAt.toISOString(),inline:true},{name:'Roles',value:m?.roles.cache.filter(r=>r.id!==i.guild.id).map(r=>r.toString()).slice(0,20).join(', ')||'None'})]});return true;}
    if(n==='ticket')return ticketRuntime.execute(i);
    if(n==='serverinfo'){await i.reply({embeds:[new EmbedBuilder().setColor(0x1595a3).setTitle(i.guild.name).setThumbnail(i.guild.iconURL()).addFields({name:'Members',value:String(i.guild.memberCount),inline:true},{name:'Channels',value:String(i.guild.channels.cache.size),inline:true},{name:'Roles',value:String(i.guild.roles.cache.size),inline:true},{name:'Owner',value:'<@'+i.guild.ownerId+'>',inline:true},{name:'Created',value:i.guild.createdAt.toISOString(),inline:true})]});return true;}
    if(n==='roleinfo'){const r=i.options.getRole('role');await i.reply({embeds:[new EmbedBuilder().setColor(r.color||0x6d3df5).setTitle('@'+r.name).addFields({name:'ID',value:r.id,inline:true},{name:'Members',value:String(r.members.size),inline:true},{name:'Position',value:String(r.position),inline:true},{name:'Mentionable',value:String(r.mentionable),inline:true})]});return true;}
    if(n==='botinfo'||n==='botstats'){await i.reply('SPIDEY BOT | Servers: '+ctx.client.guilds.cache.size+' | Uptime: '+Math.floor(process.uptime())+'s | RSS: '+Math.round(process.memoryUsage().rss/1048576)+' MB | WS: '+ctx.client.ws.ping+'ms');return true;}
    if(n==='membercount'){await i.reply('Members: '+i.guild.memberCount+' | Humans: '+i.guild.members.cache.filter(m=>!m.user.bot).size+' | Bots: '+i.guild.members.cache.filter(m=>m.user.bot).size);return true;}
    if(n==='permissions'){await i.reply('Your permissions: '+i.member.permissions.toArray().join(', '));return true;}
    if(n==='profile'){await i.reply({embeds:[profile(i,u,c)]});return true;}
    if(n==='rank'){const l=c.levels.users?.[u.id]||{level:0,xp:0},top=svc.topXp(i.guild.id),pos=Math.max(1,top.findIndex(x=>x.id===u.id)+1);await i.reply('🏆 '+u.username+' — Level '+l.level+' | '+l.xp+' XP | Rank #'+pos);return true;}
    if(n==='invitesstats'){
      const target=i.options.getUser('user')||i.user,stats=inviteTracker.getStats(i.guild.id,target.id);
      await i.reply({embeds:[new EmbedBuilder().setColor(0x1595a3).setTitle('📨 Invite statistics — '+target.username).setThumbnail(target.displayAvatarURL({size:128})).addFields({name:'Successful joins',value:fmt(stats.joins),inline:true},{name:'Members left',value:fmt(stats.leaves),inline:true},{name:'Active invites',value:fmt(stats.active),inline:true})]});return true;
    }
    if(n==='invitesleaderboard'){
      const rows=inviteTracker.leaderboard(i.guild.id,10);
      await i.reply({embeds:[new EmbedBuilder().setColor(0x1595a3).setTitle('🏆 Invite leaderboard').setDescription(rows.length?rows.map((x,index)=>'**'+(index+1)+'.** <@'+x.userId+'> — **'+fmt(x.active)+'** active invites ('+fmt(x.joins)+' joins, '+fmt(x.leaves)+' left)').join('\n'):'No invite data has been recorded yet.').setFooter({text:'Counts are per server'})]});return true;
    }
    if(['invitesadd','invitesremove','invitesreset'].includes(n)){
      if(!isAdmin(i)){await i.reply({content:'Only server administrators can adjust invite counts.',ephemeral:true});return true;}
      const target=i.options.getUser('user'),amount=i.options.getInteger('amount')||0;
      if(n==='invitesreset')inviteTracker.adjust(i.guild.id,target.id,'reset',0);
      else inviteTracker.adjust(i.guild.id,target.id,n==='invitesadd'?'add':'remove',amount);
      await i.reply({content:'Updated invite totals for '+target.username+'.',ephemeral:true});return true;
    }
    if(n==='stats'){const totals=achievements.getStats(i.guild.id,u.id);await i.reply({embeds:[new EmbedBuilder().setColor(0x1595a3).setTitle('📊 '+u.username+' — Server Statistics').setThumbnail(u.displayAvatarURL({size:256})).addFields({name:'Text messages',value:fmt(totals.message_count),inline:true},{name:'Emojis used',value:fmt(totals.emoji_count),inline:true})]});return true;}
    if(n==='guildlist'){await i.reply(ctx.client.guilds.cache.map(g=>g.name+' ('+g.id+')').slice(0,30).join('\n')||'No guilds.');return true;}
    if(n==='debug'){await i.reply(JSON.stringify({guild:i.guild.id,automod:c.automod.enabled,levels:c.levels.enabled,commands:Object.keys(c.commandToggles).length},null,2));return true;}
    if(n==='reloadconfig'){svc.get(i.guild.id);await i.reply('♻️ Guild configuration normalized and reloaded.');return true;}

    if(['daily','beg','deposit','withdraw','inventory','shop','buy','give','rob','crime','pet'].includes(n)){
      const e=c.economy,me=svc.balance(i.guild.id,i.user.id),amount=i.options.getInteger('amount');
      if(n==='daily'){if(Date.now()-me.daily<86400000)return i.reply('⏳ Daily reward is still on cooldown.');me.cash+=e.daily||100;me.daily=Date.now();svc.save(i.guild.id,{economy:e});return i.reply('💰 Claimed '+fmt(e.daily||100)+' '+e.currency+'.');}
      if(n==='beg'){const x=5+Math.floor(Math.random()*26);me.cash+=x;svc.save(i.guild.id,{economy:e});return i.reply('🙏 You received '+x+' coins.');}
      if(n==='deposit'){if(me.cash<amount)return i.reply('❌ Not enough cash.');me.cash-=amount;me.bank+=amount;svc.save(i.guild.id,{economy:e});return i.reply('🏦 Deposited '+fmt(amount)+'.');}
      if(n==='withdraw'){if(me.bank<amount)return i.reply('❌ Not enough in bank.');me.bank-=amount;me.cash+=amount;svc.save(i.guild.id,{economy:e});return i.reply('🏦 Withdrew '+fmt(amount)+'.');}
      if(n==='inventory'){const x=svc.balance(i.guild.id,u.id);return i.reply('🎒 '+((x.inventory||[]).join(', ')||'Empty'));}
      if(n==='shop'){return i.reply((e.shop||[]).map(x=>'• '+x.name+' — '+fmt(x.price)).join('\n')||'Shop is empty.');}
      if(n==='buy'){const item=(e.shop||[]).find(x=>x.name.toLowerCase()===i.options.getString('item').toLowerCase());if(!item)return i.reply('❌ Item not found.');if(me.cash<item.price)return i.reply('❌ Not enough cash.');me.cash-=item.price;me.inventory.push(item.name);svc.save(i.guild.id,{economy:e});return i.reply('🛒 Bought '+item.name+'.');}
      if(n==='give'){const to=i.options.getUser('user');if(to.id===i.user.id||me.cash<amount)return i.reply('❌ Invalid target or insufficient cash.');const t=svc.balance(i.guild.id,to.id);me.cash-=amount;t.cash+=amount;svc.save(i.guild.id,{economy:e});return i.reply('💸 Sent '+fmt(amount)+' coins to '+to+'.');}
      if(n==='rob'||n==='crime'){const x=10+Math.floor(Math.random()*91);if(Math.random()<0.55){me.cash+=x;svc.save(i.guild.id,{economy:e});return i.reply('💰 Success: +'+x+' coins.');}me.cash=Math.max(0,me.cash-Math.ceil(x/2));svc.save(i.guild.id,{economy:e});return i.reply('🚨 Failed and lost some cash.');}
      if(n==='pet'){const name=i.options.getString('name');if(name){me.pet=name;svc.save(i.guild.id,{economy:e});return i.reply('🐾 Pet set to '+name+'.');}return i.reply('🐾 Pet: '+(me.pet||'None'));}
    }

    if(n==='poll'){
      const pollConfig=c.polls||{};
      if(pollConfig.enabled===false){await i.reply({content:'Polls are disabled in this server dashboard settings.',ephemeral:true});return true;}
      const question=String(i.options.getString('question')||'').trim().slice(0,250);
      const options=String(i.options.getString('options')||'Yes,No').split(',').map(x=>x.trim()).filter(Boolean).slice(0,20);
      const maxOptions=Math.min(20,Math.max(2,Number(pollConfig.maxOptions)||20));
      if(options.length<2){await i.reply({content:'Add at least two comma-separated options, for example: Red, Blue, Green.',ephemeral:true});return true;}
      if(options.length>maxOptions){await i.reply({content:'This server allows up to '+maxOptions+' options per poll.',ephemeral:true});return true;}
      if(options.some(x=>x.length>80)){await i.reply({content:'Each poll option must be 80 characters or fewer.',ephemeral:true});return true;}
      const pollId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
      const expiresMinutes=Math.max(0,Number(pollConfig.defaultDurationMinutes)||0);
      const poll={id:pollId,question,options,votes:{},guildId:i.guild.id,channelId:null,messageId:null,createdAt:Date.now(),expiresAt:expiresMinutes?Date.now()+expiresMinutes*60000:null,anonymous:pollConfig.anonymous!==false,allowMultipleVotes:pollConfig.allowMultipleVotes===true,closed:false};
      const renderPoll=()=>{const counts=options.map((_,index)=>Object.values(poll.votes).reduce((sum,v)=>sum+(Array.isArray(v)?v.includes(index):v===index?1:0),0));const embed=new EmbedBuilder().setColor(0x5865f2).setTitle('📊 '+question).setDescription(options.map((option,index)=>'**'+(index+1)+'. '+option+'**\n'+counts[index]+' vote'+(counts[index]===1?'':'s')).join('\n\n')).setFooter({text:'Poll ID: '+pollId+(poll.allowMultipleVotes?' · Multiple choices allowed':' · One choice per member')+(poll.anonymous?' · Anonymous results':'')}).setTimestamp(new Date(poll.createdAt));if(poll.expiresAt)embed.addFields({name:'Closes',value:'<t:'+Math.floor(poll.expiresAt/1000)+':R>'});return embed;};
      const rows=[];for(let start=0;start<options.length;start+=5){const row=new ActionRowBuilder();options.slice(start,start+5).forEach((option,offset)=>row.addComponents(new ButtonBuilder().setCustomId('pollvote:'+pollId+':'+(start+offset)).setLabel(option).setStyle(ButtonStyle.Primary).setDisabled(!!poll.closed)));rows.push(row);}
      let target=i.channel;if(pollConfig.defaultChannelId){const configured=i.guild.channels.cache.get(pollConfig.defaultChannelId)||await i.guild.channels.fetch(pollConfig.defaultChannelId).catch(()=>null);if(configured?.isTextBased?.())target=configured;}
      try{await i.deferReply({ephemeral:true});const message=await target.send({embeds:[renderPoll()],components:rows});poll.channelId=target.id;poll.messageId=message.id;const active={...(pollConfig.active||{}),[pollId]:poll};svc.save(i.guild.id,{polls:{...pollConfig,active}});await i.editReply({content:'Poll created: '+message.url+' · Poll ID: '+pollId});}
      catch(err){console.error('[POLL CREATE]',err.message);const payload={content:'Could not create the poll. Check the bot has View Channel, Send Messages and Embed Links permissions.'};if(i.deferred||i.replied)await i.editReply(payload).catch(()=>{});else await i.reply({...payload,ephemeral:true}).catch(()=>{});}
      return true;
    }
    if(n==='deletepoll'){
      const pollConfig=c.polls||{},pollId=String(i.options.getString('poll_id')||'').trim(),poll=pollConfig.active?.[pollId];
      if(!poll){await i.reply({content:'No active poll was found with that ID.',ephemeral:true});return true;}
      if(pollConfig.adminDelete!==false&&!isAdmin(i)){await i.reply({content:'Only server admins can delete polls.',ephemeral:true});return true;}
      try{await i.deferReply({ephemeral:true});const channel=i.guild.channels.cache.get(poll.channelId)||await i.guild.channels.fetch(poll.channelId).catch(()=>null);const message=channel?.messages?await channel.messages.fetch(poll.messageId).catch(()=>null):null;if(message)await message.delete();const active={...(pollConfig.active||{})};delete active[pollId];svc.save(i.guild.id,{polls:{...pollConfig,active}});await i.editReply({content:'Poll '+pollId+' deleted.'});}
      catch(err){console.error('[POLL DELETE]',err.message);const payload={content:'Could not delete that poll. Check the bot has Manage Messages permission.'};if(i.deferred||i.replied)await i.editReply(payload).catch(()=>{});else await i.reply({...payload,ephemeral:true}).catch(()=>{});}
      return true;
    }
    if(n==='calculator'){const ex=i.options.getString('expression');if(!/^[0-9+\-*/().%\s]+$/.test(ex))return i.reply('❌ Only basic arithmetic is allowed.');let result;try{result=Function('"use strict";return ('+ex+')')();}catch{return i.reply('❌ Invalid expression.');}if(!Number.isFinite(result))return i.reply('❌ Result is not finite.');await i.reply('🧮 '+ex+' = '+result);return true;}
    if(n==='ascii'){await i.reply('ASCII: '+i.options.getString('text').slice(0,80).toUpperCase().split('').join(' '));return true;}
    if(n==='advice'){await i.reply('💡 '+advice[Math.floor(Math.random()*advice.length)]);return true;}
    if(n==='dadjoke'){await i.reply('😂 '+jokes[Math.floor(Math.random()*jokes.length)]);return true;}
    if(n==='wouldyourrather'){await i.reply('🤔 '+wyr[Math.floor(Math.random()*wyr.length)]);return true;}
    if(n==='hack'){await i.reply('💻 Connecting...');setTimeout(()=>i.editReply('💻 Scanning... | 📦 Downloading memes... | 😂 Fake hack complete.').catch(()=>{}),900);return true;}
    if(n==='relationship'){await i.reply('💜 Compatibility: '+(50+Math.floor(Math.random()*51))+'%');return true;}

    if(['warn','warnings','kick','ban','mute','unmute'].includes(n)){
      const targetUser = i.options.getUser('user');
      if(!targetUser) return respond({content:'❌ Select a member using the user option.',ephemeral:true});
      const reason = String(i.options.getString('reason') || 'No reason provided').slice(0, 450);
      const hasPerm = perm => isAdmin(i) || !!i.memberPermissions?.has(perm);
      const member = await i.guild.members.fetch(targetUser.id).catch(() => null);

      if(n==='warnings'){
        if(!hasPerm(PermissionFlagsBits.ModerateMembers) && !hasPerm(PermissionFlagsBits.KickMembers)) {
          return respond({content:'❌ You need Moderate Members or Kick Members permission to view warning history.',ephemeral:true});
        }
        const list = svc.getWarnings(i.guild.id, targetUser.id);
        const description = list.length
          ? list.map((w,index)=>(index+1)+'. '+String(w.reason||'No reason').slice(0,300)+' — <t:'+Math.floor((w.at||Date.now())/1000)+':R>').join('\n')
          : 'No warnings recorded for this member.';
        return respond({content:description.slice(0,1900),ephemeral:true});
      }

      if(n==='warn'){
        if(!hasPerm(PermissionFlagsBits.ModerateMembers) && !hasPerm(PermissionFlagsBits.KickMembers)) return respond({content:'❌ You need Moderate Members or Kick Members permission.',ephemeral:true});
        if(!member) return respond({content:'❌ That member is not currently in this server.',ephemeral:true});
        if(targetUser.id===i.user.id || targetUser.id===i.client.user.id) return respond({content:'❌ You cannot warn yourself or the bot.',ephemeral:true});
        const list = svc.addWarning(i.guild.id,targetUser.id,{reason,by:i.user.id,at:Date.now()});
        await respond({content:'⚠️ Warned '+targetUser.tag+'. Total warnings: '+list.length+'. Reason: '+reason});
        await sendModerationLog(i,'WARN',targetUser,reason);
        return true;
      }

      if(n==='kick'){
        if(!hasPerm(PermissionFlagsBits.KickMembers)) return respond({content:'❌ You need Kick Members permission.',ephemeral:true});
        if(!member) return respond({content:'❌ That member is not currently in this server.',ephemeral:true});
        if(targetUser.id===i.user.id) return respond({content:'❌ You cannot kick yourself.',ephemeral:true});
        if(!member.kickable) return respond({content:'❌ I cannot kick that member. Check that the bot has Kick Members permission and its highest role is above the target member.',ephemeral:true});
        await member.kick(reason);
        await respond({content:'👢 Kicked '+targetUser.tag+'. Reason: '+reason});
        await sendModerationLog(i,'KICK',targetUser,reason);
        return true;
      }

      if(n==='ban'){
        if(!hasPerm(PermissionFlagsBits.BanMembers)) return respond({content:'❌ You need Ban Members permission.',ephemeral:true});
        if(targetUser.id===i.user.id) return respond({content:'❌ You cannot ban yourself.',ephemeral:true});
        if(member && !member.bannable) return respond({content:'❌ I cannot ban that member. Check that the bot has Ban Members permission and its highest role is above the target member.',ephemeral:true});
        await i.guild.members.ban(targetUser.id,{reason});
        await respond({content:'🔨 Banned '+targetUser.tag+'. Reason: '+reason});
        await sendModerationLog(i,'BAN',targetUser,reason);
        return true;
      }

      if(n==='mute'){
        if(!hasPerm(PermissionFlagsBits.ModerateMembers)) return respond({content:'❌ You need Moderate Members permission.',ephemeral:true});
        if(!member) return respond({content:'❌ That member is not currently in this server.',ephemeral:true});
        if(targetUser.id===i.user.id) return respond({content:'❌ You cannot timeout yourself.',ephemeral:true});
        const minutes = i.options.getInteger('minutes');
        if(!Number.isInteger(minutes) || minutes < 1 || minutes > 40320) return respond({content:'❌ Timeout duration must be between 1 minute and 28 days.',ephemeral:true});
        if(!member.moderatable) return respond({content:'❌ I cannot timeout that member. Check that the bot has Moderate Members permission and its highest role is above the target member.',ephemeral:true});
        await member.timeout(minutes*60*1000,reason);
        await respond({content:'🔇 Timed out '+targetUser.tag+' for '+minutes+' minute(s). Reason: '+reason});
        await sendModerationLog(i,'MUTE',targetUser,reason+' (Duration: '+minutes+' minute(s))');
        return true;
      }

      if(n==='unmute'){
        if(!hasPerm(PermissionFlagsBits.ModerateMembers)) return respond({content:'❌ You need Moderate Members permission.',ephemeral:true});
        if(!member) return respond({content:'❌ That member is not currently in this server.',ephemeral:true});
        if(!member.communicationDisabledUntilTimestamp) return respond({content:'ℹ️ That member is not currently timed out.',ephemeral:true});
        if(!member.moderatable) return respond({content:'❌ I cannot remove this timeout. Check that the bot has Moderate Members permission and its highest role is above the target member.',ephemeral:true});
        await member.timeout(null,reason);
        await respond({content:'🔊 Timeout removed for '+targetUser.tag+'.'});
        await sendModerationLog(i,'UNMUTE',targetUser,reason);
        return true;
      }
    }
    if(n==='purge'){const d=await i.channel.bulkDelete(i.options.getInteger('amount'),true);await i.reply({content:'🧹 Deleted '+d.size+' messages.',ephemeral:true});return true;}
    if(n==='softban'){const id=i.options.getUser('user').id,m=await i.guild.members.fetch(id).catch(()=>null);if(m&&!m.bannable)return i.reply('❌ I cannot ban that member.');await i.guild.members.ban(id,{reason:i.options.getString('reason')||'Softban'});await i.guild.bans.remove(id,'Softban');await i.reply('✅ Softbanned.');return true;}
    if(n==='unban'){
      if(!i.memberPermissions?.has(PermissionFlagsBits.BanMembers)&&!isAdmin(i)) return respond({content:'❌ You need Ban Members permission.',ephemeral:true});
      const userId = String(i.options.getString('user_id') || '').trim();
      if(!/^\\d{17,20}$/.test(userId)) return respond({content:'❌ Enter a valid Discord user ID (17–20 digits).',ephemeral:true});
      const existingBan = await i.guild.bans.fetch(userId).catch(() => null);
      if(!existingBan) return respond({content:'ℹ️ That user is not currently banned from this server.',ephemeral:true});
      await i.guild.bans.remove(userId, 'Unbanned by '+i.user.tag);
      await respond({content:'✅ Unbanned <@'+userId+'>.'});
      return true;
    }
    if(n==='clearwarnings'){const id=i.options.getUser('user').id;c.warnings[id]=[];svc.save(i.guild.id,{warnings:c.warnings});await i.reply('✅ Warning history cleared.');return true;}
    if(n==='slowmode'){await i.channel.setRateLimitPerUser(i.options.getInteger('seconds'),'SPIDEY BOT');await i.reply('🐢 Slowmode updated.');return true;}
    if(n==='lock'||n==='unlock'){await i.channel.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:n==='unlock'?null:false});await i.reply(n==='lock'?'🔒 Channel locked.':'🔓 Channel unlocked.');return true;}
    if(n==='nickname'){const m=await i.guild.members.fetch(i.options.getUser('user').id);await m.setNickname(i.options.getString('nickname'));await i.reply('✏️ Nickname updated.');return true;}
    if(n==='role'){const m=await i.guild.members.fetch(i.options.getUser('user').id),r=i.options.getRole('role');if(i.options.getString('action')==='add')await m.roles.add(r);else await m.roles.remove(r);await i.reply('✅ Role updated.');return true;}
    if(n==='announce'){const ch=i.options.getChannel('channel');await ch.send({embeds:[new EmbedBuilder().setColor(0x6d3df5).setTitle('Announcement').setDescription(i.options.getString('message')).setTimestamp()]});await i.reply({content:'📣 Sent.',ephemeral:true});return true;}
    if(n==='say'){await i.channel.send(i.options.getString('message'));await i.reply({content:'Sent.',ephemeral:true});return true;}
    if(n==='thread'){const t=await i.channel.threads.create({name:i.options.getString('name'),reason:'SPIDEY BOT'});await i.reply('🧵 Created '+t.toString());return true;}

    if(['automod','automodwords','automodlinks','automodspam','auditlog','setprefix','sticky','unsticky','counting','welcome','goodbye','autorole','verify','commandtoggle'].includes(n)){
      if(!isAdmin(i))return i.reply({content:'❌ Administrator permission required.',ephemeral:true});
      if(n==='automod'){c.automod.enabled=i.options.getBoolean('enabled')??c.automod.enabled;svc.save(i.guild.id,{automod:c.automod});return i.reply('🛡️ AutoMod '+(c.automod.enabled?'enabled':'disabled')+'.');}
      if(n==='automodwords'){c.automod.words=i.options.getString('words').split(',').map(x=>x.trim()).filter(Boolean).slice(0,100);svc.save(i.guild.id,{automod:c.automod});return i.reply('🛡️ Blocked words updated.');}
      if(n==='automodlinks'){c.automod.antiLink=i.options.getBoolean('enabled');svc.save(i.guild.id,{automod:c.automod});return i.reply('🔗 Link filtering updated.');}
      if(n==='automodspam'){c.automod.maxMessages=i.options.getInteger('messages');svc.save(i.guild.id,{automod:c.automod});return i.reply('🚦 Spam threshold updated.');}
      if(n==='auditlog'){c.audit={enabled:true,channelId:i.options.getChannel('channel').id};svc.save(i.guild.id,{audit:c.audit});return i.reply('📋 Audit logging enabled.');}
      if(n==='setprefix'){c.prefix=i.options.getString('prefix');svc.save(i.guild.id,{prefix:c.prefix});return i.reply('⌨️ Prefix set to '+c.prefix+'.');}
      if(n==='sticky'){c.sticky[i.channel.id]=i.options.getString('message');svc.save(i.guild.id,{sticky:c.sticky});return i.reply('📌 Sticky saved.');}
      if(n==='unsticky'){delete c.sticky[i.channel.id];svc.save(i.guild.id,{sticky:c.sticky});return i.reply('📌 Sticky removed.');}
      if(n==='counting'){c.counting[i.channel.id]={enabled:i.options.getBoolean('enabled'),current:c.counting[i.channel.id]?.current||0,lastUser:null};svc.save(i.guild.id,{counting:c.counting});return i.reply('🔢 Counting configured.');}
      if(n==='welcome'||n==='goodbye'){
        if(!isAdmin(i))return i.reply({content:'Only server administrators can change welcome/goodbye settings.',ephemeral:true});
        const kind=n,cap=kind[0].toUpperCase()+kind.slice(1),direct=root===kind;
        const current=await serverMessages.getConfig(i.guild.id);
        const enabled=direct?true:i.options.getBoolean('enabled')!==false;
        const channel=i.options.getChannel('channel',false);
        const type=i.options.getString('type',false)||current[kind+'Type']||'text';
        const message=i.options.getString('message',false);
        const previous=type==='embed'?(current[kind+'Embed']?.description||current[kind+'Message']||''):(current[kind+'Message']||current[kind+'Embed']?.description||'');
        const text=message!==null&&message!==undefined?message:previous;
        const next={...current,['enable'+cap]:enabled,[kind+'Type']:type};
        if(channel)next[kind+'Channel']=channel.id;
        if(type==='embed'){next[kind+'Message']='';next[kind+'Embed']={...(current[kind+'Embed']||{}),description:text,color:current[kind+'Embed']?.color||'#56306f'};}
        else{next[kind+'Message']=text;next[kind+'Embed']=null;}
        await serverMessages.setConfig(i.guild.id,next);
        return i.reply({content:(kind==='welcome'?'👋 Welcome':'👋 Goodbye')+' settings saved.',ephemeral:true});
      }
      if(n==='autorole'){c.autorole.enabled=i.options.getBoolean('enabled');if(i.options.getRole('role'))c.autorole.roleId=i.options.getRole('role').id;svc.save(i.guild.id,{autorole:c.autorole});return i.reply('🎭 Autorole settings saved.');}
      if(n==='verify'){c.verification={roleId:i.options.getRole('role').id};svc.save(i.guild.id,{verification:c.verification});return i.reply('✅ Verification role saved.');}
      if(n==='commandtoggle'){svc.toggle(i.guild.id,i.options.getString('command').toLowerCase(),i.options.getBoolean('enabled'));return i.reply('⚙️ Command toggle saved.');}
    }

    if(n==='levelrewards')return i.reply(Object.entries(c.levels.rewards||{}).map(([l,r])=>'Level '+l+': <@&'+r+'>').join('\n')||'No level rewards configured.');
    if(['setlevelreward','resetxp','addxp','setxp','removexp'].includes(n)&&!isAdmin(i))return i.reply({content:'❌ Administrator permission required to edit XP or level rewards.',ephemeral:true});
    if(n==='setlevelreward'){c.levels.rewards[i.options.getInteger('level')]=i.options.getRole('role').id;svc.save(i.guild.id,{levels:c.levels});return i.reply('🏅 Level reward saved.');}
    if(n==='resetxp'){const id=i.options.getUser('user').id;c.levels.users[id]={xp:0,level:0};svc.save(i.guild.id,{levels:c.levels});return i.reply('📉 XP reset to 0.');}
    if(['addxp','setxp','removexp'].includes(n)){
      const target=i.options.getUser('user'),amount=i.options.getInteger('amount');c.levels.users=c.levels.users||{};const current=c.levels.users[target.id]||{xp:0,level:0};
      const nextXp=n==='addxp'?Math.max(0,Number(current.xp)||0)+amount:n==='removexp'?Math.max(0,(Number(current.xp)||0)-amount):amount;
      const perLevel=Math.max(1,Number(c.levels.xpPerLevel)||500);c.levels.users[target.id]={xp:nextXp,level:Math.floor(nextXp/perLevel)};svc.save(i.guild.id,{levels:c.levels});
      return i.reply('✅ Updated '+target.username+': **'+fmt(nextXp)+' XP**, Level **'+Math.floor(nextXp/perLevel)+'**.');
    }
    if(n==='blacklist'){const id=i.options.getUser('user').id;if(!c.blacklist.includes(id))c.blacklist.push(id);svc.save(i.guild.id,{blacklist:c.blacklist});return i.reply('🚫 User blacklisted.');}
    if(n==='unblacklist'){const id=i.options.getUser('user').id;c.blacklist=c.blacklist.filter(x=>x!==id);svc.save(i.guild.id,{blacklist:c.blacklist});return i.reply('✅ User removed from blacklist.');}
    return false;
  }catch(e){console.error('[spidey SUITE]',n,e);if(i.replied||i.deferred)await i.editReply('❌ '+e.message).catch(()=>{});else await i.reply({content:'❌ '+e.message,ephemeral:true}).catch(()=>{});return true;}
}

async function handlePrefix(msg,ctx){
  if(!msg.guild||msg.author.bot)return false; const c=svc.get(msg.guild.id),p=c.prefix||'!';
  if(!msg.content.startsWith(p))return false; const a=msg.content.slice(p.length).trim().split(/\s+/),n=(a.shift()||'').toLowerCase(); if(!n)return false;
  if(c.blacklist?.includes(msg.author.id))return true;
  const reply=x=>msg.reply(x);
  const featureKey=featureForCommand(n);
  if(!featureIsOn(c,featureKey))return reply('That feature is currently disabled by this server.');
  try{
    if(n==='poll'){
      const cfg=c.polls||{};if(cfg.enabled===false)return reply('Polls are disabled in this server dashboard settings.');
      const raw=msg.content.slice(p.length+n.length).trim(),parts=raw.split('|'),question=String(parts.shift()||'').trim().slice(0,250),options=(parts.join('|')||'Yes,No').split(',').map(x=>x.trim()).filter(Boolean);
      const max=Math.min(20,Math.max(2,Number(cfg.maxOptions)||20));
      if(!question)return reply('Usage: '+p+'poll Question | Option 1, Option 2, Option 3');
      if(options.length<2||options.length>max||options.some(x=>x.length>80))return reply('Provide 2–'+max+' options, comma-separated, each 80 characters or fewer.');
      const pollId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),duration=Math.max(0,Number(cfg.defaultDurationMinutes)||0);
      const poll={id:pollId,question,options,votes:{},guildId:msg.guild.id,channelId:null,messageId:null,createdAt:Date.now(),expiresAt:duration?Date.now()+duration*60000:null,anonymous:cfg.anonymous!==false,allowMultipleVotes:cfg.allowMultipleVotes===true,closed:false};
      const counts=()=>options.map((_,index)=>Object.values(poll.votes).reduce((sum,v)=>sum+(Array.isArray(v)?v.includes(index):v===index?1:0),0));
      const embed=()=>{const e=new EmbedBuilder().setColor(0x5865f2).setTitle('📊 '+question).setDescription(options.map((option,index)=>'**'+(index+1)+'. '+option+'**\n'+counts()[index]+' vote'+(counts()[index]===1?'':'s')).join('\n\n')).setFooter({text:'Poll ID: '+pollId+(poll.allowMultipleVotes?' · Multiple choices allowed':' · One choice per member')+(poll.anonymous?' · Anonymous results':'')}).setTimestamp(new Date(poll.createdAt));if(poll.expiresAt)e.addFields({name:'Closes',value:'<t:'+Math.floor(poll.expiresAt/1000)+':R>'});return e;};
      const rows=[];for(let start=0;start<options.length;start+=5){const row=new ActionRowBuilder();options.slice(start,start+5).forEach((option,offset)=>row.addComponents(new ButtonBuilder().setCustomId('pollvote:'+pollId+':'+(start+offset)).setLabel(option).setStyle(ButtonStyle.Primary)));rows.push(row);}
      try{let target=msg.channel;if(cfg.defaultChannelId){const ch=msg.guild.channels.cache.get(cfg.defaultChannelId)||await msg.guild.channels.fetch(cfg.defaultChannelId).catch(()=>null);if(ch?.isTextBased?.())target=ch;}const sent=await target.send({embeds:[embed()],components:rows});poll.channelId=target.id;poll.messageId=sent.id;svc.save(msg.guild.id,{polls:{...cfg,active:{...(cfg.active||{}),[pollId]:poll}}});return reply('Poll created: '+sent.url+' · Poll ID: '+pollId);}
      catch(err){console.error('[PREFIX POLL CREATE]',err.message);return reply('Could not create poll. Check bot channel permissions.');}
    }
    if(n==='deletepoll'){
      const cfg=c.polls||{},pollId=String(a.shift()||'').trim(),poll=cfg.active?.[pollId];if(!poll)return reply('No active poll found with that ID.');
      if(cfg.adminDelete!==false&&!msg.member?.permissions?.has(PermissionFlagsBits.Administrator))return reply('Administrator permission required to delete polls.');
      try{const ch=msg.guild.channels.cache.get(poll.channelId)||await msg.guild.channels.fetch(poll.channelId).catch(()=>null);const sent=ch?.messages?await ch.messages.fetch(poll.messageId).catch(()=>null):null;if(sent)await sent.delete();const active={...(cfg.active||{})};delete active[pollId];svc.save(msg.guild.id,{polls:{...cfg,active}});return reply('Poll '+pollId+' deleted.');}
      catch(err){console.error('[PREFIX POLL DELETE]',err.message);return reply('Could not delete poll. Check bot Manage Messages permission.');}
    }
    if(n==='ping')return reply('🏓 Pong! '+ctx.client.ws.ping+'ms');
    if(n==='help')return reply('📚 Prefix: '+['ping','profile','rank','balance','daily','work','beg','inventory','shop','buy','give','rob','crime','serverinfo','userinfo','avatar','8ball','rps','dice','coin','trivia','purge','slowmode','lock','unlock','warn','warnings','kick','ban','unban','softban','announce','say','poll','deletepoll','sticky','setprefix','automod','auditlog','welcome','autorole','verify','addxp','setxp','removexp','resetxp','stats','invites'].map(x=>p+x).join(', '));
    if(n==='profile')return reply({embeds:[profile({user:msg.author},msg.author,c)]});
    if(n==='rank'){const u=c.levels.users?.[msg.author.id]||{level:0,xp:0},per=Math.max(1,Number(c.levels.xpPerLevel)||500),progress=(Number(u.xp)||0)%per;return reply('🏆 Level '+u.level+' | Total XP '+fmt(u.xp)+' | Progress '+fmt(progress)+'/'+fmt(per)+' XP | '+fmt(per-progress)+' XP to next level.');}
    if(n==='stats'){const s=achievements.getStats(msg.guild.id,msg.author.id);return reply('📊 **Your server stats**\nMessages: **'+fmt(s.message_count)+'**\nEmojis used: **'+fmt(s.emoji_count)+'**');}
    if(n==='invites'){
      const sub=(a.shift()||'stats').toLowerCase(),target=msg.mentions.users.first()||msg.author;
      if(sub==='leaderboard'){
        const rows=inviteTracker.leaderboard(msg.guild.id,10);
        return reply('🏆 **Invite leaderboard**\n'+(rows.length?rows.map((x,index)=>(index+1)+'. <@'+x.userId+'> — **'+fmt(x.active)+'** active invites').join('\n'):'No invite data has been recorded yet.'));
      }
      if(['add','remove','reset'].includes(sub)){
        if(!msg.member?.permissions?.has(PermissionFlagsBits.Administrator))return reply('❌ Administrator permission required to edit invite totals.');
        if(!msg.mentions.users.first())return reply('Usage: '+p+'invites '+sub+' @member'+(sub==='reset'?'':' amount'));
        const amount=Number(a[a.length-1]||0);
        if(sub!=='reset'&&(!Number.isInteger(amount)||amount<1))return reply('Enter a positive whole-number invite amount.');
        inviteTracker.adjust(msg.guild.id,target.id,sub==='reset'?'reset':sub,amount);
        return reply('✅ Updated invite totals for '+target.username+'.');
      }
      const stats=inviteTracker.getStats(msg.guild.id,target.id);
      return reply('📨 **'+target.username+' invite stats**\nSuccessful joins: **'+fmt(stats.joins)+'**\nMembers left: **'+fmt(stats.leaves)+'**\nActive invites: **'+fmt(stats.active)+'**');
    }
    if(['addxp','setxp','removexp','resetxp'].includes(n)){
      if(!msg.member?.permissions?.has(PermissionFlagsBits.Administrator))return reply('❌ Administrator permission required to edit XP.');
      const target=msg.mentions.users.first();if(!target)return reply('Usage: '+p+n+' @member'+(n==='resetxp'?'':' amount'));
      c.levels.users=c.levels.users||{};const current=c.levels.users[target.id]||{xp:0,level:0};let nextXp=0;
      if(n==='resetxp')nextXp=0;else{const amount=Number(a[1]);if(!Number.isInteger(amount)||amount<0||(n!=='setxp'&&amount===0))return reply('❌ Enter a valid whole-number XP amount.');nextXp=n==='addxp'?Math.max(0,Number(current.xp)||0)+amount:n==='removexp'?Math.max(0,(Number(current.xp)||0)-amount):amount;}
      const per=Math.max(1,Number(c.levels.xpPerLevel)||500);c.levels.users[target.id]={xp:nextXp,level:Math.floor(nextXp/per)};svc.save(msg.guild.id,{levels:c.levels});return reply('✅ Updated '+target.username+': '+fmt(nextXp)+' total XP, Level '+Math.floor(nextXp/per)+'.');
    }
    if(n==='balance'){const m=svc.balance(msg.guild.id,msg.author.id);return reply('💰 Cash: '+fmt(m.cash)+' | Bank: '+fmt(m.bank));}
    if(n==='daily'){const e=c.economy,m=svc.balance(msg.guild.id,msg.author.id);if(Date.now()-m.daily<86400000)return reply('⏳ Daily cooldown active.');m.cash+=e.daily||100;m.daily=Date.now();svc.save(msg.guild.id,{economy:e});return reply('💰 Daily claimed.');}
    if(n==='work'||n==='beg'){const e=c.economy,m=svc.balance(msg.guild.id,msg.author.id),x=n==='work'?e.workMin+Math.floor(Math.random()*(e.workMax-e.workMin+1)):5+Math.floor(Math.random()*26);m.cash+=x;svc.save(msg.guild.id,{economy:e});return reply('💰 Earned '+x+' coins.');}
    if(n==='inventory')return reply('🎒 '+((svc.balance(msg.guild.id,msg.author.id).inventory||[]).join(', ')||'Empty'));
    if(n==='shop')return reply((c.economy.shop||[]).map(x=>x.name+': '+x.price).join('\n')||'Shop is empty.');
    if(n==='buy'){const e=c.economy,m=svc.balance(msg.guild.id,msg.author.id),it=(e.shop||[]).find(x=>x.name.toLowerCase()===a.join(' ').toLowerCase());if(!it)return reply('❌ Item not found.');if(m.cash<it.price)return reply('❌ Not enough cash.');m.cash-=it.price;m.inventory.push(it.name);svc.save(msg.guild.id,{economy:e});return reply('🛒 Bought '+it.name+'.');}
    if(n==='give'){const to=msg.mentions.users.first(),x=Number(a[1]),m=svc.balance(msg.guild.id,msg.author.id);if(!to||!x||m.cash<x)return reply('Usage: '+p+'give @user amount');const t=svc.balance(msg.guild.id,to.id);m.cash-=x;t.cash+=x;svc.save(msg.guild.id,{economy:c.economy});return reply('💸 Sent '+x+' coins.');}
    if(n==='rob'||n==='crime'){const m=svc.balance(msg.guild.id,msg.author.id),x=10+Math.floor(Math.random()*91);if(Math.random()<.55)m.cash+=x;else m.cash=Math.max(0,m.cash-Math.ceil(x/2));svc.save(msg.guild.id,{economy:c.economy});return reply('🎲 Economy action complete.');}
    if(n==='serverinfo')return reply('🏠 '+msg.guild.name+' | Members '+msg.guild.memberCount+' | Channels '+msg.guild.channels.cache.size+' | Roles '+msg.guild.roles.cache.size);
    if(n==='userinfo'){const m=msg.mentions.members.first()||msg.member;return reply('👤 '+m.user.tag+' | '+m.id+' | Joined '+(m.joinedAt?.toISOString()||'unknown'));}
    if(n==='avatar'){const u=msg.mentions.users.first()||msg.author;return reply(u.displayAvatarURL({size:1024,dynamic:true}));}
    if(n==='8ball')return reply(['Yes.','No.','Maybe.','Definitely.','Ask again later.'][Math.floor(Math.random()*5)]);
    if(n==='rps'){const c2=['rock','paper','scissors'],x=a[0]?.toLowerCase(),b=c2[Math.floor(Math.random()*3)];if(!c2.includes(x))return reply('Usage: '+p+'rps rock|paper|scissors');return reply('You '+x+' | Me '+b);}
    if(n==='dice')return reply('🎲 '+(1+Math.floor(Math.random()*6)));
    if(n==='coin')return reply('🪙 '+(Math.random()<.5?'Heads':'Tails'));
    if(n==='trivia')return reply('🧠 Trivia: What is the capital of France? Answer: Paris.');
    if(n==='purge'){if(!msg.member.permissions.has(PermissionFlagsBits.ManageMessages))return reply('❌ Permission denied.');const d=await msg.channel.bulkDelete(Math.min(100,Math.max(1,Number(a[0])||1)),true);return reply('🧹 Deleted '+d.size+' messages.');}
    if(n==='slowmode'){if(!msg.member.permissions.has(PermissionFlagsBits.ManageChannels))return reply('❌ Permission denied.');await msg.channel.setRateLimitPerUser(Math.min(21600,Math.max(0,Number(a[0])||0)));return reply('🐢 Slowmode updated.');}
    if(n==='lock'||n==='unlock'){if(!msg.member.permissions.has(PermissionFlagsBits.ManageChannels))return reply('❌ Permission denied.');await msg.channel.permissionOverwrites.edit(msg.guild.roles.everyone,{SendMessages:n==='unlock'?null:false});return reply(n==='lock'?'🔒 Locked.':'🔓 Unlocked.');}
    if(n==='say'){if(!msg.member.permissions.has(PermissionFlagsBits.ManageMessages))return reply('❌ Permission denied.');await msg.channel.send(a.join(' '));return reply('Sent.');}
    if(n==='announce'){if(!msg.member.permissions.has(PermissionFlagsBits.Administrator))return reply('❌ Permission denied.');await msg.channel.send({embeds:[new EmbedBuilder().setColor(0x6d3df5).setTitle('Announcement').setDescription(a.join(' ')).setTimestamp()]});return reply('📣 Sent.');}
    if(n==='setprefix'){if(!msg.member.permissions.has(PermissionFlagsBits.Administrator))return reply('❌ Permission denied.');c.prefix=a[0]||'!';svc.save(msg.guild.id,{prefix:c.prefix});return reply('Prefix set to '+c.prefix);}
    if(n==='automod'){if(!msg.member.permissions.has(PermissionFlagsBits.Administrator))return reply('❌ Permission denied.');c.automod.enabled=a[0]!=='off';svc.save(msg.guild.id,{automod:c.automod});return reply('AutoMod '+(c.automod.enabled?'on':'off'));}
    if(n==='auditlog'){if(!msg.member.permissions.has(PermissionFlagsBits.Administrator))return reply('❌ Permission denied.');const ch=msg.mentions.channels.first();if(!ch)return reply('Mention a channel.');c.audit={enabled:true,channelId:ch.id};svc.save(msg.guild.id,{audit:c.audit});return reply('Audit logging enabled.');}
    if(n==='welcome'||n==='goodbye'){if(!msg.member.permissions.has(PermissionFlagsBits.Administrator))return reply('❌ Permission denied.');const kind=n,cap=kind[0].toUpperCase()+kind.slice(1),current=await serverMessages.getConfig(msg.guild.id);if(a[0]?.toLowerCase()==='off'){current['enable'+cap]=false;await serverMessages.setConfig(msg.guild.id,current);return reply(kind+' messages disabled.');}const channel=msg.mentions.channels.first();if(channel)current[kind+'Channel']=channel.id;const message=msg.content.slice((c.prefix||'!').length+kind.length).replace(channel?.toString()||'','').trim();if(message){current[kind+'Message']=message;current[kind+'Embed']=null;current[kind+'Type']='text';}current['enable'+cap]=true;await serverMessages.setConfig(msg.guild.id,current);return reply(kind+' settings saved.');}if(n==='autorole'){if(!msg.member.permissions.has(PermissionFlagsBits.Administrator))return reply('❌ Permission denied.');const r=msg.mentions.roles.first();c.autorole.enabled=true;c.autorole.roleId=r?.id||null;svc.save(msg.guild.id,{autorole:c.autorole});return reply('Autorole saved.');}
    if(n==='verify'){if(!msg.member.permissions.has(PermissionFlagsBits.Administrator))return reply('❌ Permission denied.');const r=msg.mentions.roles.first();if(!r)return reply('Mention a role.');c.verification={roleId:r.id};svc.save(msg.guild.id,{verification:c.verification});return reply('Verification role saved.');}
    if(n==='sticky'){if(!msg.member.permissions.has(PermissionFlagsBits.Administrator))return reply('❌ Permission denied.');c.sticky[msg.channel.id]=a.join(' ');svc.save(msg.guild.id,{sticky:c.sticky});return reply('Sticky saved.');}
    if(n==='warn'||n==='warnings'||n==='clearwarnings'||n==='kick'||n==='ban'||n==='unban'||n==='softban'){
      if(!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)&&!msg.member.permissions.has(PermissionFlagsBits.KickMembers)&&!msg.member.permissions.has(PermissionFlagsBits.BanMembers))return reply('❌ Permission denied.');
      const m=msg.mentions.members.first();
      if(n==='warn'){if(!m)return reply('Mention a member.');return reply('⚠️ Warning added. Total: '+svc.addWarning(msg.guild.id,m.id,{reason:a.slice(1).join(' ')||'No reason',by:msg.author.id,at:Date.now()}).length);}
      if(n==='warnings'){if(!m)return reply('Mention a member.');return reply(svc.getWarnings(msg.guild.id,m.id).map((x,i)=>(i+1)+'. '+x.reason).join('\n')||'No warnings.');}
      if(n==='clearwarnings'){if(!m)return reply('Mention a member.');const z=svc.get(msg.guild.id);z.warnings[m.id]=[];svc.save(msg.guild.id,{warnings:z.warnings});return reply('Warnings cleared.');}
      if(n==='kick'){if(!m?.kickable)return reply('Cannot kick.');await m.kick(a.slice(1).join(' ')||'SPIDEY BOT');return reply('👢 Kicked.');}
      if(n==='ban'){if(!m?.bannable)return reply('Cannot ban.');await m.ban({reason:a.slice(1).join(' ')||'SPIDEY BOT'});return reply('🔨 Banned.');}
      if(n==='unban'){await msg.guild.bans.remove(a[0]);return reply('✅ Unbanned.');}
      if(n==='softban'){if(!m?.bannable)return reply('Cannot softban.');await m.ban({reason:'Softban'});await msg.guild.bans.remove(m.id);return reply('✅ Softbanned.');}
    }
    return false;
  }catch(e){console.error('[spidey PREFIX]',n,e);return reply('❌ '+e.message);}
}

const autoModRate=new Map(),autoModRepeat=new Map();
const BUILTIN_TERMS={
 profanity:['fuck','shit','bitch','asshole','bastard','motherfucker'],
 slurs:['nigger','faggot','kike','chink','spic'],
 sexual:['porn','hentai','blowjob','onlyfans','dickpic','cumshot']
};
const normalizeText=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function automodTerms(c){
 const a=c.automod||{},terms=[...(Array.isArray(a.words)?a.words:[])];
 if(a.presetProfanity!==false)terms.push(...BUILTIN_TERMS.profanity);
 if(a.presetSlurs)terms.push(...BUILTIN_TERMS.slurs);
 if(a.presetSexual)terms.push(...BUILTIN_TERMS.sexual);
 for(const rule of (Array.isArray(a.customRules)?a.customRules:[]))if(Array.isArray(rule.terms))terms.push(...rule.terms);
 return [...new Set(terms.map(normalizeText).filter(Boolean))];
}
function findAutoModTerm(text,c){
 const hay=' '+normalizeText(text)+' ';
 return automodTerms(c).find(term=>hay.includes(' '+term+' '))||null;
}
async function sendAutoModAlert(guild,c,details){
 const a=c.automod||{};if(a.alertStaff===false||!a.logChannelId)return;
 try{const channel=guild.channels.cache.get(a.logChannelId)||await guild.channels.fetch(a.logChannelId).catch(()=>null);if(!channel?.send)return;
 await channel.send({embeds:[new EmbedBuilder().setColor(0xd94f70).setTitle('🛡️ AutoMod alert').setDescription(details.slice(0,3900)).setTimestamp()]});
 }catch(e){console.error('[AUTOMOD ALERT]',e.message);}
}
async function handleAutoModViolation(msg,c,reason){
 const a=c.automod||{},action=a.action||'delete';
 if(action!=='alert')await msg.delete().catch(()=>{});
 if(action==='timeout'&&msg.member?.moderatable){
  const minutes=Math.max(1,Math.min(40320,Number(a.timeoutMinutes)||10));
  await msg.member.timeout(minutes*60000,'SPIDEY BOT AutoMod: '+reason).catch(e=>console.error('[AUTOMOD TIMEOUT]',e.message));
 }
 if(a.notifyUser!==false&&action!=='alert')await msg.author.send('Your message in **'+msg.guild.name+'** was removed by AutoMod. Reason: '+reason+'.').catch(()=>{});
 await sendAutoModAlert(msg.guild,c,'**Member:** '+msg.author.tag+' ('+msg.author.id+')\\n**Channel:** <#'+msg.channel.id+'>\\n**Reason:** '+reason+'\\n**Action:** '+action+'\\n**Message:** '+String(msg.content||'[no text]').slice(0,900));
}
async function screenAutoModMember(member,c,source){
 const a=c.automod||{};if(!featureIsOn(c,'automod')||a.enabled===false)return;
 const checks=[];
 if(a.screenUsername!==false)checks.push(['username',member.user.username]);
 if(a.screenNickname!==false&&member.nickname)checks.push(['server nickname',member.nickname]);
 const match=checks.map(([label,value])=>({label,term:findAutoModTerm(value,c)})).find(x=>x.term);
 if(!match)return;
 if(a.screenActionTimeout&&member.moderatable)await member.timeout(Math.max(1,Math.min(40320,Number(a.timeoutMinutes)||10))*60000,'SPIDEY BOT AutoMod: prohibited profile term').catch(()=>{});
 await sendAutoModAlert(member.guild,c,'**Member:** '+member.user.tag+' ('+member.id+')\\n**Profile field:** '+match.label+'\\n**Detected term:** '+match.term+'\\n**Event:** '+source+'\\n**Action:** '+(a.screenActionTimeout?'timeout attempted':'alert only'));
}


async function writeAuditEvent(guild,entry,eventKey){
 try{
  const c=svc.get(guild.id),a=c.audit||{},settings=a.events||{};
  if(a.enabled!==true||settings[eventKey]===false)return;
  const ignored=Array.isArray(a.ignoreChannelIds)?a.ignoreChannelIds:[];
  if(entry.channelId&&ignored.includes(entry.channelId))return;
  const enriched={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),time:new Date().toISOString(),...entry};
  const entries=[enriched,...(Array.isArray(a.entries)?a.entries:[])].slice(0,100);
  svc.save(guild.id,{audit:{...a,entries}});
  if(!a.channelId)return;
  const channel=guild.channels.cache.get(a.channelId)||await guild.channels.fetch(a.channelId).catch(()=>null);
  if(!channel?.send)return;
  const embed=new EmbedBuilder().setColor(enriched.color||0x5865f2).setTitle(('Audit · '+(enriched.title||'Server event')).slice(0,256)).setDescription(String(enriched.description||'No additional details').slice(0,3900)).addFields(
   {name:'When',value:enriched.time,inline:true},
   {name:'Actor',value:String(enriched.actor||'Unknown / unavailable').slice(0,1024),inline:true},
   {name:'Target',value:String(enriched.target||'Not applicable').slice(0,1024),inline:true}
  ).setTimestamp(new Date(enriched.time));
  if(enriched.channel)embed.addFields({name:'Channel',value:String(enriched.channel).slice(0,1024),inline:true});
  await channel.send({embeds:[embed]});
 }catch(e){console.error('[AUDIT LOG]',e.message);}
}
const auditActor=async(guild,type,targetId)=>{
 try{const logs=await guild.fetchAuditLogs({type,limit:5});const now=Date.now();const entry=logs.entries.find(x=>(!targetId||x.target?.id===targetId)&&now-x.createdTimestamp<15000);return entry?.executor?.tag||entry?.executor?.username||null;}catch{return null;}
};

function registerSpideyHandlers(client){
  ticketRuntime.register(client);
  client.on('interactionCreate',async interaction=>{
    if(!interaction.isButton?.()||!interaction.customId?.startsWith('pollvote:')||!interaction.guild)return;
    const [,pollId,rawIndex]=interaction.customId.split(':'),optionIndex=Number(rawIndex);
    try{
      const cfg=svc.get(interaction.guild.id),pollCfg=cfg.polls||{},poll=pollCfg.active?.[pollId];
      if(!poll||poll.closed){await interaction.reply({content:'This poll is no longer active.',ephemeral:true});return;}
      if(poll.expiresAt&&Date.now()>=poll.expiresAt){await interaction.reply({content:'This poll has expired.',ephemeral:true});return;}
      if(!Number.isInteger(optionIndex)||optionIndex<0||optionIndex>=poll.options.length){await interaction.reply({content:'That poll option is invalid.',ephemeral:true});return;}
      const voter=interaction.user.id,old=poll.votes?.[voter];
      if(poll.allowMultipleVotes){const selected=Array.isArray(old)?old.slice():old===undefined?[]:[old];const next=selected.includes(optionIndex)?selected.filter(x=>x!==optionIndex):[...selected,optionIndex];if(next.length)poll.votes[voter]=next;else delete poll.votes[voter];}
      else {if(old===optionIndex)delete poll.votes[voter];else poll.votes[voter]=optionIndex;}
      const counts=poll.options.map((_,index)=>Object.values(poll.votes||{}).reduce((sum,v)=>sum+(Array.isArray(v)?v.includes(index):v===index?1:0),0));
      const embed=new EmbedBuilder().setColor(0x5865f2).setTitle('📊 '+poll.question).setDescription(poll.options.map((option,index)=>'**'+(index+1)+'. '+option+'**\n'+counts[index]+' vote'+(counts[index]===1?'':'s')).join('\n\n')).setFooter({text:'Poll ID: '+pollId+(poll.allowMultipleVotes?' · Multiple choices allowed':' · One choice per member')+(poll.anonymous?' · Anonymous results':'')}).setTimestamp(new Date(poll.createdAt||Date.now()));
      if(poll.expiresAt)embed.addFields({name:'Closes',value:'<t:'+Math.floor(poll.expiresAt/1000)+':R>'});
      const rows=[];for(let start=0;start<poll.options.length;start+=5){const row=new ActionRowBuilder();poll.options.slice(start,start+5).forEach((option,offset)=>row.addComponents(new ButtonBuilder().setCustomId('pollvote:'+pollId+':'+(start+offset)).setLabel(option).setStyle(ButtonStyle.Primary).setDisabled(!!poll.closed)));rows.push(row);}
      svc.save(interaction.guild.id,{polls:{...pollCfg,active:{...(pollCfg.active||{}),[pollId]:poll}}});
      await interaction.update({embeds:[embed],components:rows});
    }catch(err){console.error('[POLL VOTE]',err.message);if(!interaction.replied&&!interaction.deferred)await interaction.reply({content:'Could not record your vote. Please try again.',ephemeral:true}).catch(()=>{});}
  });
  inviteTracker.initialize(client,svc);
  client.on('messageDelete',async msg=>{
   try{if(!msg.guild)return;const content=msg.content||msg.embeds?.map(e=>e.description||'').join(' ')||'[Content unavailable — message was not cached]';await writeAuditEvent(msg.guild,{type:'messageDelete',title:'Message deleted',description:content.slice(0,1800),actor:await auditActor(msg.guild, 'MessageDelete',msg.author?.id),target:msg.author?.tag||'Unknown',channel:'#'+(msg.channel?.name||'unknown'),channelId:msg.channel?.id,color:0xe74c3c},'messageDelete');}catch(e){console.error('[AUDIT MESSAGE DELETE]',e.message);}
  });
  client.on('messageUpdate',async(oldMsg,newMsg)=>{
   try{if(!newMsg.guild)return;const before=oldMsg.content,after=newMsg.content;if(before===after)return;await writeAuditEvent(newMsg.guild,{type:'messageUpdate',title:'Message edited',description:'**Before:** '+String(before||'[Unavailable]').slice(0,850)+'\n**After:** '+String(after||'[Empty]').slice(0,850),actor:newMsg.author?.tag||'Author',target:newMsg.author?.tag||'Unknown',channel:'#'+(newMsg.channel?.name||'unknown'),channelId:newMsg.channel?.id,color:0xe67e22},'messageUpdate');}catch(e){console.error('[AUDIT MESSAGE UPDATE]',e.message);}
  });
  client.on('messageDeleteBulk',async(messages,channel)=>{
   try{const guild=channel.guild;if(!guild)return;await writeAuditEvent(guild,{type:'messageDeleteBulk',title:'Bulk messages deleted',description:messages.size+' messages deleted in #'+channel.name,actor:await auditActor(guild,'MessageBulkDelete'),target:messages.size+' messages',channel:'#'+channel.name,channelId:channel.id,color:0xe74c3c},'messageDeleteBulk');}catch(e){console.error('[AUDIT BULK DELETE]',e.message);}
  });
  client.on('guildMemberAdd',member=>writeAuditEvent(member.guild,{type:'memberJoin',title:'Member joined',description:member.user.tag+' joined the server.',target:member.user.tag,color:0x2ecc71},'memberJoin'));
  client.on('guildMemberRemove',member=>writeAuditEvent(member.guild,{type:'memberLeave',title:'Member left',description:(member.user?.tag||member.id)+' left the server.',target:member.user?.tag||member.id,color:0xe67e22},'memberLeave'));
  client.on('guildMemberUpdate',async(oldMember,newMember)=>{
   try{const changes=[];if(oldMember.nickname!==newMember.nickname)changes.push('Nickname: '+(oldMember.nickname||oldMember.user.username)+' → '+(newMember.nickname||newMember.user.username));const before=oldMember.roles.cache.map(r=>r.id).filter(id=>id!==newMember.guild.id),after=newMember.roles.cache.map(r=>r.id).filter(id=>id!==newMember.guild.id);if(JSON.stringify(before.sort())!==JSON.stringify(after.sort()))changes.push('Roles updated');if(oldMember.user.username!==newMember.user.username)changes.push('Username: '+oldMember.user.username+' → '+newMember.user.username);if(changes.length)await writeAuditEvent(newMember.guild,{type:'memberUpdate',title:'Member profile or roles changed',description:changes.join('\n'),actor:await auditActor(newMember.guild,'MemberUpdate',newMember.id),target:newMember.user.tag,color:0xe67e22},'memberUpdate');}catch(e){console.error('[AUDIT MEMBER UPDATE]',e.message);}
  });
  client.on('guildBanAdd',async ban=>writeAuditEvent(ban.guild,{type:'ban',title:'Member banned',description:'A member was banned from the server.',actor:await auditActor(ban.guild,'MemberBanAdd',ban.user.id),target:ban.user.tag,color:0xe74c3c},'bans'));
  client.on('guildBanRemove',async ban=>writeAuditEvent(ban.guild,{type:'unban',title:'Member unbanned',description:'A member was unbanned from the server.',actor:await auditActor(ban.guild,'MemberBanRemove',ban.user.id),target:ban.user.tag,color:0x2ecc71},'bans'));
  client.on('voiceStateUpdate',async(oldState,newState)=>{
   try{const oldId=oldState.channelId,newId=newState.channelId;if(oldId===newId&&oldState.serverMute===newState.serverMute&&oldState.serverDeaf===newState.serverDeaf)return;const action=!oldId&&newId?'joined voice':oldId&&!newId?'left voice':'voice state changed';await writeAuditEvent(newState.guild,{type:'voice',title:'Voice activity',description:(newState.member?.user?.tag||newState.id)+' '+action+'.'+(oldId!==newId?' '+(oldState.channel?.name||'No channel')+' → '+(newState.channel?.name||'No channel'):''),target:newState.member?.user?.tag||newState.id,channel:newState.channel?.name||oldState.channel?.name||'Voice',color:0x5865f2},'voice');}catch(e){console.error('[AUDIT VOICE]',e.message);}
  });
  for(const [event,action] of [['channelCreate','created'],['channelDelete','deleted']])client.on(event,channel=>{if(channel.guild)writeAuditEvent(channel.guild,{type:'channels',title:'Channel '+action,description:'#'+channel.name+' ('+channel.id+') was '+action+'.',target:channel.name,color:0x5865f2},'channels');});
  client.on('channelUpdate',(oldChannel,newChannel)=>{if(newChannel.guild)writeAuditEvent(newChannel.guild,{type:'channels',title:'Channel updated',description:oldChannel.name+' → '+newChannel.name+' ('+newChannel.id+')',target:newChannel.name,color:0xe67e22},'channels');});
  for(const [event,action] of [['roleCreate','created'],['roleDelete','deleted']])client.on(event,role=>writeAuditEvent(role.guild,{type:'roles',title:'Role '+action,description:'@'+role.name+' ('+role.id+') was '+action+'.',target:role.name,color:0x5865f2},'roles'));
  client.on('roleUpdate',(oldRole,newRole)=>writeAuditEvent(newRole.guild,{type:'roles',title:'Role updated',description:'@'+oldRole.name+' → @'+newRole.name+' ('+newRole.id+')',target:newRole.name,color:0xe67e22},'roles'));
  client.on('guildUpdate',(oldGuild,newGuild)=>{if(oldGuild.name!==newGuild.name||oldGuild.icon!==newGuild.icon)writeAuditEvent(newGuild,{type:'guild',title:'Server updated',description:'Server settings or identity changed: '+oldGuild.name+' → '+newGuild.name+'.',target:newGuild.name,color:0xe67e22},'guild');});

  client.on('guildMemberAdd',async member=>{
    const c=svc.get(member.guild.id);
    if(!featureIsOn(c,'welcome'))return;
    if(c.autorole.enabled&&c.autorole.roleId){
      try{const role=member.guild.roles.cache.get(c.autorole.roleId)||await member.guild.roles.fetch(c.autorole.roleId).catch(()=>null);if(role&&!member.roles.cache.has(role.id))await member.roles.add(role,'Configured automatic welcome role');}
      catch(e){console.error('[spidey AUTOROLE]',e.message);}
    }
    try{
      const cfg=await serverMessages.getConfig(member.guild.id);
      if(!cfg.enableWelcome||!cfg.welcomeChannel)return;
      const channel=member.guild.channels.cache.get(cfg.welcomeChannel)||await member.guild.channels.fetch(cfg.welcomeChannel).catch(()=>null);
      if(!channel?.send)return;
      const payload={},message=serverMessages.replaceVariables(cfg.welcomeMessage,member,member.guild),embed=serverMessages.buildEmbed(cfg.welcomeEmbed,member,member.guild);
      if(message)payload.content=message;if(embed)payload.embeds=[embed];
      if(Object.keys(payload).length)await channel.send(payload);
    }catch(e){console.error('[spidey WELCOME]',e.message);}
  });
  client.on('guildMemberRemove',async member=>{
    try{
      const c=svc.get(member.guild.id);if(!featureIsOn(c,'welcome'))return;
      const cfg=await serverMessages.getConfig(member.guild.id);
      if(!cfg.enableGoodbye||!cfg.goodbyeChannel)return;
      const channel=member.guild.channels.cache.get(cfg.goodbyeChannel)||await member.guild.channels.fetch(cfg.goodbyeChannel).catch(()=>null);
      if(!channel?.send)return;
      const payload={},message=serverMessages.replaceVariables(cfg.goodbyeMessage,member,member.guild),embed=serverMessages.buildEmbed(cfg.goodbyeEmbed,member,member.guild);
      if(message)payload.content=message;if(embed)payload.embeds=[embed];
      if(Object.keys(payload).length)await channel.send(payload);
    }catch(e){console.error('[spidey GOODBYE]',e.message);}
  });
  client.on('messageCreate',async msg=>{
    try{
      if(!msg.guild||msg.author.bot)return;
      const c=svc.get(msg.guild.id),a=c.automod||{};
      try{await achievements.trackMessage(msg,{...(c.achievements||{}),enabled:c.plugins?.achievements!==false&&(c.achievements?.enabled!==false)});}catch(err){console.error('[ACHIEVEMENTS TRACKER]',err.message);}
      if(featureIsOn(c,'automod')&&a.enabled===true){
        const content=String(msg.content||''),now=Date.now(),key=msg.guild.id+':'+msg.author.id;
        let reason=null;
        if(a.antiInvite!==false&&/(?:discord\.gg\/|discord(?:app)?\.com\/invite\/)/i.test(content))reason='Discord invite link';
        if(!reason&&a.antiLink&&/https?:\/\//i.test(content)){
          const urls=content.match(/https?:\/\/[^\s<>]+/gi)||[],blockedDomains=Array.isArray(a.blockedDomains)?a.blockedDomains.map(x=>String(x).toLowerCase().replace(/^https?:\/\//,'').split('/')[0]).filter(Boolean):[];
          const suspicious=['free-nitro','nitro-free','gift-discord','steamcommunity','robux-free','discordapp.com/invite','bit.ly/discord'];
          if(urls.some(raw=>{let host='';try{host=new URL(raw).hostname.toLowerCase();}catch{}return suspicious.some(x=>raw.toLowerCase().includes(x))||blockedDomains.some(x=>host===x||host.endsWith('.'+x));}))reason='Suspicious or blocked link';
        }
        const term=!reason?findAutoModTerm(content,c):null;
        if(!reason&&term)reason='Blocked keyword matched';
        if(!reason&&a.massMention!==false){
          const count=(msg.mentions.users.size||0)+(msg.mentions.roles.size||0)+(msg.mentions.everyone?1:0);
          if(count>Math.max(1,Math.min(50,Number(a.maxMentions)||5)))reason='Mass mention limit exceeded';
        }
        if(!reason&&a.caps&&content.length>=12){
          const letters=content.match(/[A-Za-z]/g)||[],upper=content.match(/[A-Z]/g)||[];
          if(letters.length>=12&&upper.length/letters.length>=0.8)reason='Excessive capitalisation';
        }
        if(!reason&&a.antiDuplicate){
          const repeated=autoModRepeat.get(key);
          if(repeated&&repeated.content===normalizeText(content)&&now-repeated.at<30000)reason='Repeated identical message';
          autoModRepeat.set(key,{content:normalizeText(content),at:now});
        }
        if(!reason&&a.antiSpam!==false){
          const windowMs=Math.max(1000,Math.min(60000,Number(a.windowMs)||8000)),threshold=Math.max(2,Math.min(30,Number(a.maxMessages)||6));
          const hits=(autoModRate.get(key)||[]).filter(t=>now-t<windowMs);hits.push(now);autoModRate.set(key,hits);
          if(hits.length>=threshold)reason='Rapid-message spam';
        }
        if(reason){await handleAutoModViolation(msg,c,reason);return;}
      }
      if(featureIsOn(c,'levels')&&c.levels.enabled){
        const cooldownMs=Math.max(0,Math.min(3600000,Number(c.levels.xpCooldownSeconds??60)||0))*1000;
        const cooldownKey=msg.guild.id+':'+msg.author.id,now=Date.now(),last=levelXpCooldown.get(cooldownKey)||0;
        if(now-last>=cooldownMs){
          levelXpCooldown.set(cooldownKey,now);
          if(levelXpCooldown.size>10000){for(const [key,time] of levelXpCooldown){if(now-time>3600000)levelXpCooldown.delete(key);}}
          const r=svc.addXp(msg.guild.id,msg.author.id,Math.max(0,Math.min(10000,Number(c.levels.xpPerMessage)||15)));
          if(r.levelled&&c.levels.announce&&c.levels.announceChannel){
            const ch=msg.guild.channels.cache.get(c.levels.announceChannel)||await msg.guild.channels.fetch(c.levels.announceChannel).catch(()=>null);
            if(ch?.send){const perLevel=Math.max(1,Number(c.levels.xpPerLevel)||500),progress=r.user.xp%perLevel;const embed=new EmbedBuilder().setColor(0x6d3df5).setTitle('🎉 Level Up!').setThumbnail(msg.author.displayAvatarURL({size:128})).setDescription(msg.author+' reached **Level '+r.user.level+'**!').addFields({name:'Current XP',value:fmt(r.user.xp),inline:true},{name:'Level',value:String(r.user.level),inline:true},{name:'XP to next level',value:fmt(perLevel-progress),inline:true}).setTimestamp();ch.send({embeds:[embed]}).catch(()=>{});}
          }
        }
      }
      if(featureIsOn(c,'automations')&&c.sticky?.[msg.channel.id]){
        if(!registerSpideyHandlers.sticky)registerSpideyHandlers.sticky=new Map();
        const stickyKey=msg.guild.id+':'+msg.channel.id,oldSticky=registerSpideyHandlers.sticky.get(stickyKey);
        if(oldSticky)oldSticky.delete().catch(()=>{});
        const sent=await msg.channel.send('📌 '+c.sticky[msg.channel.id]).catch(()=>null);
        if(sent)registerSpideyHandlers.sticky.set(stickyKey,sent);
      }
    }catch(e){console.error('[spidey MESSAGE]',e.message);}
  });
  const syncCustomCommands=async()=>{
    try{
      if(!client.application?.commands)return;
      for(const guild of client.guilds.cache.values()){
        const cfg=svc.get(guild.id),items=Array.isArray(cfg.customCommands?.items)?cfg.customCommands.items:[];
        const desired=new Map(items.filter(x=>x.enabled!==false&&/^[a-z0-9-]{1,32}$/.test(String(x.name||''))).map(x=>[x.name,x]));
        const existing=await guild.commands.fetch();
        for(const command of existing.values()){
          if(command.description==='SPIDEY BOT custom counter command'&&!desired.has(command.name)){
            await guild.commands.delete(command.id).catch(err=>console.error('[CUSTOM COMMAND DELETE]',err.message));
          }
        }
        for(const [name] of desired){
          const current=existing.find(x=>x.name===name);
          if(current){if(current.description!=='SPIDEY BOT custom counter command')console.warn('[CUSTOM COMMAND] Name conflicts with an existing slash command:',name);continue;}
          try{await guild.commands.create({name,description:'SPIDEY BOT custom counter command',type:1});}
          catch(err){console.error('[CUSTOM COMMAND REGISTER]',guild.id,name,err.message);}
        }
      }
    }catch(err){console.error('[CUSTOM COMMAND SYNC]',err.message);}
  };
  setTimeout(()=>syncCustomCommands(),5000);
  const customCommandSyncTimer=setInterval(syncCustomCommands,45000);
  customCommandSyncTimer.unref?.();
  client.on('guildMemberUpdate',async(_oldMember,newMember)=>{
    try{const c=svc.get(newMember.guild.id);await screenAutoModMember(newMember,c,'profile updated');}
    catch(e){console.error('[AUTOMOD PROFILE UPDATE]',e.message);}
  });
}
module.exports={execute,handlePrefix,registerSpideyHandlers};
