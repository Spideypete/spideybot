const body=document.querySelector('#workspaceBody');
const workspace=document.querySelector('#featureWorkspace');
const overview=document.querySelector('#overview');
const title=document.querySelector('#workspaceTitle');
const description=document.querySelector('#workspaceDescription');

const panels=[
{id:'settings',label:'Settings',group:'Server',title:'Server Settings',desc:'Prefix, welcome messages and automatic roles.',icon:'⚙'},
{id:'moderation',label:'Moderation',group:'Server',title:'Moderation',desc:'Warnings, moderation controls and audit delivery.',icon:'◈'},
{id:'automod',label:'AutoMod',group:'Server',title:'AutoMod',desc:'Invites, links, spam, mentions and blocked words.',icon:'◉'},
{id:'audit',label:'Audit Log',group:'Server',title:'Audit Log',desc:'Configure where audit activity is delivered.',icon:'◷'},
{id:'economy',label:'Economy',group:'Community',title:'Economy',desc:'Currency, rewards and economy rankings.',icon:'¤'},
{id:'levels',label:'Levels',group:'Community',title:'Levels',desc:'XP, level progression and level-up announcements.',icon:'↗'},
{id:'commands',label:'Commands',group:'Community',title:'Commands',desc:'Control slash and prefix commands by category.',icon:'⌘'},
{id:'tickets',label:'Tickets',group:'Community',title:'Tickets',desc:'Support tickets, transcripts and support roles.',icon:'▣'},
{id:'giveaways',label:'Giveaways',group:'Community',title:'Giveaways',desc:'Giveaway defaults and live giveaway controls.',icon:'◇'},
{id:'music',label:'Music',group:'Tools',title:'Music',desc:'Playback, DJ controls and music permissions.',icon:'♫'},
{id:'casino',label:'Casino',group:'Tools',title:'Casino',desc:'Casino games, betting limits and game switches.',icon:'◎'},
{id:'lottery',label:'Lottery',group:'Tools',title:'Lottery',desc:'Ticket price, schedule and announcements.',icon:'◌'},
{id:'system',label:'System',group:'Administration',title:'System',desc:'Runtime diagnostics and safe server controls.',icon:'◫'},
{id:'owner',label:'Owner',group:'Administration',title:'Owner Controls',desc:'Restricted internal diagnostics for authorized owners.',icon:'♛'}
];

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=n=>'<span class="icon">'+n+'</span>';
const card=(heading,sub,content)=>'<div class="card panel"><div class="panel-head"><div><div class="panel-title">'+heading+'</div>'+(sub?'<div class="panel-sub">'+esc(sub)+'</div>':'')+'</div></div>'+content+'</div>';
const input=(id,label,value='',type='text')=>'<label style="display:block;font-size:11px;font-weight:750;color:var(--muted);margin:9px 0">'+esc(label)+'<input id="'+id+'" type="'+type+'" value="'+esc(value)+'" style="display:block;width:100%;margin-top:5px;height:40px;border:1px solid var(--border);border-radius:10px;padding:0 10px;background:var(--surface);color:var(--text)"></label>';
const textarea=(id,label,value='')=>'<label style="display:block;font-size:11px;font-weight:750;color:var(--muted);margin:9px 0">'+esc(label)+'<textarea id="'+id+'" style="display:block;width:100%;min-height:100px;margin-top:5px;border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--surface);color:var(--text)">'+esc(value)+'</textarea></label>';
const check=(id,label,value=false)=>'<label style="display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--border);font-size:12px;font-weight:700">'+esc(label)+'<input id="'+id+'" type="checkbox" '+(value?'checked':'')+'></label>';
const btn=(id,label)=>'<button class="select" id="'+id+'" type="button">'+esc(label)+'</button>';
const row=(a,b)=>'<div class="activity-row"><div class="activity-main"><strong>'+esc(a)+'</strong><span>'+esc(b)+'</span></div></div>';
const val=id=>document.getElementById(id)?.value||'';
const yes=id=>!!document.getElementById(id)?.checked;
const api=async(path,opts={})=>{const r=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||'Request failed ('+r.status+')');return d};
const gid=()=>{const q=new URLSearchParams(location.search);const id=(q.get('guildId')||q.get('serverId')||localStorage.getItem('selectedServerId')||localStorage.getItem('guildId')||'').trim();if(id){localStorage.setItem('selectedServerId',id);localStorage.setItem('guildId',id)}return id};

function nav(){
 const side=document.querySelector('#sidebar');if(!side)return;
 side.querySelectorAll('[data-section]').forEach(e=>e.remove());
 side.querySelectorAll('.nav-title').forEach(e=>{if(e.textContent.trim()!=='Main')e.remove()});
 side.querySelectorAll('.nav').forEach(e=>e.remove());
 const mainTitle=side.querySelector('.nav-title');
 const main=document.createElement('nav');main.className='nav';
 const ov=document.createElement('button');ov.type='button';ov.dataset.section='overview';ov.className='active';ov.innerHTML=icon('⌂')+'Overview';main.appendChild(ov);side.insertBefore(main,side.querySelector('.sidebar-foot'));
 let last=null;
 for(const p of panels){
   if(p.group!==last){
     const h=document.createElement('div');h.className='nav-title';h.textContent=p.group;side.insertBefore(h,side.querySelector('.sidebar-foot'));
     const n=document.createElement('nav');n.className='nav';side.insertBefore(n,side.querySelector('.sidebar-foot'));last=p.group;side._nav=n;
   }
   const b=document.createElement('button');b.type='button';b.dataset.section=p.id;b.innerHTML=icon(p.icon)+esc(p.label);b.onclick=()=>select(p.id);side._nav.appendChild(b);
 }
 ov.onclick=()=>select('overview');
}

async function loadConfig(id){return (await api('/api/features/testify-suite/'+encodeURIComponent(id))).config||{}}
async function saveConfig(id,patch){return api('/api/features/testify-suite/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(patch)})}

async function renderSettings(id){
 const c=await loadConfig(id);body.innerHTML=card('Server Settings','Core server configuration.',
 input('prefix','Command prefix',c.prefix||'!')+check('welcome','Welcome messages',!!c.welcome?.enabled)+input('welcomeChannel','Welcome channel ID',c.welcome?.channelId||'')+textarea('welcomeMessage','Welcome message',c.welcome?.message||'Welcome {user} to {server}!')+check('autorole','Automatic role',!!c.autorole?.enabled)+input('autoroleId','Automatic role ID',c.autorole?.roleId||'')+btn('save','Save settings'));
 document.getElementById('save').onclick=async()=>{await saveConfig(id,{prefix:val('prefix')||'!',welcome:{...(c.welcome||{}),enabled:yes('welcome'),channelId:val('welcomeChannel')||null,message:val('welcomeMessage')},autorole:{...(c.autorole||{}),enabled:yes('autorole'),roleId:val('autoroleId')||null}});alert('Settings saved.')}
}
async function renderModeration(id){
 const c=await loadConfig(id);body.innerHTML=card('Moderation','Moderation and audit controls.',
 check('audit','Audit logging',!!c.audit?.enabled)+input('auditChannel','Audit log channel ID',c.audit?.channelId||'')+btn('save','Save moderation settings'));
 document.getElementById('save').onclick=async()=>{await saveConfig(id,{audit:{...(c.audit||{}),enabled:yes('audit'),channelId:val('auditChannel')||null}});alert('Moderation settings saved.')}
}
async function renderAutomod(id){
 const c=await loadConfig(id),a=c.automod||{};body.innerHTML=card('AutoMod','Protection rules.',
 check('enabled','Enable AutoMod',a.enabled!==false)+check('invites','Block Discord invites',a.antiInvite!==false)+check('links','Block links',!!a.antiLink)+check('spam','Spam protection',a.antiSpam!==false)+check('caps','Caps protection',!!a.caps)+check('mentions','Mass mention protection',a.massMention!==false)+input('max','Spam threshold',a.maxMessages||6,'number')+input('words','Blocked words, comma separated',(a.words||[]).join(', '))+btn('save','Save AutoMod'));
 document.getElementById('save').onclick=async()=>{await saveConfig(id,{automod:{...a,enabled:yes('enabled'),antiInvite:yes('invites'),antiLink:yes('links'),antiSpam:yes('spam'),caps:yes('caps'),massMention:yes('mentions'),maxMessages:Number(val('max'))||6,words:val('words').split(',').map(x=>x.trim()).filter(Boolean)}});alert('AutoMod saved.')}
}
async function renderAudit(id){const c=await loadConfig(id);body.innerHTML=card('Audit Log','Server audit event delivery.',check('enabled','Enable audit logging',!!c.audit?.enabled)+input('channel','Audit channel ID',c.audit?.channelId||'')+btn('save','Save audit settings'));document.getElementById('save').onclick=async()=>{await saveConfig(id,{audit:{...(c.audit||{}),enabled:yes('enabled'),channelId:val('channel')||null}});alert('Audit settings saved.')}} 
async function renderEconomy(id){const c=await loadConfig(id),e=c.economy||{},d=await api('/api/features/testify-suite/'+id);const rows=(d.money||[]).slice(0,10).map((x,i)=>row('#'+(i+1)+' '+x.id,(x.total||0)+' '+(e.currency||'coins'))).join('');body.innerHTML=card('Economy','Currency and rewards.',check('enabled','Enable economy',e.enabled!==false)+input('currency','Currency name',e.currency||'coins')+input('daily','Daily reward',e.daily||100,'number')+input('min','Work minimum',e.workMin||20,'number')+input('max','Work maximum',e.workMax||60,'number')+btn('save','Save economy'))+card('Economy rankings','Top balances.',rows||row('No data','No economy data yet.'));document.getElementById('save').onclick=async()=>{await saveConfig(id,{economy:{...e,enabled:yes('enabled'),currency:val('currency')||'coins',daily:Number(val('daily'))||100,workMin:Number(val('min'))||20,workMax:Number(val('max'))||60}});alert('Economy saved.')}} 
async function renderLevels(id){const c=await loadConfig(id),l=c.levels||{},d=await api('/api/features/testify-suite/'+id);const rows=(d.xp||[]).slice(0,10).map((x,i)=>row('#'+(i+1)+' '+x.id,'Level '+x.level+' · '+x.xp+' XP')).join('');body.innerHTML=card('Levels','XP progression.',check('enabled','Enable leveling',l.enabled!==false)+input('xp','XP per message',l.xpPerMessage||15,'number')+input('per','XP per level',l.xpPerLevel||500,'number')+check('announce','Announce level ups',l.announce!==false)+input('channel','Announcement channel ID',l.announceChannel||'')+btn('save','Save levels'))+card('XP leaderboard','Top members.',rows||row('No data','No XP data yet.'));document.getElementById('save').onclick=async()=>{await saveConfig(id,{levels:{...l,enabled:yes('enabled'),xpPerMessage:Number(val('xp'))||15,xpPerLevel:Number(val('per'))||500,announce:yes('announce'),announceChannel:val('channel')||null}});alert('Levels saved.')}} 
const commandGroups={Information:['avatar','userinfo','serverinfo','roleinfo','botinfo','membercount','permissions','profile','rank'],Economy:['daily','beg','deposit','withdraw','inventory','shop','buy','give','rob','crime','pet'],Fun:['poll','calculator','ascii','advice','dadjoke','wouldyourrather','hack','relationship'],Moderation:['purge','softban','unban','clearwarnings','slowmode','lock','unlock','nickname','role','announce','say','thread'],AutoMod:['automod','automodwords','automodlinks','automodspam'],Configuration:['auditlog','setprefix','sticky','unsticky','counting','welcome','autorole','verify','commandtoggle'],Levels:['levelrewards','setlevelreward','resetxp'],System:['botstats','guildlist','blacklist','unblacklist','reloadconfig','debug']};
async function renderCommands(id){const c=await loadConfig(id),t=c.commandToggles||{};let html='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px">';for(const [g,items] of Object.entries(commandGroups)){html+=card(g,'Enable or disable commands.',items.map(n=>check('cmd_'+n,n,t[n]!==false)).join(''))}html+='</div>'+btn('saveCommands','Save all command switches');body.innerHTML=html;document.getElementById('saveCommands').onclick=async()=>{for(const n of Object.values(commandGroups).flat())await api('/api/features/testify-suite/'+id+'/toggle',{method:'POST',body:JSON.stringify({command:n,enabled:yes('cmd_'+n)})});alert('Command switches saved.')}} 
async function renderTickets(id){let d={};try{d=await api('/api/features/tickets/'+id)}catch{}const s=d.settings||{};body.innerHTML=card('Tickets','Support ticket configuration.',input('category','Ticket category ID',s.categoryId||'')+input('log','Transcript log channel ID',s.logChannelId||'')+input('support','Support role ID',s.supportRoleId||'')+input('channel','Ticket panel channel ID',s.ticketChannelId||'')+btn('save','Save ticket settings'))+card('Open tickets','Currently open tickets.',(d.openTickets||[]).map(t=>row(t.id,'User '+(t.userId||'—')+' · Channel '+(t.channelId||'—')).join('')||row('No open tickets','There are currently no open tickets.'));document.getElementById('save').onclick=async()=>{await api('/api/features/tickets/'+id+'/config',{method:'POST',body:JSON.stringify({categoryId:val('category'),logChannelId:val('log'),supportRoleId:val('support'),ticketChannelId:val('channel')})});alert('Ticket settings saved.')}} 
async function renderGiveaways(id){const c=await loadConfig(id),g=c.giveaways||{};body.innerHTML=card('Giveaways','Default giveaway settings.',input('channel','Default channel ID',g.channelId||'')+input('duration','Default duration (minutes)',g.duration||60,'number')+input('winners','Default winners',g.winners||1,'number')+input('prize','Default prize',g.prize||'')+btn('save','Save giveaway defaults'));document.getElementById('save').onclick=async()=>{await saveConfig(id,{giveaways:{...g,channelId:val('channel'),duration:Number(val('duration'))||60,winners:Number(val('winners'))||1,prize:val('prize')}});alert('Giveaway defaults saved.')}} 
async function renderMusic(id){const c=await loadConfig(id),m=c.music||{};body.innerHTML=card('Music','Playback and DJ controls.',check('enabled','Enable music',m.enabled!==false)+input('dj','DJ role ID',m.djRoleId||'')+input('volume','Maximum volume',m.maxVolume||200,'number')+check('youtube','YouTube',m.youtube!==false)+check('soundcloud','SoundCloud',m.soundcloud!==false)+check('queue','Queue controls',m.queue!==false)+check('djonly','DJ-only controls',!!m.djOnly)+btn('save','Save music settings'));document.getElementById('save').onclick=async()=>{await saveConfig(id,{music:{...m,enabled:yes('enabled'),djRoleId:val('dj'),maxVolume:Number(val('volume'))||200,youtube:yes('youtube'),soundcloud:yes('soundcloud'),queue:yes('queue'),djOnly:yes('djonly')}});alert('Music settings saved.')}} 
async function renderCasino(id){const c=await loadConfig(id),x=c.casino||{},g=x.games||{};body.innerHTML=card('Casino','Betting limits and games.',check('enabled','Enable casino',x.enabled!==false)+input('min','Minimum bet',x.minBet||1,'number')+input('max','Maximum bet',x.maxBet||10000,'number')+check('blackjack','Blackjack',g.blackjack!==false)+check('roulette','Roulette',g.roulette!==false)+check('hilo','Hi-Lo',g.hilo!==false)+check('slots','Slots',g.slots!==false)+check('coin','Coinflip',g.coinflip!==false)+check('dice','Dice',g.dice!==false)+btn('save','Save casino settings'));document.getElementById('save').onclick=async()=>{await saveConfig(id,{casino:{...x,enabled:yes('enabled'),minBet:Number(val('min'))||1,maxBet:Number(val('max'))||10000,games:{blackjack:yes('blackjack'),roulette:yes('roulette'),hilo:yes('hilo'),slots:yes('slots'),coinflip:yes('coin'),dice:yes('dice')}}});alert('Casino settings saved.')}} 
async function renderLottery(id){const c=await loadConfig(id),l=c.lottery||{};body.innerHTML=card('Lottery','Ticket and draw settings.',check('enabled','Enable lottery',!!l.enabled)+input('price','Ticket price',l.ticketPrice||10,'number')+input('schedule','Draw schedule',l.schedule||'weekly')+input('channel','Announcement channel ID',l.channelId||'')+btn('save','Save lottery settings'));document.getElementById('save').onclick=async()=>{await saveConfig(id,{lottery:{...l,enabled:yes('enabled'),ticketPrice:Number(val('price'))||10,schedule:val('schedule')||'weekly',channelId:val('channel')}});alert('Lottery settings saved.')}} 
async function renderSystem(id){const c=await loadConfig(id);body.innerHTML=card('System','Runtime and configuration diagnostics.',row('Server ID',id)+row('Configuration','Loaded')+row('Command switches',String(Object.keys(c.commandToggles||{}).length))+row('XP members',String(Object.keys(c.levels?.users||{}).length))+row('Economy currency',c.economy?.currency||'coins')+btn('inspect','Inspect configuration'));document.getElementById('inspect').onclick=()=>alert(JSON.stringify({serverId:id,commandSwitches:Object.keys(c.commandToggles||{}).length,enabled:c.enabled!==false},null,2))} 
async function renderOwner(id){const c=await loadConfig(id);body.innerHTML=card('Owner Controls','Internal diagnostics. Access remains permission-protected by the API.',textarea('debug','Configuration snapshot',JSON.stringify({serverId:id,enabled:c.enabled,prefix:c.prefix,commandSwitches:Object.keys(c.commandToggles||{}).length},null,2))+input('blacklist','User ID to blacklist')+btn('save','Save internal control'));document.getElementById('save').onclick=async()=>{const u=val('blacklist').trim();if(!u)return alert('Enter a user ID.');const list=[...(c.blacklist||[])];if(!list.includes(u))list.push(u);await saveConfig(id,{blacklist:list});alert('Internal control saved.')}} 

const renderers={settings:renderSettings,moderation:renderModeration,automod:renderAutomod,audit:renderAudit,economy:renderEconomy,levels:renderLevels,commands:renderCommands,tickets:renderTickets,giveaways:renderGiveaways,music:renderMusic,casino:renderCasino,lottery:renderLottery,system:renderSystem,owner:renderOwner};

async function select(section){
 document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
 if(section==='overview'){overview.hidden=false;workspace.hidden=true;return}
 const id=gid();overview.hidden=true;workspace.hidden=false;
 if(!id){title.textContent='Server selection required';description.textContent='Choose a Discord server before opening a panel.';body.innerHTML=card('No server selected','Open the dashboard from a selected Discord server.');return}
 const p=panels.find(x=>x.id===section);if(!p)return;
 title.textContent=p.title;description.textContent=p.desc;body.innerHTML=card('Loading','Loading server configuration…','');
 try{await renderers[section](id)}catch(e){console.error('[dashboard]',section,e);body.innerHTML=card('Panel failed to load','The panel returned an error.',row('Error',e.message||String(e)))} 
}
nav();
document.querySelector('#workspaceRefresh')?.addEventListener('click',()=>{const a=document.querySelector('[data-section].active');if(a)select(a.dataset.section)});
window.spideyDashboard={select,gid,panels};
