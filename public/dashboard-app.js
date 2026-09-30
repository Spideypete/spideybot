const body=document.querySelector('#workspaceBody');
const workspace=document.querySelector('#featureWorkspace');
const overview=document.querySelector('#overview');
const title=document.querySelector('#workspaceTitle');
const description=document.querySelector('#workspaceDescription');
const sidebar=document.getElementById('sidebar');

const FEATURES=[
['Essentials',[
['welcome','Welcome & Goodbye','Welcome messages and automatic roles.','chats-circle','settings'],
['welcomeChannel','Welcome Channel','Dedicated welcome channel settings.','door','welcomeChannel'],
['reactionRoles','Reaction Roles','Assign roles from reactions.','hand-waving','reactionRoles'],
['moderator','Moderator','Moderation and server protection.','shield-check','moderation'],
['levels','Levels','XP, ranks and progression.','chart-line-up','levels'],
['achievements','Achievements','Achievements and rewards.','trophy','achievements'],
['starboards','Starboards','Highlight popular messages.','star-four','starboards']]],
['Server Management',[
['automations','Automations','Automated server actions and workflows.','lightning','automations'],
['customCommands','Custom Commands','Create and manage custom commands.','terminal-window','commands'],
['inviteTracker','Invite Tracker','Track invites and referrals.','users-three','inviteTracker'],
['ticketing','Ticketing','Support tickets and transcripts.','ticket','tickets'],
['audit','Audit Log','Record important server events.','list-checks','audit']]],
['Utilities',[
['emojis','Emojis','Manage custom emojis.','smiley','emojis'],
['polls','Polls','Create community polls.','chart-bar','polls'],
['embeds','Embed Messages','Create rich embed messages.','article','embeds'],
['search','Search Anything','Search supported services.','magnifying-glass','search'],
['help','Help','Dashboard and help command controls.','question','help'],
['reminders','Reminders','Schedule custom reminders.','bell','reminders'],
['statistics','Statistics Channels','Server and social statistics.','chart-line','statistics'],
['temporaryChannels','Temporary Channels','Temporary voice channel controls.','waveform','temporaryChannels']]],
['Social Alerts',[
['twitch','Twitch Alerts','Stream-live notifications.','twitch-logo','twitch'],
['xalerts','X Alerts','Post notifications from X.','x-logo','xalerts'],
['youtube','YouTube Alerts','New video notifications.','youtube-logo','youtube'],
['reddit','Reddit Alerts','New post notifications.','reddit-logo','reddit'],
['instagram','Instagram Alerts','Instagram post notifications.','instagram-logo','instagram'],
['rss','RSS Feeds','RSS update notifications.','rss','rss'],
['kick','Kick Alerts','Kick stream notifications.','broadcast','kick'],
['podcast','Podcast Alerts','New podcast episode notifications.','microphone-stage','podcast'],
['tiktok','TikTok Alerts','TikTok post notifications.','tiktok-logo','tiktok']]],
['Games & Fun',[
['giveaways','Giveaways','Giveaways and lotteries.','gift','giveaways'],
['birthdays','Birthdays','Birthday tracking and greetings.','cake','birthdays'],
['economy','Economy','Currency, rewards and shop.','coins','economy'],
['music','Music','Music player and DJ controls.','music-notes','music']]],
['Webby',[
['ai','Webby AI','AI-powered community assistance.','sparkle','ai']]],
['Monetization',[
['monetize','Monetization','Server monetization controls.','credit-card','monetize']]],
['Web3',[
['nftStats','NFT Statistics','Track NFT collection statistics.','cube','nftStats'],
['nftQueries','NFT Queries','Query NFT collection information.','magnifying-glass','nftQueries'],
['nftSales','NFT Sales & Listing','Track NFT sales and listings.','shopping-cart','nftSales'],
['cryptoStats','Crypto Statistics','Track cryptocurrency statistics.','currency-circle-dollar','cryptoStats'],
['cryptoQueries','Crypto Queries','Query cryptocurrency information.','currency-circle-dollar','cryptoQueries'],
['gasTracker','Gas Tracker','Track network fees.','gauge','gasTracker'],
['gating','Gating','Manage NFT-holder access.','lock-key','gating']]]
];

const SPECIAL={settings:settingsPanel,moderation:moderationPanel,levels:levelsPanel,commands:commandsPanel,tickets:ticketsPanel,audit:auditPanel,economy:economyPanel,giveaways:giveawayPanel,music:musicPanel};

const api=async(path,options={})=>{
 const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
 let d={};try{d=await r.json()}catch(_){}
 if(!r.ok)throw new Error(d.error||('Request failed: '+r.status));
 return d;
};
const guildId=()=>{
 const q=new URLSearchParams(location.search);
 const id=(q.get('guildId')||q.get('serverId')||localStorage.getItem('selectedServerId')||localStorage.getItem('guildId')||'').trim();
 if(id){localStorage.setItem('selectedServerId',id);localStorage.setItem('guildId',id)}
 return id;
};
const endpoint=id=>'/api/features/testify-suite/'+encodeURIComponent(id);
const load=async id=>(await api(endpoint(id)+'?guildId='+encodeURIComponent(id))).config||{};
const save=async(id,patch)=>api(endpoint(id)+'?guildId='+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(patch)});
const setFeature=async(id,key,enabled)=>save(id,{plugins:{[key]:enabled}});
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const icon=n=>'<i class="ph-bold ph-'+n+'"></i>';
const val=id=>document.getElementById(id)?.value??'';
const yes=id=>!!document.getElementById(id)?.checked;
const input=(id,label,value,type)=>'<label class="field">'+esc(label)+'<input id="'+id+'" type="'+(type||'text')+'" value="'+esc(value??'')+'"></label>';
const check=(id,label,value)=>'<label class="check"><span>'+esc(label)+'</span><input id="'+id+'" type="checkbox" '+(value?'checked':'')+'></label>';
const btn=(id,label)=>'<button class="select" id="'+id+'" type="button">'+esc(label)+'</button>';
const card=(h,s,c)=>'<div class="card panel"><div class="panel-head"><div><div class="panel-title">'+esc(h)+'</div><div class="panel-sub">'+esc(s||'')+'</div></div></div>'+c+'</div>';
const row=(a,b)=>'<div class="activity-row"><div class="activity-main"><strong>'+esc(a)+'</strong><span>'+esc(b)+'</span></div></div>';

function allFeatures(){return FEATURES.flatMap(g=>g[1]);}
function featureByPanel(panel){return allFeatures().find(f=>f[4]===panel);}
function isEnabled(config,f){return config.plugins?.[f[0]]!==false;}
function addStyles(){
 if(document.getElementById('webby-dashboard-styles'))return;
 const s=document.createElement('style');s.id='webby-dashboard-styles';
 s.textContent='.field{display:block;font-size:11px;font-weight:750;color:var(--muted);margin:10px 0}.field input{display:block;width:100%;margin-top:5px;min-height:40px;border:1px solid var(--border);border-radius:10px;padding:9px 10px;background:var(--surface);color:var(--text)}.check{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--border);font-size:12px;font-weight:700}.check input{width:18px;height:18px}.panel-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.feature-toggle{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)}.feature-toggle button{border:0;border-radius:999px;width:44px;height:24px;background:#cfd3df;cursor:pointer;position:relative}.feature-toggle button.on{background:var(--petrol)}.feature-toggle button:after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.15s}.feature-toggle button.on:after{left:23px}.plugin-sections{display:flex;flex-direction:column;gap:30px}.plugin-section-title{font-size:18px;font-weight:800;margin-bottom:11px}.plugin-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.plugin-card{padding:18px;min-height:185px;display:flex;flex-direction:column}.plugin-card.disabled{opacity:.58}.plugin-icon{width:40px;height:40px;border-radius:12px;background:#f0ecff;color:var(--purple);display:grid;place-items:center;font-size:18px;margin-bottom:13px}.plugin-card h3{font-size:14px}.plugin-card p{font-size:11px;color:var(--muted);margin-top:6px;line-height:1.55}.plugin-foot{display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:16px}.plugin-status{font-size:10px;font-weight:800;padding:5px 9px;border-radius:999px;background:#eaf8f3;color:#19845a}.plugin-status.off{background:#f1f2f6;color:#8790a7}.plugin-switch{width:40px;height:22px;border:0;border:0;border-radius:999px;background:#cfd3df;position:relative;cursor:pointer}.plugin-switch.on{background:var(--petrol)}.plugin-switch:after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:.16s}.plugin-switch.on:after{left:21px}@media(max-width:1050px){.plugin-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.plugin-grid{grid-template-columns:1fr}}';
 document.head.appendChild(s);
}
function switchHtml(id,f,config){
 const on=isEnabled(config,f);
 return '<div class="feature-toggle"><span>'+esc(on?'Feature enabled':'Feature disabled')+'</span><button class="'+(on?'on':'')+'" data-panel-toggle="'+esc(f[0])+'" aria-label="'+(on?'Disable ':'Enable ')+esc(f[1])+'"></button></div>';
}
async function renderOverview(){
 const root=document.getElementById('pluginCatalog');if(!root)return;
 const id=guildId();
 if(!id){root.innerHTML=card('Server selection required','Choose a Discord server before managing features.','');return;}
 try{renderCatalog(await load(id));}catch(e){root.innerHTML=card('Features unavailable','Could not load feature configuration.',row('Error',e.message));}
}
function renderCatalog(config){
 const root=document.getElementById('pluginCatalog');if(!root)return;
 root.innerHTML='<div class="plugin-sections">'+FEATURES.map(g=>'<section><div class="plugin-section-title">'+esc(g[0])+'</div><div class="plugin-grid">'+g[1].map(f=>{const on=isEnabled(config,f);return '<article class="card plugin-card '+(on?'':'disabled')+'"><div class="plugin-icon">'+icon(f[3])+'</div><h3>'+esc(f[1])+'</h3><p>'+esc(f[2])+'</p><div class="plugin-foot"><span class="plugin-status '+(on?'':'off')+'">'+(on?'Enabled':'Disabled')+'</span><button class="plugin-switch '+(on?'on':'')+'" data-feature="'+esc(f[0])+'"></button></div></article>';}).join('')+'</div></section>').join('')+'</div>';
 root.querySelectorAll('[data-feature]').forEach(button=>button.addEventListener('click',async()=>{
   const key=button.dataset.feature;const f=allFeatures().find(x=>x[0]===key);const current=isEnabled(config,f);button.disabled=true;
   try{config=await setFeature(guildId(),key,!current);renderCatalog(config);await buildNavigation();}catch(e){alert(e.message);}finally{button.disabled=false;}
 }));
}
async function buildNavigation(){
 const root=document.getElementById('navigation');if(!root)return;
 const id=guildId();let config={plugins:{}};
 if(id)try{config=await load(id);}catch(_){}
 root.innerHTML='';
 const h=document.createElement('div');h.className='nav-title';h.textContent='Main';root.appendChild(h);
 const n=document.createElement('nav');n.className='nav';
 const b=document.createElement('button');b.type='button';b.dataset.section='overview';b.innerHTML='<span class="icon">'+icon('house')+'</span>Overview';b.onclick=()=>select('overview');n.appendChild(b);root.appendChild(n);
 FEATURES.forEach(group=>{
   const visible=group[1].filter(f=>isEnabled(config,f));if(!visible.length)return;
   const gh=document.createElement('div');gh.className='nav-title';gh.textContent=group[0];root.appendChild(gh);
   const gn=document.createElement('nav');gn.className='nav';
   visible.forEach(f=>{const x=document.createElement('button');x.type='button';x.dataset.section=f[4];x.innerHTML='<span class="icon">'+icon(f[3])+'</span>'+esc(f[1]);x.onclick=()=>select(f[4]);gn.appendChild(x);});
   root.appendChild(gn);
 });
}
async function select(section){
 document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
 if(section==='overview'){overview.hidden=false;workspace.hidden=true;sidebar?.classList.remove('open');await renderOverview();return;}
 const id=guildId();
 if(!id){body.innerHTML=card('Server selection required','No guild ID was supplied to the dashboard.','');return;}
 const f=featureByPanel(section);if(!f)return;
 try{
   const config=await load(id);
   if(!isEnabled(config,f)){await buildNavigation();return;}
   overview.hidden=true;workspace.hidden=false;sidebar?.classList.remove('open');
   title.textContent=f[1];description.textContent=f[2];body.innerHTML=card('Loading','Loading '+f[1]+'…','');
   if(SPECIAL[f[4]])await SPECIAL[f[4]](id);else await genericPanel(id,f,config);
 }catch(e){console.error('[dashboard panel]',section,e);body.innerHTML=card('Panel failed to load','The section could not be rendered.',row('Error',e.message||String(e)));}
}
async function genericPanel(id,f,config){
 const c=await load(id);
 body.innerHTML=card(f[1],f[2],switchHtml(id,f,c)+input('channel','Channel ID',c.channels?.[f[0]]||'')+input('role','Role ID',c.roles?.[f[0]]||'')+input('message','Message / configuration',c.messages?.[f[0]]||'')+'<div class="panel-actions">'+btn('saveFeature','Save '+f[1])+'</div>');
 document.getElementById('saveFeature').onclick=async()=>{const fresh=await load(id);await save(id,{channels:{...(fresh.channels||{}),[f[0]]:val('channel')||null},roles:{...(fresh.roles||{}),[f[0]]:val('role')||null},messages:{...(fresh.messages||{}),[f[0]]:val('message')}});alert(f[1]+' saved.');};
 document.querySelector('[data-panel-toggle]')?.addEventListener('click',async()=>{await setFeature(id,f[0],!isEnabled(c,f));await buildNavigation();await select(f[4]);});
}
async function settingsPanel(id){const c=await load(id),f=featureByPanel('settings');body.innerHTML=card('Welcome & Goodbye','Member greetings and roles.',switchHtml(id,f,c)+check('welcome','Welcome messages',!!c.welcome?.enabled)+input('welcomeChannel','Welcome channel ID',c.welcome?.channelId||'')+input('welcomeMessage','Welcome message',c.welcome?.message||'Welcome {user} to {server}!')+check('autorole','Automatic role',!!c.autorole?.enabled)+input('autoroleId','Automatic role ID',c.autorole?.roleId||'')+input('prefix','Command prefix',c.prefix||'!')+'<div class="panel-actions">'+btn('save','Save settings')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{prefix:val('prefix')||'!',welcome:{...(c.welcome||{}),enabled:yes('welcome'),channelId:val('welcomeChannel')||null,message:val('welcomeMessage')},autorole:{...(c.autorole||{}),enabled:yes('autorole'),roleId:val('autoroleId')||null}});alert('Saved.');};}
async function moderationPanel(id){const c=await load(id),f=featureByPanel('moderator');body.innerHTML=card('Moderator','Moderation and server protection.',switchHtml(id,f,c)+check('audit','Audit logging',!!c.audit?.enabled)+input('auditChannel','Audit log channel ID',c.audit?.channelId||'')+'<div class="panel-actions">'+btn('save','Save')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{audit:{...(c.audit||{}),enabled:yes('audit'),channelId:val('auditChannel')||null}});alert('Saved.');};}
async function levelsPanel(id){const c=await load(id),l=c.levels||{},f=featureByPanel('levels');body.innerHTML=card('Levels','XP progression and rewards.',switchHtml(id,f,c)+check('enabled','Enable leveling',l.enabled!==false)+input('xp','XP per message',l.xpPerMessage||15,'number')+input('per','XP per level',l.xpPerLevel||500,'number')+check('announce','Announce level ups',l.announce!==false)+input('channel','Announcement channel ID',l.announceChannel||'')+'<div class="panel-actions">'+btn('save','Save levels')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{levels:{...l,enabled:yes('enabled'),xpPerMessage:Number(val('xp'))||15,xpPerLevel:Number(val('per'))||500,announce:yes('announce'),announceChannel:val('channel')||null}});alert('Saved.');};}
async function commandsPanel(id){const c=await load(id),f=featureByPanel('customCommands'),groups={Information:['avatar','userinfo','serverinfo','profile','rank'],Economy:['daily','beg','deposit','withdraw','inventory','shop','buy','give','rob','crime'],Fun:['poll','calculator','ascii','advice','dadjoke','wouldyourrather'],Moderation:['purge','softban','unban','clearwarnings','slowmode','lock','unlock','nickname','role','announce','say'],AutoMod:['automod','automodwords','automodlinks','automodspam'],Configuration:['auditlog','setprefix','sticky','unsticky','welcome','autorole','verify'],Levels:['levelrewards','setlevelreward','resetxp'],Music:['play','pause','resume','skip','stop','queue','volume'],Administration:['blacklist','unblacklist','reloadconfig','debug','guildlist','botstats']};let html=switchHtml(id,f,c);Object.keys(groups).forEach(g=>{html+=card(g,'Enable or disable commands.',groups[g].map(n=>check('cmd_'+n,n,c.commandToggles?.[n]!==false)).join(''));});html+='<div class="panel-actions">'+btn('saveCommands','Save command settings')+'</div>';body.innerHTML=html;document.getElementById('saveCommands').onclick=async()=>{const patch={...(c.commandToggles||{})};Object.values(groups).flat().forEach(n=>patch[n]=yes('cmd_'+n));await save(id,{commandToggles:patch});alert('Saved.');};}
async function ticketsPanel(id){const c=await load(id),t=c.tickets||{},f=featureByPanel('ticketing');body.innerHTML=card('Ticketing','Support tickets and transcripts.',switchHtml(id,f,c)+check('enabled','Enable tickets',t.enabled!==false)+input('category','Ticket category ID',t.categoryId||'')+input('channel','Ticket panel channel ID',t.ticketChannelId||'')+input('support','Support role ID',t.supportRoleId||'')+input('log','Transcript log channel ID',t.logChannelId||'')+'<div class="panel-actions">'+btn('save','Save tickets')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{tickets:{...t,enabled:yes('enabled'),categoryId:val('category')||null,ticketChannelId:val('channel')||null,supportRoleId:val('support')||null,logChannelId:val('log')||null}});alert('Saved.');};}
async function auditPanel(id){const c=await load(id),f=featureByPanel('audit');body.innerHTML=card('Audit Log','Audit event delivery.',switchHtml(id,f,c)+check('enabled','Enable audit logging',!!c.audit?.enabled)+input('channel','Audit channel ID',c.audit?.channelId||'')+'<div class="panel-actions">'+btn('save','Save audit settings')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{audit:{...(c.audit||{}),enabled:yes('enabled'),channelId:val('channel')||null}});alert('Saved.');};}
async function economyPanel(id){const c=await load(id),e=c.economy||{},f=featureByPanel('economy');body.innerHTML=card('Economy','Wallet, rewards and shop.',switchHtml(id,f,c)+check('enabled','Enable economy',e.enabled!==false)+input('currency','Currency name',e.currency||'coins')+input('daily','Daily reward',e.daily||100,'number')+input('min','Work minimum',e.workMin||20,'number')+input('max','Work maximum',e.workMax||60,'number')+'<div class="panel-actions">'+btn('save','Save economy')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{economy:{...e,enabled:yes('enabled'),currency:val('currency')||'coins',daily:Number(val('daily'))||100,workMin:Number(val('min'))||20,workMax:Number(val('max'))||60}});alert('Saved.');};}
async function giveawayPanel(id){const c=await load(id),g=c.giveaways||{},f=featureByPanel('giveaways');body.innerHTML=card('Giveaways','Giveaway defaults.',switchHtml(id,f,c)+input('channel','Default channel ID',g.channelId||'')+input('duration','Duration in minutes',g.duration||60,'number')+input('winners','Default winners',g.winners||1,'number')+input('prize','Default prize',g.prize||'')+'<div class="panel-actions">'+btn('save','Save giveaways')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{giveaways:{...g,channelId:val('channel')||null,duration:Number(val('duration'))||60,winners:Number(val('winners'))||1,prize:val('prize')}});alert('Saved.');};}
async function musicPanel(id){const c=await load(id),m=c.music||{},f=featureByPanel('music');body.innerHTML=card('Music','Player and DJ configuration.',switchHtml(id,f,c)+check('enabled','Enable music',m.enabled!==false)+input('dj','DJ role ID',m.djRoleId||'')+input('volume','Maximum volume',m.maxVolume||200,'number')+'<div class="panel-actions">'+btn('save','Save music')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{music:{...m,enabled:yes('enabled'),djRoleId:val('dj')||null,maxVolume:Number(val('volume'))||200}});alert('Saved.');};}

addStyles();
document.getElementById('workspaceRefresh')?.addEventListener('click',()=>{const active=document.querySelector('[data-section].active');if(active)select(active.dataset.section);});
window.spideyDashboard={select,guildId,FEATURES};
buildNavigation().then(renderOverview);