const body=document.querySelector('#workspaceBody');
const workspace=document.querySelector('#featureWorkspace');
const overview=document.querySelector('#overview');
const title=document.querySelector('#workspaceTitle');
const description=document.querySelector('#workspaceDescription');

const panels=[
 {id:'settings',label:'Settings',group:'Server',title:'Server Settings',desc:'Prefix, welcome messages, autorole and server configuration.'},
 {id:'moderation',label:'Moderation',group:'Server',title:'Moderation',desc:'Warnings, moderation actions and audit configuration.'},
 {id:'automod',label:'AutoMod',group:'Server',title:'AutoMod',desc:'Invites, links, spam, mentions and blocked words.'},
 {id:'audit',label:'Audit Log',group:'Server',title:'Audit Log',desc:'Configure audit logging and event delivery.'},
 {id:'tickets',label:'Tickets',group:'Community',title:'Tickets',desc:'Ticket configuration, support roles and transcripts.'},
 {id:'economy',label:'Economy',group:'Community',title:'Economy',desc:'Wallet, bank, rewards, shop and economy rankings.'},
 {id:'levels',label:'Levels',group:'Community',title:'Levels',desc:'XP progression, rewards and level rankings.'},
 {id:'commands',label:'Commands',group:'Community',title:'Commands',desc:'Manage the available slash and prefix command suite.'},
 {id:'music',label:'Music',group:'Community',title:'Music',desc:'Music player and DJ configuration.'},
 {id:'giveaways',label:'Giveaways',group:'Community',title:'Giveaways',desc:'Giveaway defaults and community giveaway controls.'},
 {id:'owner',label:'Owner',group:'Administration',title:'Owner Controls',desc:'Restricted internal administration and diagnostics.'},
 {id:'system',label:'System',group:'Administration',title:'System',desc:'Safe runtime and configuration diagnostics.'}
];

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const card=(h,s,c)=>'<div class="card panel"><div class="panel-head"><div><div class="panel-title">'+esc(h)+'</div><div class="panel-sub">'+esc(s||'')+'</div></div></div>'+c+'</div>';
const input=(id,label,v='',type='text')=>'<label style="display:block;font-size:11px;font-weight:750;color:var(--muted);margin:9px 0">'+esc(label)+'<input id="'+id+'" type="'+type+'" value="'+esc(v)+'" style="display:block;width:100%;margin-top:5px;height:40px;border:1px solid var(--border);border-radius:10px;padding:0 10px;background:var(--surface);color:var(--text)"></label>';
const area=(id,label,v='')=>'<label style="display:block;font-size:11px;font-weight:750;color:var(--muted);margin:9px 0">'+esc(label)+'<textarea id="'+id+'" style="display:block;width:100%;min-height:100px;margin-top:5px;border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--surface);color:var(--text)">'+esc(v)+'</textarea></label>';
const check=(id,label,v=false)=>'<label style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--border);font-size:12px;font-weight:700">'+esc(label)+'<input id="'+id+'" type="checkbox" '+(v?'checked':'')+'></label>';
const btn=(id,label)=>'<button class="select" id="'+id+'" type="button">'+esc(label)+'</button>';
const row=(a,b)=>'<div class="activity-row"><div class="activity-main"><strong>'+esc(a)+'</strong><span>'+esc(b)+'</span></div></div>';
const val=id=>document.getElementById(id)?.value||'';
const yes=id=>!!document.getElementById(id)?.checked;
const api=async(path,opts={})=>{const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||'Request failed ('+r.status+')');return d};
function gid(){const q=new URLSearchParams(location.search);const id=(q.get('guildId')||q.get('serverId')||localStorage.getItem('selectedServerId')||localStorage.getItem('guildId')||'').trim();if(id){localStorage.setItem('selectedServerId',id);localStorage.setItem('guildId',id)}return id}
async function load(id){if(!id)throw new Error('Missing guildId');return (await api('/api/features/testify-suite/'+encodeURIComponent(id))).config||{}}
async function save(id,patch){return api('/api/features/testify-suite/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(patch)})}
async function toggle(id,command,enabled){return api('/api/features/testify-suite/'+encodeURIComponent(id)+'/toggle',{method:'POST',body:JSON.stringify({command,enabled})})}

const groups={
 Information:['avatar','userinfo','serverinfo','roleinfo','botinfo','membercount','permissions','profile','rank'],
 AI:['ai','ask','imagine'],
 Economy:['daily','beg','deposit','withdraw','inventory','shop','buy','give','rob','crime','pet'],
 Fun:['poll','calculator','ascii','advice','dadjoke','wouldyourrather','hack','relationship','rps','coin','dice','8ball','trivia'],
 Moderation:['purge','softban','unban','clearwarnings','slowmode','lock','unlock','nickname','role','announce','say','thread'],
 AutoMod:['automod','automodwords','automodlinks','automodspam'],
 Configuration:['auditlog','setprefix','sticky','unsticky','counting','welcome','autorole','verify','commandtoggle'],
 Levels:['levelrewards','setlevelreward','resetxp'],
 Music:['play','pause','resume','skip','stop','queue','volume'],
 Giveaway:['giveaway','gcreate','gend','greroll'],
 Owner:['blacklist','unblacklist','reloadconfig','debug','guildlist','botstats']
};

async function renderSettings(id){const c=await load(id);body.innerHTML=card('Server Settings','Core server configuration.',input('prefix','Command prefix',c.prefix||'!')+check('welcome','Welcome messages',!!c.welcome?.enabled)+input('welcomeChannel','Welcome channel ID',c.welcome?.channelId||'')+area('welcomeMessage','Welcome message',c.welcome?.message||'Welcome {user} to {server}!')+check('autorole','Automatic role',!!c.autorole?.enabled)+input('autoroleId','Automatic role ID',c.autorole?.roleId||'')+btn('save','Save settings'));document.getElementById('save').onclick=async()=>{await save(id,{prefix:val('prefix')||'!',welcome:{...(c.welcome||{}),enabled:yes('welcome'),channelId:val('welcomeChannel')||null,message:val('welcomeMessage')},autorole:{...(c.autorole||{}),enabled:yes('autorole'),roleId:val('autoroleId')||null}});alert('Settings saved.')}}
async function renderModeration(id){const c=await load(id);body.innerHTML=card('Moderation','Moderation configuration.',check('audit','Audit logging',!!c.audit?.enabled)+input('auditChannel','Audit log channel ID',c.audit?.channelId||'')+btn('save','Save moderation settings'));document.getElementById('save').onclick=async()=>{await save(id,{audit:{...(c.audit||{}),enabled:yes('audit'),channelId:val('auditChannel')||null}});alert('Moderation settings saved.')}}
async function renderAutomod(id){const c=await load(id),a=c.automod||{};body.innerHTML=card('AutoMod','Protection rules.',check('enabled','Enable AutoMod',a.enabled!==false)+check('invites','Block Discord invites',a.antiInvite!==false)+check('links','Block links',!!a.antiLink)+check('spam','Spam protection',a.antiSpam!==false)+check('caps','Caps protection',!!a.caps)+check('mentions','Mass mention protection',a.massMention!==false)+input('max','Spam threshold',a.maxMessages||6,'number')+input('words','Blocked words, comma separated',(a.words||[]).join(', '))+btn('save','Save AutoMod'));document.getElementById('save').onclick=async()=>{await save(id,{automod:{...a,enabled:yes('enabled'),antiInvite:yes('invites'),antiLink:yes('links'),antiSpam:yes('spam'),caps:yes('caps'),massMention:yes('mentions'),maxMessages:Number(val('max'))||6,words:val('words').split(',').map(x=>x.trim()).filter(Boolean)}});alert('AutoMod saved.')}}
async function renderAudit(id){const c=await load(id);body.innerHTML=card('Audit Log','Audit event delivery.',check('enabled','Enable audit logging',!!c.audit?.enabled)+input('channel','Audit channel ID',c.audit?.channelId||'')+btn('save','Save audit settings'));document.getElementById('save').onclick=async()=>{await save(id,{audit:{...(c.audit||{}),enabled:yes('enabled'),channelId:val('channel')||null}});alert('Audit settings saved.')}}
async function renderTickets(id){const c=await load(id),t=c.tickets||{};body.innerHTML=card('Tickets','Support ticket configuration.',check('enabled','Enable tickets',t.enabled!==false)+input('category','Ticket category ID',t.categoryId||'')+input('channel','Ticket panel channel ID',t.ticketChannelId||'')+input('support','Support role ID',t.supportRoleId||'')+input('log','Transcript log channel ID',t.logChannelId||'')+area('message','Panel message',t.message||'Create a support ticket.')+btn('save','Save ticket settings'));document.getElementById('save').onclick=async()=>{await save(id,{tickets:{...t,enabled:yes('enabled'),categoryId:val('category')||null,ticketChannelId:val('channel')||null,supportRoleId:val('support')||null,logChannelId:val('log')||null,message:val('message')}});alert('Ticket settings saved.')}}
async function renderEconomy(id){const c=await load(id),e=c.economy||{},d=await api('/api/features/testify-suite/'+id);const rows=(d.money||[]).slice(0,10).map((x,i)=>row('#'+(i+1)+' '+x.id,(x.total||0)+' '+(e.currency||'coins'))).join('');body.innerHTML=card('Economy','Wallet, rewards and shop.',check('enabled','Enable economy',e.enabled!==false)+input('currency','Currency name',e.currency||'coins')+input('daily','Daily reward',e.daily||100,'number')+input('min','Work minimum',e.workMin||20,'number')+input('max','Work maximum',e.workMax||60,'number')+btn('save','Save economy'))+card('Leaderboard','Top balances.',rows||row('No data','No economy data yet.'));document.getElementById('save').onclick=async()=>{await save(id,{economy:{...e,enabled:yes('enabled'),currency:val('currency')||'coins',daily:Number(val('daily'))||100,workMin:Number(val('min'))||20,workMax:Number(val('max'))||60}});alert('Economy saved.')}}
async function renderLevels(id){const c=await load(id),l=c.levels||{},d=await api('/api/features/testify-suite/'+id);const rows=(d.xp||[]).slice(0,10).map((x,i)=>row('#'+(i+1)+' '+x.id,'Level '+x.level+' · '+x.xp+' XP')).join('');body.innerHTML=card('Levels','XP progression and rewards.',check('enabled','Enable leveling',l.enabled!==false)+input('xp','XP per message',l.xpPerMessage||15,'number')+input('per','XP per level',l.xpPerLevel||500,'number')+check('announce','Announce level ups',l.announce!==false)+input('channel','Announcement channel ID',l.announceChannel||'')+btn('save','Save levels'))+card('Leaderboard','Top members.',rows||row('No data','No XP data yet.'));document.getElementById('save').onclick=async()=>{await save(id,{levels:{...l,enabled:yes('enabled'),xpPerMessage:Number(val('xp'))||15,xpPerLevel:Number(val('per'))||500,announce:yes('announce'),announceChannel:val('channel')||null}});alert('Levels saved.')}}
async function renderCommands(id){const c=await load(id),t=c.commandToggles||{};let html='';for(const [g,items] of Object.entries(groups)){html+=card(g,'Enable or disable commands.',items.map(n=>check('cmd_'+n,n,t[n]!==false)).join(''))}body.innerHTML=html+btn('saveCommands','Save all command switches');document.getElementById('saveCommands').onclick=async()=>{for(const n of Object.values(groups).flat())await toggle(id,n,yes('cmd_'+n));alert('Command switches saved.')}}
async function renderMusic(id){const c=await load(id),m=c.music||{};body.innerHTML=card('Music','Player and DJ settings.',check('enabled','Enable music',m.enabled!==false)+input('dj','DJ role ID',m.djRoleId||'')+input('volume','Maximum volume',m.maxVolume||200,'number')+check('youtube','YouTube',m.youtube!==false)+check('soundcloud','SoundCloud',m.soundcloud!==false)+check('queue','Queue controls',m.queue!==false)+btn('save','Save music settings'));document.getElementById('save').onclick=async()=>{await save(id,{music:{...m,enabled:yes('enabled'),djRoleId:val('dj')||null,maxVolume:Number(val('volume'))||200,youtube:yes('youtube'),soundcloud:yes('soundcloud'),queue:yes('queue')}});alert('Music settings saved.')}}
async function renderGiveaways(id){const c=await load(id),g=c.giveaways||{};body.innerHTML=card('Giveaways','Giveaway defaults.',input('channel','Default channel ID',g.channelId||'')+input('duration','Default duration in minutes',g.duration||60,'number')+input('winners','Default winners',g.winners||1,'number')+input('prize','Default prize',g.prize||'')+btn('save','Save giveaway defaults'));document.getElementById('save').onclick=async()=>{await save(id,{giveaways:{...g,channelId:val('channel')||null,duration:Number(val('duration'))||60,winners:Number(val('winners'))||1,prize:val('prize')}});alert('Giveaway defaults saved.')}}
async function renderSystem(id){const c=await load(id);body.innerHTML=card('System','Safe runtime diagnostics.',row('Server ID',id)+row('Configuration','Loaded')+row('Command switches',Object.keys(c.commandToggles||{}).length)+row('XP members',Object.keys(c.levels?.users||{}).length)+row('Economy currency',c.economy?.currency||'coins'))}
async function renderOwner(id){const c=await load(id);body.innerHTML=card('Owner Controls','Restricted internal controls.',area('snapshot','Configuration snapshot',JSON.stringify({serverId:id,prefix:c.prefix,enabled:c.enabled,commandSwitches:Object.keys(c.commandToggles||{}).length},null,2))+input('blacklist','User ID to blacklist')+btn('save','Apply'));document.getElementById('save').onclick=async()=>{const u=val('blacklist').trim();if(!u)return alert('Enter a user ID.');const list=[...(c.blacklist||[])];if(!list.includes(u))list.push(u);await save(id,{blacklist:list});alert('Owner control saved.')}}
const renderers={settings:renderSettings,moderation:renderModeration,automod:renderAutomod,audit:renderAudit,tickets:renderTickets,economy:renderEconomy,levels:renderLevels,commands:renderCommands,music:renderMusic,giveaways:renderGiveaways,owner:renderOwner,system:renderSystem};

function buildNav(){
 const side=document.querySelector('#sidebar');if(!side)return;
 side.querySelectorAll('.nav-title,.nav').forEach(e=>e.remove());
 const foot=side.querySelector('.sidebar-foot');
 const add=(group,items)=>{const h=document.createElement('div');h.className='nav-title';h.textContent=group;side.insertBefore(h,foot);const n=document.createElement('nav');n.className='nav';side.insertBefore(n,foot);for(const p of items){const b=document.createElement('button');b.type='button';b.dataset.section=p.id;b.innerHTML='<span class="icon">'+(p.id==='overview'?'⌂':'•')+'</span>'+p.label;b.onclick=()=>select(p.id);n.appendChild(b)}};
 add('Main',[{id:'overview',label:'Overview'}]);
 for(const group of ['Server','Community','Administration'])add(group,panels.filter(p=>p.group===group));
}
async function select(section){
 document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
 if(section==='overview'){overview.hidden=false;workspace.hidden=true;return}
 const id=gid();overview.hidden=true;workspace.hidden=false;
 if(!id){title.textContent='Server selection required';description.textContent='Choose a Discord server before opening a panel.';body.innerHTML=card('No server selected','A guildId is required to load server configuration.');return}
 const p=panels.find(x=>x.id===section);if(!p)return;
 title.textContent=p.title;description.textContent=p.desc;body.innerHTML=card('Loading','Loading server configuration…','');
 try{await renderers[section](id)}catch(e){console.error('[dashboard]',section,e);body.innerHTML=card('Panel failed to load','The panel returned an error.',row('Error',e?.message||String(e)))} 
}
buildNav();
document.querySelector('#workspaceRefresh')?.addEventListener('click',()=>{const a=document.querySelector('[data-section].active');if(a)select(a.dataset.section)});
window.spideyDashboard={select,gid,panels};
