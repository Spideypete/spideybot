const body=document.querySelector('#workspaceBody');
const workspace=document.querySelector('#featureWorkspace');
const overview=document.querySelector('#overview');
const title=document.querySelector('#workspaceTitle');
const description=document.querySelector('#workspaceDescription');

const PLUGINS=[
 ['Essentials',[
  ['welcome','Welcome & Goodbye','Automatically send messages and assign roles to new members.','chats-circle','settings',true],
  ['welcomeChannel','Welcome Channel','A dedicated place to welcome new members.','door','settings',false],
  ['reactionRoles','Reaction Roles','Let members get roles by reacting to messages.','hand-waving','settings',false],
  ['moderator','Moderator','Moderation tools and server protection.','shield-check','moderation',true],
  ['levels','Levels','Give members XP and rank them by activity.','chart-line-up','levels',true],
  ['achievements','Achievements','Let members earn achievements and rewards.','trophy','levels',false],
  ['starboards','Starboards','Highlight popular messages in a dedicated channel.','star-four','settings',false]
 ]],
 ['Server Management',[
  ['automations','Automations','Automate bot actions in response to server events.','lightning','settings',true],
  ['customCommands','Custom Commands','Create your own text commands and command actions.','terminal-window','commands',true],
  ['inviteTracker','Invite Tracker','Track member invites and referral activity.','users-three','settings',false],
  ['ticketing','Ticketing','Allow members to submit support tickets.','ticket','tickets',true],
  ['audit','Audit Log','Record important server and moderation events.','list-checks','audit',true]
 ]],
 ['Utilities',[
  ['emojis','Emojis','Manage custom emojis.','smiley','settings',false],
  ['polls','Polls','Create polls and let members vote.','chart-bar','commands',false],
  ['embeds','Embed Messages','Create rich embeds for rules and announcements.','article','commands',false],
  ['search','Search Anything','Search supported services from Discord.','magnifying-glass','commands',false],
  ['help','Help','Enable dashboard and help commands.','question','commands',true],
  ['reminders','Reminders','Send scheduled custom messages.','bell','settings',false],
  ['statistics','Statistics Channels','Show server and social statistics in channels.','chart-line','settings',false],
  ['temporaryChannels','Temporary Channels','Create temporary voice channels.','waveform','settings',false]
 ]],
 ['Social Alerts',[
  ['twitch','Twitch Alerts','Notify your community when a Twitch stream goes live.','twitch-logo','settings',false],
  ['xalerts','X Alerts','Notify your community about new posts on X.','x-logo','settings',false],
  ['youtube','YouTube Alerts','Notify your community about new YouTube videos.','youtube-logo','settings',false],
  ['reddit','Reddit Alerts','Notify your community about new Reddit posts.','reddit-logo','settings',false],
  ['instagram','Instagram Alerts','Receive Instagram post notifications.','instagram-logo','settings',false],
  ['rss','RSS Feeds','Notify your community when an RSS feed updates.','rss','settings',false],
  ['kick','Kick Alerts','Notify your community when a Kick stream starts.','broadcast','settings',false],
  ['podcast','Podcast Alerts','Notify your community about new podcast episodes.','microphone-stage','settings',false],
  ['tiktok','TikTok Alerts','Notify your community about new TikTok posts.','tiktok-logo','settings',false]
 ]],
 ['Games & Fun',[
  ['giveaways','Giveaways','Launch giveaways and lotteries in your server.','gift','giveaways',true],
  ['birthdays','Birthdays','Track member birthdays and send automatic wishes.','cake','settings',false],
  ['economy','Economy','Let members earn and spend server currency.','coins','economy',true],
  ['music','Music','Music player and DJ controls.','music-notes','music',true]
 ]],
 ['MEE6 AI',[
  ['ai','MEE6 AI','AI-powered community features.','sparkle','system',true]
 ]],
 ['Monetization',[
  ['monetize','Monetize','Manage server monetization settings.','credit-card','owner',true]
 ]],
 ['Web3',[
  ['nftStats','NFT Statistics','Track NFT collection statistics.','cube','system',false],
  ['nftQueries','NFT Queries','Query NFT collection information.','magnifying-glass','system',false],
  ['nftSales','NFT Sales & Listing','Receive NFT sales and listing updates.','shopping-cart','system',false],
  ['cryptoStats','Crypto Statistics','Track cryptocurrency statistics.','currency-circle-dollar','system',false],
  ['cryptoQueries','Crypto Queries','Query cryptocurrency information.','currency-circle-dollar','system',false],
  ['gasTracker','Gas Tracker','Track current network fees.','gauge','system',false],
  ['gating','Gating','Manage NFT-holder access.','lock-key','system',false]
 ]]
];

const RENDERERS={
 settings:async id=>settingsPanel(id),
 moderation:async id=>moderationPanel(id),
 levels:async id=>levelsPanel(id),
 commands:async id=>commandsPanel(id),
 tickets:async id=>ticketsPanel(id),
 audit:async id=>auditPanel(id),
 economy:async id=>economyPanel(id),
 giveaways:async id=>giveawayPanel(id),
 music:async id=>musicPanel(id),
 automod:async id=>automodPanel(id),
 system:async id=>systemPanel(id),
 owner:async id=>ownerPanel(id)
};

const api=async(path,options={})=>{const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||('Request failed: '+r.status));return d};
const guildId=()=>{const q=new URLSearchParams(location.search);const id=(q.get('guildId')||q.get('serverId')||localStorage.getItem('selectedServerId')||localStorage.getItem('guildId')||'').trim();if(id){localStorage.setItem('selectedServerId',id);localStorage.setItem('guildId',id)}return id};
const load=async id=>(await api('/api/features/testify-suite/'+encodeURIComponent(id))).config||{};
const save=async(id,patch)=>api('/api/features/testify-suite/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(patch)});
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const icon=n=>'<i class="ph-bold ph-'+n+'"></i>';
const val=id=>document.getElementById(id)?.value??'';
const yes=id=>!!document.getElementById(id)?.checked;
const input=(id,label,value,type)=>'<label class="field">'+esc(label)+'<input id="'+id+'" type="'+(type||'text')+'" value="'+esc(value??'')+'"></label>';
const check=(id,label,value)=>'<label class="check"><span>'+esc(label)+'</span><input id="'+id+'" type="checkbox" '+(value?'checked':'')+'></label>';
const btn=(id,label)=>'<button class="select" id="'+id+'" type="button">'+esc(label)+'</button>';
const card=(h,s,c)=>'<div class="card panel"><div class="panel-head"><div><div class="panel-title">'+esc(h)+'</div><div class="panel-sub">'+esc(s||'')+'</div></div></div>'+c+'</div>';
const row=(a,b)=>'<div class="activity-row"><div class="activity-main"><strong>'+esc(a)+'</strong><span>'+esc(b)+'</span></div></div>';

function allPlugins(){return PLUGINS.flatMap(x=>x[1])}
function pluginByPanel(panel){return allPlugins().find(p=>p[4]===panel)}
function activeFor(config,p){return p[5] && config.plugins?.[p[0]]!==false}
function addStyles(){if(document.getElementById('plugin-styles'))return;const s=document.createElement('style');s.id='plugin-styles';s.textContent='.field{display:block;font-size:11px;font-weight:750;color:var(--muted);margin:10px 0}.field input{display:block;width:100%;margin-top:5px;min-height:40px;border:1px solid var(--border);border-radius:10px;padding:9px 10px;background:var(--surface);color:var(--text)}.check{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--border);font-size:12px;font-weight:700}.check input{width:18px;height:18px}.panel-actions{display:flex;justify-content:flex-end;margin-top:14px}.plugin-sections{display:flex;flex-direction:column;gap:30px}.plugin-section-title{font-size:18px;font-weight:800;margin-bottom:11px}.plugin-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.plugin-card{padding:18px;min-height:185px;display:flex;flex-direction:column}.plugin-card.disabled{opacity:.58}.plugin-icon{width:40px;height:40px;border-radius:12px;background:#f0ecff;color:var(--purple);display:grid;place-items:center;font-size:18px;margin-bottom:13px}.plugin-card h3{font-size:14px}.plugin-card p{font-size:11px;color:var(--muted);margin-top:6px;line-height:1.55}.plugin-foot{display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:16px}.plugin-status{font-size:10px;font-weight:800;padding:5px 9px;border-radius:999px;background:#eaf8f3;color:#19845a}.plugin-status.off{background:#f1f2f6;color:#8790a7}.plugin-switch{width:40px;height:22px;border:0;border-radius:999px;background:#cfd3df;position:relative;cursor:pointer}.plugin-switch.on{background:var(--petrol)}.plugin-switch:after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.16s}.plugin-switch.on:after{left:21px}.plugin-switch:disabled{cursor:not-allowed}.sidebar-disabled{opacity:.4;cursor:not-allowed!important}@media(max-width:1050px){.plugin-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.plugin-grid{grid-template-columns:1fr}}';document.head.appendChild(s)}

async function renderOverview(){const id=guildId();const root=document.getElementById('pluginCatalog');if(!root)return;if(!id){root.innerHTML=card('Server selection required','Choose a Discord server before managing plugins.','');return}try{renderPluginCatalog(await load(id))}catch(e){root.innerHTML=card('Plugins unavailable','Could not load plugin configuration.',row('Error',e.message))}}
function renderPluginCatalog(config){
 const root=document.getElementById('pluginCatalog');
 root.innerHTML='<div class="plugin-sections">'+PLUGINS.map(function(group){return '<section><div class="plugin-section-title">'+esc(group[0])+'</div><div class="plugin-grid">'+group[1].map(function(p){const active=activeFor(config,p);return '<article class="card plugin-card '+(active?'':'disabled')+'"><div class="plugin-icon">'+icon(p[3])+'</div><h3>'+esc(p[1])+'</h3><p>'+esc(p[2])+'</p><div class="plugin-foot"><span class="plugin-status '+(active?'':'off')+'">'+(active?'Active':'Enable')+'</span><button class="plugin-switch '+(active?'on':'')+'" data-plugin="'+p[0]+'" aria-label="'+(active?'Disable ':'Enable ')+esc(p[1])+'"></button></div></article>'}).join('')+'</div></section>'}).join('')+'</div>';
 root.querySelectorAll('[data-plugin]').forEach(function(button){button.addEventListener('click',async function(){const key=button.dataset.plugin;const next=!(config.plugins?.[key]!==false && (allPlugins().find(function(p){return p[0]===key})||[])[5]);try{config=await save(guildId(),{plugins:{...(config.plugins||{}),[key]:next}});renderPluginCatalog(config);await buildNavigation()}catch(e){alert(e.message)}})});
}

async function buildNavigation(){
 const root=document.getElementById('navigation');root.innerHTML='';const id=guildId();let config={plugins:{}};if(id)try{config=await load(id)}catch(e){}
 const mh=document.createElement('div');mh.className='nav-title';mh.textContent='Main';root.appendChild(mh);
 const mn=document.createElement('nav');mn.className='nav';const ob=document.createElement('button');ob.type='button';ob.dataset.section='overview';ob.innerHTML='<span class="icon">'+icon('house')+'</span>Overview';ob.onclick=function(){select('overview')};mn.appendChild(ob);root.appendChild(mn);
 PLUGINS.forEach(function(group){const h=document.createElement('div');h.className='nav-title';h.textContent=group[0];root.appendChild(h);const n=document.createElement('nav');n.className='nav';const seen={};group[1].forEach(function(p){if(seen[p[4]])return;if(!activeFor(config,p))return;seen[p[4]]=true;const b=document.createElement('button');b.type='button';b.dataset.section=p[4];b.innerHTML='<span class="icon">'+icon(p[3])+'</span>'+esc(p[1]);b.onclick=function(){select(p[4])};n.appendChild(b)});root.appendChild(n)});
}

async function select(section){
 document.querySelectorAll('[data-section]').forEach(function(b){b.classList.toggle('active',b.dataset.section===section)});
 if(section==='overview'){overview.hidden=false;workspace.hidden=true;document.getElementById('sidebar').classList.remove('open');await renderOverview();return}
 const id=guildId();if(!id)return;
 const config=await load(id);const p=pluginByPanel(section);if(!p||!activeFor(config,p))return;
 overview.hidden=true;workspace.hidden=false;document.getElementById('sidebar').classList.remove('open');title.textContent=p[1];description.textContent=p[2];body.innerHTML=card('Loading','Loading server configuration…','');
 try{await RENDERERS[section](id)}catch(e){console.error('[dashboard panel]',section,e);body.innerHTML=card('Panel failed to load','The section could not be rendered.',row('Error',e.message||String(e)))}
}

async function settingsPanel(id){const c=await load(id);body.innerHTML=card('Welcome & Goodbye','Member greetings and roles.',check('welcome','Welcome messages',!!c.welcome?.enabled)+input('welcomeChannel','Welcome channel ID',c.welcome?.channelId||'')+input('welcomeMessage','Welcome message',c.welcome?.message||'Welcome {user} to {server}!')+check('autorole','Automatic role',!!c.autorole?.enabled)+input('autoroleId','Automatic role ID',c.autorole?.roleId||'')+input('prefix','Command prefix',c.prefix||'!')+'<div class="panel-actions">'+btn('save','Save settings')+'</div>');document.getElementById('save').onclick=async function(){await save(id,{prefix:val('prefix')||'!',welcome:{...(c.welcome||{}),enabled:yes('welcome'),channelId:val('welcomeChannel')||null,message:val('welcomeMessage')},autorole:{...(c.autorole||{}),enabled:yes('autorole'),roleId:val('autoroleId')||null}});alert('Saved.')}}
async function moderationPanel(id){const c=await load(id);body.innerHTML=card('Moderator','Moderation and server protection.',check('audit','Audit logging',!!c.audit?.enabled)+input('auditChannel','Audit log channel ID',c.audit?.channelId||'')+'<div class="panel-actions">'+btn('save','Save')+'</div>');document.getElementById('save').onclick=async function(){await save(id,{audit:{...(c.audit||{}),enabled:yes('audit'),channelId:val('auditChannel')||null}});alert('Saved.')}}
async function automodPanel(id){const c=await load(id),a=c.automod||{};body.innerHTML=card('AutoMod','Protection rules.',check('enabled','Enable AutoMod',a.enabled!==false)+check('invites','Block Discord invites',a.antiInvite!==false)+check('links','Block links',!!a.antiLink)+check('spam','Spam protection',a.antiSpam!==false)+check('caps','Caps protection',!!a.caps)+check('mentions','Mass mention protection',a.massMention!==false)+input('max','Spam threshold',a.maxMessages||6,'number')+input('words','Blocked words',(a.words||[]).join(', '))+'<div class="panel-actions">'+btn('save','Save AutoMod')+'</div>');document.getElementById('save').onclick=async function(){await save(id,{automod:{...a,enabled:yes('enabled'),antiInvite:yes('invites'),antiLink:yes('links'),antiSpam:yes('spam'),caps:yes('caps'),massMention:yes('mentions'),maxMessages:Number(val('max'))||6,words:val('words').split(',').map(function(x){return x.trim()}).filter(Boolean)}});alert('Saved.')}}
async function levelsPanel(id){const c=await load(id),l=c.levels||{};body.innerHTML=card('Levels','XP progression and rewards.',check('enabled','Enable leveling',l.enabled!==false)+input('xp','XP per message',l.xpPerMessage||15,'number')+input('per','XP per level',l.xpPerLevel||500,'number')+check('announce','Announce level ups',l.announce!==false)+input('channel','Announcement channel ID',l.announceChannel||'')+'<div class="panel-actions">'+btn('save','Save levels')+'</div>');document.getElementById('save').onclick=async function(){await save(id,{levels:{...l,enabled:yes('enabled'),xpPerMessage:Number(val('xp'))||15,xpPerLevel:Number(val('per'))||500,announce:yes('announce'),announceChannel:val('channel')||null}});alert('Saved.')}}
async function commandsPanel(id){const c=await load(id),groups={Information:['avatar','userinfo','serverinfo','profile','rank'],Economy:['daily','beg','deposit','withdraw','inventory','shop','buy','give','rob','crime'],Fun:['poll','calculator','ascii','advice','dadjoke','wouldyourrather'],Moderation:['purge','softban','unban','clearwarnings','slowmode','lock','unlock','nickname','role','announce','say'],AutoMod:['automod','automodwords','automodlinks','automodspam'],Configuration:['auditlog','setprefix','sticky','unsticky','welcome','autorole','verify'],Levels:['levelrewards','setlevelreward','resetxp'],Music:['play','pause','resume','skip','stop','queue','volume'],Administration:['blacklist','unblacklist','reloadconfig','debug','guildlist','botstats']};let html='';Object.keys(groups).forEach(function(g){html+=card(g,'Enable or disable commands.',groups[g].map(function(n){return check('cmd_'+n,n,c.commandToggles?.[n]!==false)}).join('')});html+='<div class="panel-actions">'+btn('saveCommands','Save command settings')+'</div>';body.innerHTML=html;document.getElementById('saveCommands').onclick=async function(){const patch={...c.commandToggles};Object.values(groups).flat().forEach(function(n){patch[n]=yes('cmd_'+n)});await save(id,{commandToggles:patch});alert('Saved.')}}
async function ticketsPanel(id){const c=await load(id),t=c.tickets||{};body.innerHTML=card('Ticketing','Support tickets and transcripts.',check('enabled','Enable tickets',t.enabled!==false)+input('category','Ticket category ID',t.categoryId||'')+input('channel','Ticket panel channel ID',t.ticketChannelId||'')+input('support','Support role ID',t.supportRoleId||'')+input('log','Transcript log channel ID',t.logChannelId||'')+'<div class="panel-actions">'+btn('save','Save tickets')+'</div>');document.getElementById('save').onclick=async function(){await save(id,{tickets:{...t,enabled:yes('enabled'),categoryId:val('category')||null,ticketChannelId:val('channel')||null,supportRoleId:val('support')||null,logChannelId:val('log')||null}});alert('Saved.')}}
async function auditPanel(id){const c=await load(id);body.innerHTML=card('Audit Log','Audit event delivery.',check('enabled','Enable audit logging',!!c.audit?.enabled)+input('channel','Audit channel ID',c.audit?.channelId||'')+'<div class="panel-actions">'+btn('save','Save audit settings')+'</div>');document.getElementById('save').onclick=async function(){await save(id,{audit:{...(c.audit||{}),enabled:yes('enabled'),channelId:val('channel')||null}});alert('Saved.')}}
async function economyPanel(id){const c=await load(id),e=c.economy||{};body.innerHTML=card('Economy','Wallet, rewards and shop.',check('enabled','Enable economy',e.enabled!==false)+input('currency','Currency name',e.currency||'coins')+input('daily','Daily reward',e.daily||100,'number')+input('min','Work minimum',e.workMin||20,'number')+input('max','Work maximum',e.workMax||60,'number')+'<div class="panel-actions">'+btn('save','Save economy')+'</div>');document.getElementById('save').onclick=async function(){await save(id,{economy:{...e,enabled:yes('enabled'),currency:val('currency')||'coins',daily:Number(val('daily'))||100,workMin:Number(val('min'))||20,workMax:Number(val('max'))||60}});alert('Saved.')}}
async function giveawayPanel(id){const c=await load(id),g=c.giveaways||{};body.innerHTML=card('Giveaways','Giveaway defaults.',input('channel','Default channel ID',g.channelId||'')+input('duration','Duration in minutes',g.duration||60,'number')+input('winners','Default winners',g.winners||1,'number')+input('prize','Default prize',g.prize||'')+'<div class="panel-actions">'+btn('save','Save giveaways')+'</div>');document.getElementById('save').onclick=async function(){await save(id,{giveaways:{...g,channelId:val('channel')||null,duration:Number(val('duration'))||60,winners:Number(val('winners'))||1,prize:val('prize')}});alert('Saved.')}}
async function musicPanel(id){const c=await load(id),m=c.music||{};body.innerHTML=card('Music','Player and DJ configuration.',check('enabled','Enable music',m.enabled!==false)+input('dj','DJ role ID',m.djRoleId||'')+input('volume','Maximum volume',m.maxVolume||200,'number')+'<div class="panel-actions">'+btn('save','Save music')+'</div>');document.getElementById('save').onclick=async function(){await save(id,{music:{...m,enabled:yes('enabled'),djRoleId:val('dj')||null,maxVolume:Number(val('volume'))||200}});alert('Saved.')}}
async function systemPanel(id){const c=await load(id);body.innerHTML=card('System','Runtime diagnostics.',row('Server ID',id)+row('Configuration','Loaded')+row('Enabled plugins',Object.values(c.plugins||{}).filter(Boolean).length)+row('Command switches',Object.keys(c.commandToggles||{}).length))}
async function ownerPanel(id){const c=await load(id);body.innerHTML=card('Administration','Restricted internal tools.',input('blacklist','User ID to blacklist')+'<div class="panel-actions">'+btn('save','Apply')+'</div>');document.getElementById('save').onclick=async function(){const u=val('blacklist').trim();if(!u)return alert('Enter a user ID.');const list=[...(c.blacklist||[])];if(!list.includes(u))list.push(u);await save(id,{blacklist:list});alert('Saved.')}}
addStyles();
document.getElementById('workspaceRefresh')?.addEventListener('click',function(){const active=document.querySelector('[data-section].active');if(active)select(active.dataset.section)});
window.spideyDashboard={select,guildId,PLUGINS};
buildNavigation().then(renderOverview);