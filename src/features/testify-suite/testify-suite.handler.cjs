const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const svc=require('./testify-suite.service.cjs');
const advice=['Be curious before being certain.','Small consistent actions compound.','Ask clear questions and verify assumptions.','Leave systems easier to understand than you found them.'];
const jokes=['Why did the scarecrow win an award? Because he was outstanding in his field.','I only know 25 letters of the alphabet. I do not know y.','Why do programmers prefer dark mode? Because light attracts bugs.'];
const wyr=['Unlimited money or unlimited time?','Always early or always prepared?','Explore space or the deep ocean?'];
const fmt=n=>new Intl.NumberFormat().format(Math.max(0,n||0));
const isAdmin=i=>!!i.member?.permissions?.has(PermissionFlagsBits.Administrator);
const who=i=>i.options.getUser('user')||i.user;
const COMMAND_FEATURE={
  avatar:'members',userinfo:'members',serverinfo:'members',roleinfo:'members',botinfo:'system',membercount:'members',permissions:'members',profile:'members',rank:'levels',
  daily:'economy',beg:'economy',deposit:'economy',withdraw:'economy',inventory:'economy',shop:'economy',buy:'economy',give:'economy',rob:'economy',crime:'economy',pet:'economy',
  poll:'polls',calculator:'community',ascii:'community',advice:'community',dadjoke:'community',wouldyourrather:'community',hack:'community',relationship:'community',
  purge:'moderator',softban:'moderator',unban:'moderator',clearwarnings:'moderator',slowmode:'moderator',lock:'moderator',unlock:'moderator',nickname:'moderator',role:'moderator',announce:'moderator',say:'moderator',thread:'ticketing',
  automod:'automod',automodwords:'automod',automodlinks:'automod',automodspam:'automod',auditlog:'audit',setprefix:'welcome',sticky:'automations',unsticky:'automations',counting:'community',welcome:'welcome',autorole:'welcome',verify:'moderator',commandtoggle:'commands',
  levelrewards:'levels',setlevelreward:'levels',resetxp:'levels',
  blacklist:'moderator',unblacklist:'moderator'
};
const featureForCommand=n=>COMMAND_FEATURE[n]||null;
const featureIsOn=(c,key)=>!key||c.plugins?.[key]!==false;
function profile(i,u,c){const l=c.levels.users?.[u.id]||{level:0,xp:0},e=c.economy.users?.[u.id]||{cash:0,bank:0},p=c.profiles?.[u.id]||{};return new EmbedBuilder().setColor(0x6d3df5).setTitle(p.displayName||u.username).setThumbnail(u.displayAvatarURL({size:256})).addFields({name:'Level',value:String(l.level),inline:true},{name:'XP',value:String(l.xp),inline:true},{name:'Cash',value:fmt(e.cash),inline:true},{name:'Bank',value:fmt(e.bank),inline:true},{name:'Bio',value:p.bio||'No bio set.'});}

async function execute(i,ctx){
  if(!i.isChatInputCommand()||!i.guild)return false;
  const root=i.commandName,sub=i.options.getSubcommand(false),alias={'info:avatar':'avatar','info:userinfo':'userinfo','info:serverinfo':'serverinfo','info:roleinfo':'roleinfo','info:botinfo':'botinfo','info:membercount':'membercount','info:permissions':'permissions','info:profile':'profile','info:rank':'rank','economy:daily':'daily','economy:beg':'beg','economy:deposit':'deposit','economy:withdraw':'withdraw','economy:inventory':'inventory','economy:shop':'shop','economy:buy':'buy','economy:give':'give','economy:rob':'rob','economy:crime':'crime','economy:pet':'pet','fun:poll':'poll','fun:calculator':'calculator','fun:ascii':'ascii','fun:advice':'advice','fun:dadjoke':'dadjoke','fun:wouldyourrather':'wouldyourrather','fun:hack':'hack','fun:relationship':'relationship','mod:purge':'purge','mod:softban':'softban','mod:unban':'unban','mod:clearwarnings':'clearwarnings','mod:slowmode':'slowmode','mod:lock':'lock','mod:unlock':'unlock','mod:nickname':'nickname','mod:role':'role','mod:announce':'announce','mod:say':'say','mod:thread':'thread','automod:toggle':'automod','automod:words':'automodwords','automod:links':'automodlinks','automod:spam':'automodspam','config:auditlog':'auditlog','config:prefix':'setprefix','config:sticky':'sticky','config:unsticky':'unsticky','config:counting':'counting','config:welcome':'welcome','config:autorole':'autorole','config:verify':'verify','config:toggle':'commandtoggle','levels:rewards':'levelrewards','levels:setreward':'setlevelreward','levels:reset':'resetxp','system:stats':'botstats','system:guilds':'guildlist','system:blacklist':'blacklist','system:unblacklist':'unblacklist','system:reload':'reloadconfig','system:debug':'debug'},n=alias[(root+':'+sub)]||root,c=svc.get(i.guild.id),u=who(i);
  if(c.blacklist?.includes(i.user.id)){await i.reply({content:'You are blocked from using SPIDEY BOT features in this server.',ephemeral:true});return true;}
  const featureKey=featureForCommand(n);
  if(!featureIsOn(c,featureKey)){await i.reply({content:'That feature is currently disabled by this server.',ephemeral:true});return true;}
  if(c.commandToggles?.[n]===false&&!isAdmin(i)){await i.reply({content:'That command is disabled by this server.',ephemeral:true});return true;}
  try{
    if(n==='avatar'){await i.reply(u.displayAvatarURL({size:1024,dynamic:true}));return true;}
    if(n==='userinfo'){const m=await i.guild.members.fetch(u.id).catch(()=>null);await i.reply({embeds:[new EmbedBuilder().setColor(0x1595a3).setTitle(u.tag).setThumbnail(u.displayAvatarURL()).addFields({name:'ID',value:u.id,inline:true},{name:'Joined',value:m?.joinedAt?.toISOString()||'Unknown',inline:true},{name:'Created',value:u.createdAt.toISOString(),inline:true},{name:'Roles',value:m?.roles.cache.filter(r=>r.id!==i.guild.id).map(r=>r.toString()).slice(0,20).join(', ')||'None'})]});return true;}
    if(n==='serverinfo'){await i.reply({embeds:[new EmbedBuilder().setColor(0x1595a3).setTitle(i.guild.name).setThumbnail(i.guild.iconURL()).addFields({name:'Members',value:String(i.guild.memberCount),inline:true},{name:'Channels',value:String(i.guild.channels.cache.size),inline:true},{name:'Roles',value:String(i.guild.roles.cache.size),inline:true},{name:'Owner',value:'<@'+i.guild.ownerId+'>',inline:true},{name:'Created',value:i.guild.createdAt.toISOString(),inline:true})]});return true;}
    if(n==='roleinfo'){const r=i.options.getRole('role');await i.reply({embeds:[new EmbedBuilder().setColor(r.color||0x6d3df5).setTitle('@'+r.name).addFields({name:'ID',value:r.id,inline:true},{name:'Members',value:String(r.members.size),inline:true},{name:'Position',value:String(r.position),inline:true},{name:'Mentionable',value:String(r.mentionable),inline:true})]});return true;}
    if(n==='botinfo'||n==='botstats'){await i.reply('SPIDEY BOT | Servers: '+ctx.client.guilds.cache.size+' | Uptime: '+Math.floor(process.uptime())+'s | RSS: '+Math.round(process.memoryUsage().rss/1048576)+' MB | WS: '+ctx.client.ws.ping+'ms');return true;}
    if(n==='membercount'){await i.reply('Members: '+i.guild.memberCount+' | Humans: '+i.guild.members.cache.filter(m=>!m.user.bot).size+' | Bots: '+i.guild.members.cache.filter(m=>m.user.bot).size);return true;}
    if(n==='permissions'){await i.reply('Your permissions: '+i.member.permissions.toArray().join(', '));return true;}
    if(n==='profile'){await i.reply({embeds:[profile(i,u,c)]});return true;}
    if(n==='rank'){const l=c.levels.users?.[u.id]||{level:0,xp:0},top=svc.topXp(i.guild.id),pos=Math.max(1,top.findIndex(x=>x.id===u.id)+1);await i.reply('🏆 '+u.username+' — Level '+l.level+' | '+l.xp+' XP | Rank #'+pos);return true;}
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

    if(n==='poll'){const m=await i.channel.send('📊 **Poll:** '+i.options.getString('question'));await m.react('👍');await m.react('👎');await i.reply({content:'Poll created.',ephemeral:true});return true;}
    if(n==='calculator'){const ex=i.options.getString('expression');if(!/^[0-9+\-*/().%\s]+$/.test(ex))return i.reply('❌ Only basic arithmetic is allowed.');let result;try{result=Function('"use strict";return ('+ex+')')();}catch{return i.reply('❌ Invalid expression.');}if(!Number.isFinite(result))return i.reply('❌ Result is not finite.');await i.reply('🧮 '+ex+' = '+result);return true;}
    if(n==='ascii'){await i.reply('ASCII: '+i.options.getString('text').slice(0,80).toUpperCase().split('').join(' '));return true;}
    if(n==='advice'){await i.reply('💡 '+advice[Math.floor(Math.random()*advice.length)]);return true;}
    if(n==='dadjoke'){await i.reply('😂 '+jokes[Math.floor(Math.random()*jokes.length)]);return true;}
    if(n==='wouldyourrather'){await i.reply('🤔 '+wyr[Math.floor(Math.random()*wyr.length)]);return true;}
    if(n==='hack'){await i.reply('💻 Connecting...');setTimeout(()=>i.editReply('💻 Scanning... | 📦 Downloading memes... | 😂 Fake hack complete.').catch(()=>{}),900);return true;}
    if(n==='relationship'){await i.reply('💜 Compatibility: '+(50+Math.floor(Math.random()*51))+'%');return true;}

    if(n==='purge'){const d=await i.channel.bulkDelete(i.options.getInteger('amount'),true);await i.reply({content:'🧹 Deleted '+d.size+' messages.',ephemeral:true});return true;}
    if(n==='softban'){const id=i.options.getUser('user').id,m=await i.guild.members.fetch(id).catch(()=>null);if(m&&!m.bannable)return i.reply('❌ I cannot ban that member.');await i.guild.members.ban(id,{reason:i.options.getString('reason')||'Softban'});await i.guild.bans.remove(id,'Softban');await i.reply('✅ Softbanned.');return true;}
    if(n==='unban'){await i.guild.bans.remove(i.options.getString('user_id'));await i.reply('✅ Unbanned.');return true;}
    if(n==='clearwarnings'){const id=i.options.getUser('user').id;c.warnings[id]=[];svc.save(i.guild.id,{warnings:c.warnings});await i.reply('✅ Warning history cleared.');return true;}
    if(n==='slowmode'){await i.channel.setRateLimitPerUser(i.options.getInteger('seconds'),'SPIDEY BOT');await i.reply('🐢 Slowmode updated.');return true;}
    if(n==='lock'||n==='unlock'){await i.channel.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:n==='unlock'?null:false});await i.reply(n==='lock'?'🔒 Channel locked.':'🔓 Channel unlocked.');return true;}
    if(n==='nickname'){const m=await i.guild.members.fetch(i.options.getUser('user').id);await m.setNickname(i.options.getString('nickname'));await i.reply('✏️ Nickname updated.');return true;}
    if(n==='role'){const m=await i.guild.members.fetch(i.options.getUser('user').id),r=i.options.getRole('role');if(i.options.getString('action')==='add')await m.roles.add(r);else await m.roles.remove(r);await i.reply('✅ Role updated.');return true;}
    if(n==='announce'){const ch=i.options.getChannel('channel');await ch.send({embeds:[new EmbedBuilder().setColor(0x6d3df5).setTitle('Announcement').setDescription(i.options.getString('message')).setTimestamp()]});await i.reply({content:'📣 Sent.',ephemeral:true});return true;}
    if(n==='say'){await i.channel.send(i.options.getString('message'));await i.reply({content:'Sent.',ephemeral:true});return true;}
    if(n==='thread'){const t=await i.channel.threads.create({name:i.options.getString('name'),reason:'SPIDEY BOT'});await i.reply('🧵 Created '+t.toString());return true;}

    if(['automod','automodwords','automodlinks','automodspam','auditlog','setprefix','sticky','unsticky','counting','welcome','autorole','verify','commandtoggle'].includes(n)){
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
      if(n==='welcome'){c.welcome.enabled=i.options.getBoolean('enabled');if(i.options.getChannel('channel'))c.welcome.channelId=i.options.getChannel('channel').id;if(i.options.getString('message'))c.welcome.message=i.options.getString('message');svc.save(i.guild.id,{welcome:c.welcome});return i.reply('👋 Welcome settings saved.');}
      if(n==='autorole'){c.autorole.enabled=i.options.getBoolean('enabled');if(i.options.getRole('role'))c.autorole.roleId=i.options.getRole('role').id;svc.save(i.guild.id,{autorole:c.autorole});return i.reply('🎭 Autorole settings saved.');}
      if(n==='verify'){c.verification={roleId:i.options.getRole('role').id};svc.save(i.guild.id,{verification:c.verification});return i.reply('✅ Verification role saved.');}
      if(n==='commandtoggle'){svc.toggle(i.guild.id,i.options.getString('command').toLowerCase(),i.options.getBoolean('enabled'));return i.reply('⚙️ Command toggle saved.');}
    }

    if(n==='levelrewards')return i.reply(Object.entries(c.levels.rewards||{}).map(([l,r])=>'Level '+l+': <@&'+r+'>').join('\n')||'No level rewards configured.');
    if(n==='setlevelreward'){c.levels.rewards[i.options.getInteger('level')]=i.options.getRole('role').id;svc.save(i.guild.id,{levels:c.levels});return i.reply('🏅 Level reward saved.');}
    if(n==='resetxp'){c.levels.users[i.options.getUser('user').id]={xp:0,level:0};svc.save(i.guild.id,{levels:c.levels});return i.reply('📉 XP reset.');}
    if(n==='blacklist'){const id=i.options.getUser('user').id;if(!c.blacklist.includes(id))c.blacklist.push(id);svc.save(i.guild.id,{blacklist:c.blacklist});return i.reply('🚫 User blacklisted.');}
    if(n==='unblacklist'){const id=i.options.getUser('user').id;c.blacklist=c.blacklist.filter(x=>x!==id);svc.save(i.guild.id,{blacklist:c.blacklist});return i.reply('✅ User removed from blacklist.');}
    return false;
  }catch(e){console.error('[TESTIFY SUITE]',n,e);if(i.replied||i.deferred)await i.editReply('❌ '+e.message).catch(()=>{});else await i.reply({content:'❌ '+e.message,ephemeral:true}).catch(()=>{});return true;}
}

async function handlePrefix(msg,ctx){
  if(!msg.guild||msg.author.bot)return false; const c=svc.get(msg.guild.id),p=c.prefix||'!';
  if(!msg.content.startsWith(p))return false; const a=msg.content.slice(p.length).trim().split(/\s+/),n=(a.shift()||'').toLowerCase(); if(!n)return false;
  if(c.blacklist?.includes(msg.author.id))return true;
  const reply=x=>msg.reply(x);
  const featureKey=featureForCommand(n);
  if(!featureIsOn(c,featureKey))return reply('That feature is currently disabled by this server.');
  try{
    if(n==='ping')return reply('🏓 Pong! '+ctx.client.ws.ping+'ms');
    if(n==='help')return reply('📚 Prefix: '+['ping','profile','rank','balance','daily','work','beg','inventory','shop','buy','give','rob','crime','serverinfo','userinfo','avatar','8ball','rps','dice','coin','trivia','purge','slowmode','lock','unlock','warn','warnings','kick','ban','unban','softban','announce','say','poll','sticky','setprefix','automod','auditlog','welcome','autorole','verify'].map(x=>p+x).join(', '));
    if(n==='profile')return reply({embeds:[profile({user:msg.author},msg.author,c)]});
    if(n==='rank')return reply('🏆 Level '+(c.levels.users?.[msg.author.id]?.level||0)+' | XP '+(c.levels.users?.[msg.author.id]?.xp||0));
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
    if(n==='welcome'){if(!msg.member.permissions.has(PermissionFlagsBits.Administrator))return reply('❌ Permission denied.');c.welcome.enabled=a[0]!=='off';if(msg.mentions.channels.first())c.welcome.channelId=msg.mentions.channels.first().id;svc.save(msg.guild.id,{welcome:c.welcome});return reply('Welcome settings saved.');}
    if(n==='autorole'){if(!msg.member.permissions.has(PermissionFlagsBits.Administrator))return reply('❌ Permission denied.');const r=msg.mentions.roles.first();c.autorole.enabled=true;c.autorole.roleId=r?.id||null;svc.save(msg.guild.id,{autorole:c.autorole});return reply('Autorole saved.');}
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
  }catch(e){console.error('[TESTIFY PREFIX]',n,e);return reply('❌ '+e.message);}
}

function registerTestifyHandlers(client){
  client.on('guildMemberAdd',async member=>{try{const c=svc.get(member.guild.id);if(featureIsOn(c,'welcome')&&c.autorole.enabled&&c.autorole.roleId){const r=member.guild.roles.cache.get(c.autorole.roleId);if(r)await member.roles.add(r).catch(()=>{});}if(featureIsOn(c,'welcome')&&c.welcome.enabled&&c.welcome.channelId){const ch=member.guild.channels.cache.get(c.welcome.channelId);if(ch)await ch.send(c.welcome.message.replaceAll('{user}',member.toString()).replaceAll('{server}',member.guild.name).replaceAll('{membercount}',String(member.guild.memberCount))).catch(()=>{});}}catch(e){console.error('[TESTIFY MEMBER]',e.message);}});
  client.on('messageCreate',async msg=>{try{if(!msg.guild||msg.author.bot)return;const c=svc.get(msg.guild.id);if(featureIsOn(c,'automod')&&c.automod.enabled){if(c.automod.antiInvite&&/discord\.gg\//i.test(msg.content)){await msg.delete().catch(()=>{});return;}if(c.automod.antiLink&&/https?:\/\//i.test(msg.content)){await msg.delete().catch(()=>{});return;}if(c.automod.words.some(w=>w&&msg.content.toLowerCase().includes(String(w).toLowerCase()))){await msg.delete().catch(()=>{});return;}}if(featureIsOn(c,'levels')&&c.levels.enabled){const r=svc.addXp(msg.guild.id,msg.author.id,c.levels.xpPerMessage||15);if(r.levelled&&c.levels.announce&&c.levels.announceChannel){const ch=msg.guild.channels.cache.get(c.levels.announceChannel);if(ch)ch.send(msg.author+' reached level **'+r.user.level+'**!').catch(()=>{});}}if(featureIsOn(c,'automations')&&c.sticky?.[msg.channel.id]){if(!registerTestifyHandlers.sticky)registerTestifyHandlers.sticky=new Map();const key=msg.guild.id+':'+msg.channel.id,old=registerTestifyHandlers.sticky.get(key);if(old)old.delete().catch(()=>{});const sent=await msg.channel.send('📌 '+c.sticky[msg.channel.id]).catch(()=>null);if(sent)registerTestifyHandlers.sticky.set(key,sent);}}catch(e){console.error('[TESTIFY MESSAGE]',e.message);}});
}
module.exports={execute,handlePrefix,registerTestifyHandlers};
