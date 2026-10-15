const {
  ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType,
  EmbedBuilder, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle
} = require('discord.js');
const svc = require('../testify-suite/testify-suite.service.cjs');
const defaults = {enabled:true,categoryId:null,ticketChannelId:null,supportRoleId:null,logChannelId:null,transcriptChannelId:null,ticketPrefix:'ticket',maxTicketsPerUser:1,panelTitle:'Need help? Open a ticket',panelDescription:'Select the button below to contact our support team.',buttonLabel:'Create Ticket',welcomeMessage:'Hello {user}, please describe your issue and a staff member will be with you shortly.',questions:[],allowUserClose:true,claimEnabled:true,allowReopen:true,transcriptsEnabled:true,autoCloseHours:0,records:{},nextNumber:1};
const getConfig = id => Object.assign({}, defaults, svc.get(id).tickets || {});
const saveConfig = (id, patch) => svc.save(id, {tickets:Object.assign({}, getConfig(id), patch)}).tickets;
const isAdmin = i => Boolean(i.memberPermissions && i.memberPermissions.has(PermissionFlagsBits.Administrator));
const isStaff = (m,c) => Boolean(m && (m.permissions.has(PermissionFlagsBits.Administrator) || (c.supportRoleId && m.roles.cache.has(c.supportRoleId))));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const template = (s,u,g,t) => String(s || '').replace(/\{user\}/gi,'<@'+u.id+'>').replace(/\{username\}/gi,u.username).replace(/\{server\}/gi,g.name).replace(/\{ticket\}/gi,t.id);
function row(t,c) {
 const b=[];
 if(c.claimEnabled && t.status==='open') b.push(new ButtonBuilder().setCustomId('spidey_ticket_claim:'+t.id).setLabel(t.claimedBy?'Claimed':'Claim').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(Boolean(t.claimedBy)));
 if(t.status==='open') b.push(new ButtonBuilder().setCustomId('spidey_ticket_close:'+t.id).setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger));
 if(t.status==='closed' && c.allowReopen) b.push(new ButtonBuilder().setCustomId('spidey_ticket_reopen:'+t.id).setLabel('Reopen').setEmoji('🔓').setStyle(ButtonStyle.Success));
 if(t.status==='closed') b.push(new ButtonBuilder().setCustomId('spidey_ticket_delete:'+t.id).setLabel('Delete').setEmoji('🗑️').setStyle(ButtonStyle.Secondary));
 return b.length ? new ActionRowBuilder().addComponents(b) : null;
}
async function log(g,c,title,description) {
 if(!c.logChannelId)return;
 const ch=g.channels.cache.get(c.logChannelId);
 if(ch && ch.isTextBased()) await ch.send({embeds:[new EmbedBuilder().setColor(0x6d3df5).setTitle(title).setDescription(description.slice(0,4000)).setTimestamp()]}).catch(e=>console.error('[TICKET LOG]',e.message));
}
async function transcript(g,t,c) {
 if(!c.transcriptsEnabled || !c.transcriptChannelId)return;
 const target=g.channels.cache.get(c.transcriptChannelId),ch=g.channels.cache.get(t.channelId);
 if(!target || !target.isTextBased() || !ch || !ch.isTextBased())return;
 try {
  const ms=await ch.messages.fetch({limit:100});
  const html=[...ms.values()].sort((a,b)=>a.createdTimestamp-b.createdTimestamp).map(m=>'<article><time>'+new Date(m.createdTimestamp).toISOString()+'</time> <b>'+esc(m.author.tag)+'</b><p>'+esc(m.content||'[attachment/embed]').replace(/\n/g,'<br>')+'</p></article>').join('\n');
  const doc='<!doctype html><html><head><meta charset="utf-8"><title>'+esc(t.id)+' transcript</title><style>body{font:15px system-ui;background:#10131a;color:#eee;max-width:900px;margin:32px auto;padding:20px}article{border-bottom:1px solid #444;padding:12px}time{color:#aaa}</style></head><body><h1>'+esc(t.id)+' transcript</h1><p>Owner: '+esc(t.userId)+' · Created: '+esc(t.createdAt)+' · Closed: '+esc(t.closedAt||'')+'</p>'+html+'</body></html>';
  await target.send({content:'HTML transcript for **'+t.id+'**',files:[new AttachmentBuilder(Buffer.from(doc,'utf8'),{name:t.id.toLowerCase()+'-transcript.html'})]});
 } catch(e){console.error('[TICKET TRANSCRIPT]',e.message);}
}
async function create(interaction,answers) {
 const g=interaction.guild,u=interaction.user,c=getConfig(g.id);
 if(!c.enabled)return interaction.reply({content:'Ticketing is disabled in this server.',ephemeral:true});
 if(!c.categoryId)return interaction.reply({content:'An admin must choose a ticket category in the dashboard first.',ephemeral:true});
 const records=Object.assign({},c.records||{}),open=Object.values(records).filter(t=>t.userId===u.id&&t.status==='open');
 if(open.length>=Math.max(1,Number(c.maxTicketsPerUser)||1))return interaction.reply({content:'You already have the maximum number of open tickets.',ephemeral:true});
 const n=Math.max(1,Number(c.nextNumber)||1),id='T-'+String(n).padStart(4,'0'),prefix=String(c.ticketPrefix||'ticket').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,18)||'ticket';
 const overwrites=[{id:g.id,deny:[PermissionFlagsBits.ViewChannel]},{id:u.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.AttachFiles]}];
 if(c.supportRoleId)overwrites.push({id:c.supportRoleId,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.ManageMessages]});
 await interaction.deferReply({ephemeral:true}).catch(()=>{});
 let ch;
 try {
  ch=await g.channels.create({name:prefix+'-'+String(n).padStart(4,'0'),type:ChannelType.GuildText,parent:c.categoryId,permissionOverwrites:overwrites,topic:'SPIDEY BOT ticket '+id+' | owner '+u.id});
  const t={id:id,guildId:g.id,userId:u.id,channelId:ch.id,status:'open',claimedBy:null,createdAt:new Date().toISOString(),lastActivityAt:new Date().toISOString(),closedAt:null,answers:answers||{}};
  records[id]=t;saveConfig(g.id,{records:records,nextNumber:n+1});
  const details=Object.entries(t.answers).filter(x=>String(x[1]||'').trim()).map(x=>'**'+esc(x[0])+'**: '+esc(x[1])).join('\n');
  const embed=new EmbedBuilder().setColor(0x6d3df5).setTitle('🎫 '+id+' · Support Ticket').setDescription(template(c.welcomeMessage,u,g,t).slice(0,3500)).addFields({name:'Ticket owner',value:u.toString(),inline:true},{name:'Status',value:'Open',inline:true}).setFooter({text:'SPIDEY BOT · Ticketing'}).setTimestamp();
  if(details)embed.addFields({name:'Submitted details',value:details.slice(0,1000)});
  await ch.send({content:u.toString()+(c.supportRoleId?' <@&'+c.supportRoleId+'>':''),embeds:[embed],components:[row(t,c)].filter(Boolean),allowedMentions:{users:[u.id],roles:c.supportRoleId?[c.supportRoleId]:[]}});
  await log(g,c,'Ticket opened',id+' opened by <@'+u.id+'> in '+ch+'.');
  return interaction.editReply({content:'Your ticket is ready: '+ch});
 } catch(e) {
  if(ch)await ch.delete().catch(()=>{});
  console.error('[TICKET CREATE]',e);
  const msg='Could not create the ticket. Check the bot has Manage Channels and access to the selected category. ('+e.message+')';
  return interaction.deferred?interaction.editReply({content:msg}).catch(()=>{}):interaction.reply({content:msg,ephemeral:true}).catch(()=>{});
 }
}
async function publish(g) {
 const c=getConfig(g.id);
 if(!c.enabled)throw new Error('Enable ticketing before publishing the panel.');
 if(!c.ticketChannelId)throw new Error('Choose a ticket panel channel in the dashboard first.');
 const ch=g.channels.cache.get(c.ticketChannelId);
 if(!ch || !ch.isTextBased())throw new Error('Selected panel channel is missing or is not a text channel.');
 const embed=new EmbedBuilder().setColor(0x6d3df5).setTitle(c.panelTitle||defaults.panelTitle).setDescription(c.panelDescription||defaults.panelDescription).setFooter({text:'SPIDEY BOT Ticketing'}).setTimestamp();
 const buttons=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('spidey_ticket_open').setLabel(String(c.buttonLabel||'Create Ticket').slice(0,80)).setEmoji('🎫').setStyle(ButtonStyle.Primary));
 await ch.send({embeds:[embed],components:[buttons]});return ch;
}
async function execute(i) {
 if(!i.isChatInputCommand()||i.commandName!=='ticket'||!i.guild)return false;
 const sub=i.options.getSubcommand(),c=getConfig(i.guild.id);
 if(sub==='panel'){
  if(!isAdmin(i))return i.reply({content:'Only server administrators can publish the ticket panel.',ephemeral:true});
  try{const ch=await publish(i.guild);return i.reply({content:'Ticket panel published in '+ch+'.',ephemeral:true});}catch(e){return i.reply({content:'Could not publish panel: '+e.message,ephemeral:true});}
 }
 if(sub==='create'){
  const qs=(c.questions||[]).filter(q=>String(q||'').trim()).slice(0,5);
  if(qs.length){const m=new ModalBuilder().setCustomId('spidey_ticket_modal').setTitle('Open a support ticket');m.addComponents(...qs.map((q,n)=>new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q'+n).setLabel(String(q).slice(0,45)).setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(1000))));return i.showModal(m);}
  return create(i,{});
 }
 if(sub==='stats'){
  if(!isAdmin(i))return i.reply({content:'Only administrators can view ticket statistics.',ephemeral:true});
  const all=Object.values(c.records||{});return i.reply({embeds:[new EmbedBuilder().setColor(0x6d3df5).setTitle('Ticket statistics').addFields({name:'Total',value:String(all.length),inline:true},{name:'Open',value:String(all.filter(t=>t.status==='open').length),inline:true},{name:'Closed',value:String(all.filter(t=>t.status==='closed').length),inline:true})],ephemeral:true});
 }
 const t=Object.values(c.records||{}).find(x=>x.channelId===i.channelId);
 if(!t)return i.reply({content:'Use this command inside a SPIDEY BOT ticket channel.',ephemeral:true});
 if(sub==='close')return close(i,t,c);
 if(sub==='claim')return claim(i,t,c);
 if(sub==='reopen')return reopen(i,t,c);
 if(sub==='delete')return remove(i,t,c);
 return false;
}
async function close(i,t,c) {
 if(i.user.id!==t.userId&&!isStaff(i.member,c))return i.reply({content:'Only the ticket owner or support staff can close this ticket.',ephemeral:true});
 if(t.status!=='open')return i.reply({content:'This ticket is already closed.',ephemeral:true});
 await i.deferReply({ephemeral:true});t.status='closed';t.closedAt=new Date().toISOString();saveConfig(i.guild.id,{records:c.records});
 await i.channel.send({embeds:[new EmbedBuilder().setColor(0xed4245).setTitle('🔒 '+t.id+' closed').setDescription('Closed by '+i.user+'.').setTimestamp()],components:[row(t,c)].filter(Boolean)});
 await i.channel.permissionOverwrites.edit(t.userId,{SendMessages:false,ViewChannel:true}).catch(e=>console.error('[TICKET CLOSE PERMISSIONS]',e.message));
 await transcript(i.guild,t,c);await log(i.guild,c,'Ticket closed',t.id+' closed by <@'+i.user.id+'>.');
 return i.editReply({content:'Ticket closed.'});
}
async function claim(i,t,c) {
 if(!isStaff(i.member,c))return i.reply({content:'Only support staff can claim tickets.',ephemeral:true});
 if(t.status!=='open')return i.reply({content:'Closed tickets cannot be claimed.',ephemeral:true});
 if(t.claimedBy)return i.reply({content:'Already claimed by <@'+t.claimedBy+'>.',ephemeral:true});
 t.claimedBy=i.user.id;saveConfig(i.guild.id,{records:c.records});
 await i.channel.send({content:'✋ '+i.user+' claimed **'+t.id+'**.'});
 await i.message?.edit({components:[row(t,c)].filter(Boolean)}).catch(()=>{});
 return i.reply({content:'You claimed '+t.id+'.',ephemeral:true});
}
async function reopen(i,t,c) {
 if(!isStaff(i.member,c))return i.reply({content:'Only support staff can reopen tickets.',ephemeral:true});
 if(!c.allowReopen)return i.reply({content:'Reopening tickets is disabled.',ephemeral:true});
 if(t.status!=='closed')return i.reply({content:'This ticket is already open.',ephemeral:true});
 t.status='open';t.closedAt=null;t.lastActivityAt=new Date().toISOString();saveConfig(i.guild.id,{records:c.records});
 await i.channel.permissionOverwrites.edit(t.userId,{ViewChannel:true,SendMessages:true,ReadMessageHistory:true});
 await i.channel.send({content:'Ticket reopened by '+i.user+'.',components:[row(t,c)].filter(Boolean)});
 await log(i.guild,c,'Ticket reopened',t.id+' reopened by <@'+i.user.id+'>.');
 return i.reply({content:'Ticket reopened.',ephemeral:true});
}
async function remove(i,t,c) {
 if(!isStaff(i.member,c))return i.reply({content:'Only support staff can delete tickets.',ephemeral:true});
 if(t.status==='open')return i.reply({content:'Close the ticket before deleting it.',ephemeral:true});
 delete c.records[t.id];saveConfig(i.guild.id,{records:c.records});await log(i.guild,c,'Ticket deleted',t.id+' deleted by <@'+i.user.id+'>.');
 await i.reply({content:'Deleting ticket channel…',ephemeral:true});await i.channel.delete('Ticket deleted by '+i.user.tag).catch(e=>console.error('[TICKET DELETE]',e.message));
}
async function onInteraction(i) {
 if(!i.guild)return;
 if(i.isButton()&&i.customId==='spidey_ticket_open'){
  const c=getConfig(i.guild.id),qs=(c.questions||[]).filter(q=>String(q||'').trim()).slice(0,5);
  if(qs.length){const m=new ModalBuilder().setCustomId('spidey_ticket_modal').setTitle('Open a support ticket');m.addComponents(...qs.map((q,n)=>new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q'+n).setLabel(String(q).slice(0,45)).setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(1000))));return i.showModal(m);}
  return create(i,{});
 }
 if(i.isModalSubmit()&&i.customId==='spidey_ticket_modal'){
  const c=getConfig(i.guild.id),answers={};(c.questions||[]).filter(q=>String(q||'').trim()).slice(0,5).forEach((q,n)=>answers[q]=i.fields.getTextInputValue('q'+n)||'');return create(i,answers);
 }
 if(!i.isButton()||!i.customId.startsWith('spidey_ticket_'))return;
 const bits=i.customId.split(':');if(bits.length<2)return;const action=bits[0].replace('spidey_ticket_',''),id=bits[1],c=getConfig(i.guild.id),t=c.records&&c.records[id];
 if(!t)return i.reply({content:'Ticket record not found in saved configuration.',ephemeral:true});
 if(i.channelId!==t.channelId)return i.reply({content:'Use ticket controls in the matching ticket channel.',ephemeral:true});
 if(action==='close')return close(i,t,c);if(action==='claim')return claim(i,t,c);if(action==='reopen')return reopen(i,t,c);if(action==='delete')return remove(i,t,c);
}
function register(client) {
 client.on('interactionCreate',async i=>{try{await onInteraction(i);}catch(e){console.error('[TICKETING INTERACTION]',e);const p={content:'Ticket action failed. Check bot permissions and ticket settings.',ephemeral:true};if(i.deferred||i.replied)await i.followUp(p).catch(()=>{});else await i.reply(p).catch(()=>{});}});
 client.on('messageCreate',m=>{if(!m.guild||m.author.bot)return;const c=getConfig(m.guild.id),t=Object.values(c.records||{}).find(x=>x.channelId===m.channelId&&x.status==='open');if(t){t.lastActivityAt=new Date().toISOString();saveConfig(m.guild.id,{records:c.records});}});
 const timer=setInterval(async()=>{try{for(const g of client.guilds.cache.values()){const c=getConfig(g.id),hours=Number(c.autoCloseHours)||0;if(hours<=0)continue;for(const t of Object.values(c.records||{})){const last=Date.parse(t.lastActivityAt||t.createdAt||'');if(t.status!=='open'||!last||Date.now()-last<hours*3600000)continue;const ch=g.channels.cache.get(t.channelId);t.status='closed';t.closedAt=new Date().toISOString();if(ch){await ch.send({content:'Ticket auto-closed after '+hours+' hour(s) without activity.',components:[row(t,c)].filter(Boolean)}).catch(()=>{});await ch.permissionOverwrites.edit(t.userId,{SendMessages:false,ViewChannel:true}).catch(()=>{});await transcript(g,t,c);await log(g,c,'Ticket auto-closed',t.id+' closed after inactivity.');}}saveConfig(g.id,{records:c.records});}}catch(e){console.error('[TICKET AUTO-CLOSE]',e.message);}},600000);timer.unref?.();
}
module.exports={execute,register,publish,getConfig};
