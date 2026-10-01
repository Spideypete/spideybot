const body=document.querySelector('#workspaceBody');
const workspace=document.querySelector('#featureWorkspace');
const overview=document.querySelector('#overview');
const title=document.querySelector('#workspaceTitle');
const description=document.querySelector('#workspaceDescription');
const navigation=document.querySelector('#navigation');

const FEATURES=[
  ['Essentials',[
    ['welcome','Welcome & Goodbye','Member greetings, welcome channels, messages and automatic roles.','chats-circle'],
    ['welcomeChannel','Welcome Channel','Configure the dedicated channel and message used for new members.','door'],
    ['reactionRoles','Reaction Roles','Create self-assignable role mappings for your community.','hand-waving'],
    ['moderator','Moderation','Warnings, kicks, bans, channel controls and moderation history.','shield-check'],
    ['automod','AutoMod','Filter invites, links, spam, mentions, caps and blocked words.','shield-warning'],
    ['audit','Audit Log','Configure the channel used for important server activity.','list-checks'],
    ['levels','Levels','XP progression, level rewards and level-up announcements.','chart-line-up'],
    ['achievements','Achievements','Configure achievement milestones and reward behavior.','trophy']
  ]],
  ['Server Management',[
    ['automations','Automations','Configure automated server actions and recurring behavior.','lightning'],
    ['customCommands','Custom Commands','Create, enable and disable custom commands.','terminal-window'],
    ['inviteTracker','Invite Tracker','Track referral activity and invite logging.','users-three'],
    ['ticketing','Ticketing','Configure support tickets, categories, staff roles and transcripts.','ticket'],
    ['emojis','Emojis','Configure server emoji management and utility controls.','smiley'],
    ['polls','Polls','Configure community poll behavior and defaults.','chart-bar'],
    ['embeds','Embed Messages','Configure reusable rich message defaults.','article']
  ]],
  ['Utilities',[
    ['search','Search','Configure supported search and lookup commands.','magnifying-glass'],
    ['help','Help','Configure the help command and command discovery.','question'],
    ['reminders','Reminders','Configure reminder delivery and scheduling defaults.','bell'],
    ['statistics','Statistics Channels','Configure live server statistics channels.','chart-line'],
    ['temporaryChannels','Temporary Channels','Configure temporary voice channel behavior.','waveform'],
    ['birthdays','Birthdays','Configure birthday tracking and greeting behavior.','cake']
  ]],
  ['Social Alerts',[
    ['twitch','Twitch Alerts','Configure Twitch stream notifications.','twitch-logo'],
    ['youtube','YouTube Alerts','Configure YouTube upload notifications.','youtube-logo'],
    ['reddit','Reddit Alerts','Configure Reddit post notifications.','reddit-logo'],
    ['instagram','Instagram Alerts','Configure Instagram notifications.','instagram-logo'],
    ['rss','RSS Feeds','Configure RSS feed notifications.','rss'],
    ['kick','Kick Alerts','Configure Kick stream notifications.','broadcast'],
    ['podcast','Podcast Alerts','Configure podcast episode notifications.','microphone-stage'],
    ['tiktok','TikTok Alerts','Configure TikTok notifications.','tiktok-logo'],
    ['xalerts','X Alerts','Configure X notifications.','x-logo']
  ]],
  ['Games & Community',[
    ['giveaways','Giveaways','Configure giveaway defaults and community prize events.','gift'],
    ['economy','Economy','Configure currency, rewards, shop and economy behavior.','coins'],
    ['music','Music','Configure player, DJ role and playback limits.','music-notes'],
    ['casino','Casino','Configure casino game availability and limits.','dice-five'],
    ['lottery','Lottery','Configure lottery entry and reward settings.','ticket']
  ]],
  ['Advanced',[
    ['ai','AI Assistant','Configure AI assistant channel and behavior.','sparkle'],
    ['monetize','Monetization','Configure server monetization settings.','credit-card'],
    ['nftStats','NFT Statistics','Configure NFT collection statistics queries.','cube'],
    ['nftQueries','NFT Queries','Configure NFT lookup commands.','magnifying-glass'],
    ['nftSales','NFT Sales & Listings','Configure NFT sales and listing notifications.','shopping-cart'],
    ['cryptoStats','Crypto Statistics','Configure cryptocurrency statistics.','currency-circle-dollar'],
    ['cryptoQueries','Crypto Queries','Configure cryptocurrency lookup commands.','currency-circle-dollar'],
    ['gasTracker','Gas Tracker','Configure network fee tracking.','gauge'],
    ['gating','Gating','Configure role-gated community access.','lock-key']
  ]],
  ['Administration',[
    ['commands','Commands','Enable or disable individual commands by server.','command'],
    ['system','System','Safe administrative diagnostics and configuration tools.','gear']
  ]]
];

const api=async(path,options={})=>{
  const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  let d={};try{d=await r.json()}catch(_){}
  if(!r.ok)throw new Error(d.error||('Request failed: '+r.status));
  return d;
};
function guildId(){
  const q=new URLSearchParams(location.search);
  const id=(q.get('guildId')||q.get('serverId')||localStorage.getItem('selectedServerId')||localStorage.getItem('guildId')||'').trim();
  if(id){localStorage.setItem('selectedServerId',id);localStorage.setItem('guildId',id);}
  return id;
}
const endpoint=id=>'/api/features/testify-suite/'+encodeURIComponent(id);
const load=async id=>(await api(endpoint(id))).config||{};
const save=async(id,patch)=>api(endpoint(id),{method:'PUT',body:JSON.stringify(patch)});
const all=()=>FEATURES.flatMap(g=>g[1]);
const feature=key=>all().find(x=>x[0]===key);
const enabled=(c,f)=>c.plugins?.[f[0]]!==false;
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const icon=n=>'<i class="ph-bold ph-'+n+'" aria-hidden="true"></i>';
const input=(id,label,value,type='text')=>'<label class="field">'+esc(label)+'<input id="'+id+'" type="'+type+'" value="'+esc(value??'')+'"></label>';
const check=(id,label,value)=>'<label class="check"><span>'+esc(label)+'</span><input id="'+id+'" type="checkbox" '+(value?'checked':'')+'></label>';
const button=(id,label)=>'<button class="select" id="'+id+'" type="button">'+esc(label)+'</button>';
const card=(h,s,c)=>'<div class="card panel"><div class="panel-head"><div><div class="panel-title">'+esc(h)+'</div><div class="panel-sub">'+esc(s||'')+'</div></div></div>'+c+'</div>';
const val=id=>document.getElementById(id)?.value??'';
const yes=id=>!!document.getElementById(id)?.checked;

function addStyles(){
 if(document.getElementById('integrated-dashboard-styles'))return;
 const s=document.createElement('style');s.id='integrated-dashboard-styles';
 s.textContent='.field{display:block;font-size:11px;font-weight:750;color:var(--muted);margin:10px 0}.field input{display:block;width:100%;margin-top:5px;min-height:40px;border:1px solid var(--border);border-radius:10px;padding:9px 10px;background:var(--surface);color:var(--text)}.check{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--border);font-size:12px;font-weight:700}.check input{width:18px;height:18px}.panel-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.command-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.command-item{padding:12px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2)}.feature-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;padding:12px 14px;border:1px solid var(--border);border-radius:13px;background:var(--surface-2)}.feature-toggle>span{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.7px}.feature-toggle button{position:relative;width:48px;height:26px;border:0;border-radius:999px;background:#9ca3b8;padding:0;transition:background .12s ease,box-shadow .12s ease;cursor:pointer}.feature-toggle button:before{content:\"\";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .12s ease}.feature-toggle button.on{background:var(--petrol);box-shadow:0 0 0 3px rgba(21,149,163,.12)}.feature-toggle button.on:before{transform:translateX(22px)}.feature-toggle button:disabled{opacity:.7;cursor:wait}.overview-feature-group{margin-top:18px}.overview-feature-group h2{font-size:16px;font-weight:800;margin-bottom:10px}.overview-feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.overview-feature-card{padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--surface);transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}.overview-feature-card:hover{transform:translateY(-1px);box-shadow:var(--shadow)}.overview-feature-top{display:flex;align-items:flex-start;gap:11px}.overview-feature-icon{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;background:#f0ecff;color:var(--purple)}.dark .overview-feature-icon{background:#241d40}.overview-feature-copy{min-width:0;flex:1}.overview-feature-copy strong{display:block;font-size:12px}.overview-feature-copy span{display:block;font-size:10px;color:var(--muted);margin-top:3px;line-height:1.45}.overview-feature-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:14px}.overview-feature-status{font-size:10px;font-weight:800;color:var(--muted)}.overview-feature-card.is-on .overview-feature-status{color:var(--petrol)}.overview-feature-card.is-off{opacity:.82}.overview-toggle{position:relative;width:42px;height:23px;border:0;border-radius:999px;background:#9ca3b8;cursor:pointer;transition:background .12s ease}.overview-toggle:before{content:\"\";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;transition:transform .12s ease}.overview-toggle.on{background:var(--petrol)}.overview-toggle.on:before{transform:translateX(19px)}.overview-toggle:disabled{opacity:.7;cursor:wait}.nav button.feature-disabled{opacity:.48}.nav button.feature-disabled:after{content:\"OFF\";margin-left:auto;font-size:8px;font-weight:800;letter-spacing:.5px;padding:3px 6px;border-radius:999px;background:var(--surface-2);color:var(--muted)}@media(max-width:900px){.overview-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.command-grid{grid-template-columns:1fr}.overview-feature-grid{grid-template-columns:1fr}}';
 document.head.appendChild(s);
}
function switcher(id,f,c){
 const on=enabled(c,f);
 return '<div class="feature-toggle"><span>'+esc(on?'Enabled':'Disabled')+'</span><button type="button" class="'+(on?'on':'')+'" data-feature-toggle="'+f[0]+'"></button></div>';
}
async function toggleFeature(id,f){
 const c=await load(id);
 const next=!enabled(c,f);
 const result=await save(id,{plugins:{[f[0]]:next}});
 return result.config||result;
}
function attachToggle(id,f,c){
 const el=document.querySelector('[data-feature-toggle]');
 if(!el)return;
 el.addEventListener('click',async e=>{
   e.currentTarget.disabled=true;
   try{await toggleFeature(id,f);window.location.reload();}
   catch(err){e.currentTarget.disabled=false;alert(err.message);}
 });
}
function baseFeaturePanel(id,f,c,fields){
 body.innerHTML=card(f[1],f[2],switcher(id,f,c)+fields+'<div class="panel-actions">'+button('saveFeature','Save '+f[1])+'</div>');
 document.getElementById('saveFeature').onclick=async()=>{
   const fresh=await load(id);
   const patch={channels:{...(fresh.channels||{}),[f[0]]:val('channel')||null},roles:{...(fresh.roles||{}),[f[0]]:val('role')||null},messages:{...(fresh.messages||{}),[f[0]]:val('message')||''}};
   await save(id,patch);alert(f[1]+' saved.');
 };
 attachToggle(id,f,c);
}
async function renderPanel(id,f,c){
 const k=f[0];
 if(k==='welcome'){
   body.innerHTML=card('Welcome & Goodbye',f[2],switcher(id,f,c)+check('welcomeEnabled','Welcome messages',c.welcome?.enabled!==false)+input('channel','Welcome channel ID',c.welcome?.channelId||'')+input('message','Welcome message',c.welcome?.message||'Welcome {user} to {server}!')+check('autorole','Automatic role',!!c.autorole?.enabled)+input('role','Automatic role ID',c.autorole?.roleId||'')+input('prefix','Command prefix',c.prefix||'!')+'<div class="panel-actions">'+button('save','Save settings')+'</div>');
   document.getElementById('save').onclick=async()=>{await save(id,{prefix:val('prefix')||'!',welcome:{...(c.welcome||{}),enabled:yes('welcomeEnabled'),channelId:val('channel')||null,message:val('message')},autorole:{...(c.autorole||{}),enabled:yes('autorole'),roleId:val('role')||null}});alert('Settings saved.');};
   attachToggle(id,f,c);return;
 }
 if(k==='welcomeChannel'){baseFeaturePanel(id,f,c,input('channel','Welcome channel ID',c.welcome?.channelId||'')+input('message','Welcome message',c.welcome?.message||''));return;}
 if(k==='moderator'){baseFeaturePanel(id,f,c,check('warnings','Warnings',true)+check('audit','Audit logging',!!c.audit?.enabled)+input('channel','Moderation log channel ID',c.audit?.channelId||''));return;}
 if(k==='automod'){body.innerHTML=card(f[1],f[2],switcher(id,f,c)+check('enabled','Enable filtering',c.automod?.enabled!==false)+check('invites','Block Discord invites',c.automod?.antiInvite!==false)+check('links','Block links',!!c.automod?.antiLink)+check('caps','Caps protection',!!c.automod?.caps)+check('mentions','Mass mention protection',c.automod?.massMention!==false)+input('max','Spam threshold',c.automod?.maxMessages||6,'number')+input('words','Blocked words',Array.isArray(c.automod?.words)?c.automod.words.join(', '):'')+'<div class="panel-actions">'+button('save','Save AutoMod')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{automod:{...(c.automod||{}),enabled:yes('enabled'),antiInvite:yes('invites'),antiLink:yes('links'),caps:yes('caps'),massMention:yes('mentions'),maxMessages:Number(val('max'))||6,words:val('words').split(',').map(x=>x.trim()).filter(Boolean)}});alert('AutoMod saved.');};attachToggle(id,f,c);return;}
 if(k==='levels'){body.innerHTML=card(f[1],f[2],switcher(id,f,c)+check('enabled','Enable leveling',c.levels?.enabled!==false)+input('xp','XP per message',c.levels?.xpPerMessage||15,'number')+input('per','XP per level',c.levels?.xpPerLevel||500,'number')+check('announce','Announce level ups',c.levels?.announce!==false)+input('channel','Announcement channel ID',c.levels?.announceChannel||'')+'<div class="panel-actions">'+button('save','Save levels')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{levels:{...(c.levels||{}),enabled:yes('enabled'),xpPerMessage:Number(val('xp'))||15,xpPerLevel:Number(val('per'))||500,announce:yes('announce'),announceChannel:val('channel')||null}});alert('Levels saved.');};attachToggle(id,f,c);return;}
 if(k==='economy'){body.innerHTML=card(f[1],f[2],switcher(id,f,c)+check('enabled','Enable economy',c.economy?.enabled!==false)+input('currency','Currency name',c.economy?.currency||'coins')+input('daily','Daily reward',c.economy?.daily||100,'number')+input('min','Work minimum',c.economy?.workMin||20,'number')+input('max','Work maximum',c.economy?.workMax||60,'number')+'<div class="panel-actions">'+button('save','Save economy')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{economy:{...(c.economy||{}),enabled:yes('enabled'),currency:val('currency')||'coins',daily:Number(val('daily'))||100,workMin:Number(val('min'))||20,workMax:Number(val('max'))||60}});alert('Economy saved.');};attachToggle(id,f,c);return;}
 if(k==='ticketing'){body.innerHTML=card(f[1],f[2],switcher(id,f,c)+check('enabled','Enable tickets',c.tickets?.enabled!==false)+input('category','Ticket category ID',c.tickets?.categoryId||'')+input('channel','Ticket panel channel ID',c.tickets?.ticketChannelId||'')+input('support','Support role ID',c.tickets?.supportRoleId||'')+input('log','Transcript log channel ID',c.tickets?.logChannelId||'')+'<div class="panel-actions">'+button('save','Save tickets')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{tickets:{...(c.tickets||{}),enabled:yes('enabled'),categoryId:val('category')||null,ticketChannelId:val('channel')||null,supportRoleId:val('support')||null,logChannelId:val('log')||null}});alert('Tickets saved.');};attachToggle(id,f,c);return;}
 if(k==='commands'){return renderCommands(id,f,c);}
 if(k==='system'){return renderSystem(id,f,c);}
 if(k==='giveaways'){baseFeaturePanel(id,f,c,input('channel','Default giveaway channel ID',c.giveaways?.channelId||'')+input('duration','Default duration (minutes)',c.giveaways?.duration||60,'number')+input('winners','Default winners',c.giveaways?.winners||1,'number')+input('message','Default prize',c.giveaways?.prize||''));return;}
 if(k==='music'){baseFeaturePanel(id,f,c,check('enabled','Enable music',c.music?.enabled!==false)+input('role','DJ role ID',c.music?.djRoleId||'')+input('channel','Default music channel ID',c.music?.channelId||''));return;}
 if(k==='gating'){baseFeaturePanel(id,f,c,input('role','Gated role ID',c.roles?.gating||'')+check('enabled','Require gated role',c.gating?.enabled!==false));return;}
 const fields=input('channel',(k==='nftStats'||k==='nftQueries'||k==='nftSales')?'Collection ID':(k==='cryptoStats'||k==='cryptoQueries')?'Asset':'Network / channel ID',c.channels?.[k]||'')+input('message','Configuration / identifier',c.messages?.[k]||'');
 baseFeaturePanel(id,f,c,fields);
}
async function renderCommands(id,f,c){
 const groups={Information:['avatar','userinfo','serverinfo','profile','rank','roleinfo','botinfo','membercount','permissions'],Economy:['daily','beg','deposit','withdraw','inventory','shop','buy','give','rob','crime','pet'],Fun:['poll','calculator','ascii','advice','dadjoke','wouldyourrather','hack','relationship'],Moderation:['purge','softban','unban','clearwarnings','slowmode','lock','unlock','nickname','role','announce','say','thread'],AutoMod:['automod','automodwords','automodlinks','automodspam'],Configuration:['auditlog','setprefix','sticky','unsticky','counting','welcome','autorole','verify','toggle'],Levels:['levelrewards','setlevelreward','resetxp'],Administration:['blacklist','unblacklist','reloadconfig','debug','guildlist','botstats']};
 let html=switcher(id,f,c)+'<div class="command-grid">';
 Object.entries(groups).forEach(([group,names])=>names.forEach(name=>{html+='<label class="command-item"><span>'+esc(group)+' · '+esc(name)+'</span><input type="checkbox" id="cmd_'+esc(name)+'" '+(c.commandToggles?.[name]!==false?'checked':'')+'></label>';}));
 html+='</div><div class="panel-actions">'+button('saveCommands','Save command settings')+'</div>';
 body.innerHTML=card(f[1],f[2],html);
 document.getElementById('saveCommands').onclick=async()=>{const patch={...(c.commandToggles||{})};Object.values(groups).flat().forEach(n=>patch[n]=yes('cmd_'+n));await save(id,{commandToggles:patch});alert('Command settings saved.');};
 attachToggle(id,f,c);
}
async function renderSystem(id,f,c){
 body.innerHTML=card(f[1],f[2],switcher(id,f,c)+input('command','Command to inspect','ping')+'<div class="panel-actions">'+button('disable','Disable command')+button('normalize','Normalize configuration')+button('inspect','Inspect runtime')+'</div>');
 document.getElementById('disable').onclick=async()=>{await api(endpoint(id)+'/toggle',{method:'POST',body:JSON.stringify({command:val('command'),enabled:false})});alert('Command disabled.');};
 document.getElementById('normalize').onclick=async()=>{await save(id,{enabled:c.enabled!==false});alert('Configuration normalized.');};
 document.getElementById('inspect').onclick=()=>alert(JSON.stringify({guildId:id,enabled:c.enabled!==false,commands:Object.keys(c.commandToggles||{}).length},null,2));
 attachToggle(id,f,c);
}
async function renderOverview(){
 const id=guildId();
 const root=document.getElementById('pluginCatalog');
 if(!root)return;
 if(!id){root.innerHTML=card('Server selection required','Choose a Discord server before managing features.','');return;}
 let c={plugins:{}};
 try{c=await load(id);}catch(err){root.innerHTML=card('Features unavailable','The server feature configuration could not be loaded.','<div class="activity-row"><div class="activity-main"><strong>Error</strong><span>'+esc(err.message||String(err))+'</span></div></div>');return;}
 root.innerHTML='<div class="panel-head"><div><div class="eyebrow">Essentials</div><div class="panel-title">Feature controls</div><div class="panel-sub">Every dashboard panel can be enabled or disabled here. Turning a feature off keeps its panel visible and disables its runtime.</div></div></div>'+featureGroups().map(group=>'<div class="overview-feature-group"><h2>'+esc(group.name)+'</h2><div class="overview-feature-grid">'+group.items.map(f=>{const on=enabled(c,f);return '<article class="overview-feature-card '+(on?'is-on':'is-off')+'"><div class="overview-feature-top"><div class="overview-feature-icon">'+icon(f[3])+'</div><div class="overview-feature-copy"><strong>'+esc(f[1])+'</strong><span>'+esc(f[2])+'</span></div></div><div class="overview-feature-bottom"><span class="overview-feature-status">'+(on?'ON':'OFF')+'</span><button class="overview-toggle '+(on?'on':'')+'" type="button" data-overview-toggle="'+esc(f[0])+'" aria-label="Toggle '+esc(f[1])+'" aria-pressed="'+String(on)+'"></button></div></article>';}).join('')+'</div></div>').join('');
 root.querySelectorAll('[data-overview-toggle]').forEach(el=>el.addEventListener('click',async()=>{
   const key=el.dataset.overviewToggle,f=feature(key),next=!enabled(c,f);
   el.disabled=true;el.classList.toggle('on',next);el.setAttribute('aria-pressed',String(next));
   const cardEl=el.closest('.overview-feature-card');cardEl?.classList.toggle('is-on',next);cardEl?.classList.toggle('is-off',!next);const status=cardEl?.querySelector('.overview-feature-status');if(status)status.textContent=next?'ON':'OFF';
   try{await save(id,{plugins:{[key]:next}});window.location.reload();}
   catch(err){el.disabled=false;el.classList.toggle('on',!next);el.setAttribute('aria-pressed',String(!next));cardEl?.classList.toggle('is-on',!next);cardEl?.classList.toggle('is-off',next);if(status)status.textContent=!next?'ON':'OFF';alert(err.message);}
 }));
}
async function buildNavigation(){
 if(!navigation)return;
 const id=guildId();let c={plugins:{}};
 if(id){try{c=await load(id);}catch(err){console.warn('[dashboard] feature config',err);}}
 navigation.innerHTML='';
 const main=document.createElement('div');main.className='nav-title';main.textContent='Main';navigation.appendChild(main);
 const nav=document.createElement('nav');nav.className='nav';
 const overviewButton=document.createElement('button');overviewButton.type='button';overviewButton.dataset.section='overview';overviewButton.innerHTML='<span class="icon">'+icon('house')+'</span>Overview';overviewButton.onclick=()=>select('overview');nav.appendChild(overviewButton);navigation.appendChild(nav);
 FEATURES.forEach(group=>{
   const visible=group[1];
   if(!visible.length)return;
   const heading=document.createElement('div');heading.className='nav-title';heading.textContent=group[0];navigation.appendChild(heading);
   const groupNav=document.createElement('nav');groupNav.className='nav';
   visible.forEach(f=>{const b=document.createElement('button');b.type='button';b.dataset.section=f[0];b.classList.toggle('feature-disabled',!enabled(c,f));b.innerHTML='<span class="icon">'+icon(f[3])+'</span>'+esc(f[1]);b.onclick=()=>select(f[0]);groupNav.appendChild(b);});
   navigation.appendChild(groupNav);
 });
}
async function select(section){
 document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
 if(section==='overview'){workspace.hidden=true;overview.hidden=false;renderOverview();return;}
 const id=guildId();
 if(!id){overview.hidden=true;workspace.hidden=false;body.innerHTML=card('Server selection required','No guild ID is available. Return to server selection and choose the server again.','');return;}
 const f=feature(section);
 if(!f){overview.hidden=true;workspace.hidden=false;body.innerHTML=card('Panel unavailable','This section is not registered.','');return;}
 try{
   const c=await load(id);
   overview.hidden=true;workspace.hidden=false;
   title.textContent=f[1];description.textContent=f[2];body.innerHTML=card('Loading',f[2],'');
   await renderPanel(id,f,c);
 }catch(err){
   console.error('[dashboard] panel failed',section,err);
   body.innerHTML=card('Panel failed to load','The feature could not be rendered.', '<div class="activity-row"><div class="activity-main"><strong>Error</strong><span>'+esc(err.message||String(err))+'</span></div></div>');
 }
}
addStyles();
window.spideyDashboard={select,guildId,FEATURES};
buildNavigation().then(()=>select('overview'));
