const body=document.querySelector('#workspaceBody');
const workspace=document.querySelector('#featureWorkspace');
const overview=document.querySelector('#overview');
const title=document.querySelector('#workspaceTitle');
const description=document.querySelector('#workspaceDescription');

const panels=[
  {id:'settings',label:'Settings',group:'Server',icon:'⚙',title:'Server Settings',description:'Welcome, autorole, prefix and core server configuration.',file:'settings.js'},
  {id:'moderation',label:'Moderation',group:'Server',icon:'◈',title:'Moderation',description:'Warnings, audit delivery and moderation controls.',file:'moderation.js'},
  {id:'automod',label:'AutoMod',group:'Server',icon:'◉',title:'AutoMod',description:'Invite, link, spam, mention and blocked-word protection.',file:'automod.js'},
  {id:'audit',label:'Audit Log',group:'Server',icon:'◷',title:'Audit Log',description:'Choose where server audit events are delivered.',file:'audit.js'},
  {id:'economy',label:'Economy',group:'Community',icon:'¤',title:'Economy',description:'Wallets, rewards, shop and rankings.',file:'economy.js'},
  {id:'levels',label:'Levels',group:'Community',icon:'↗',title:'Levels',description:'XP progression, announcements, rewards and rankings.',file:'levels.js'},
  {id:'commands',label:'Commands',group:'Community',icon:'⌘',title:'Commands',description:'Manage slash and prefix command switches.',file:'commands.js'},
  {id:'tickets',label:'Tickets',group:'Tools',icon:'▣',title:'Tickets',description:'Configure the support ticket system.',file:'tickets.js'},
  {id:'giveaways',label:'Giveaways',group:'Tools',icon:'◇',title:'Giveaways',description:'Configure giveaway defaults and announcements.',file:'giveaways.js'},
  {id:'system',label:'System',group:'Administration',icon:'◫',title:'System',description:'Internal diagnostics and safe server configuration tools.',file:'system.js'}
];

const panelLoaders=Object.fromEntries(panels.map(p=>[p.id,()=>import('./panels/'+p.file)]));
const meta=Object.fromEntries(panels.map(p=>[p.id,[p.title,p.description]]));

function ensureNavigation(){
  const sidebar=document.querySelector('#sidebar');
  if(!sidebar)return;
  const existing=new Map([...sidebar.querySelectorAll('[data-section]')].map(el=>[el.dataset.section,el]));
  const wanted=new Set(['overview',...panels.map(p=>p.id)]);
  sidebar.querySelectorAll('[data-section]').forEach(el=>{if(!wanted.has(el.dataset.section))el.remove();});
  panels.forEach(p=>{
    let el=existing.get(p.id);
    if(!el){
      const nav=[...sidebar.querySelectorAll('.nav')].find(n=>n.previousElementSibling?.textContent?.trim()===p.group);
      const group=nav||createGroup(sidebar,p.group);
      el=document.createElement('button');
      el.type='button';
      el.dataset.section=p.id;
      el.innerHTML='<span class="icon">'+p.icon+'</span>'+p.label;
      group.appendChild(el);
    }
  });
  const buttons=[...sidebar.querySelectorAll('[data-section]')];
  buttons.forEach(b=>{
    b.onclick=null;
    b.addEventListener('click',()=>select(b.dataset.section));
  });
}
function createGroup(sidebar,name){
  const title=document.createElement('div');
  title.className='nav-title';
  title.textContent=name;
  const nav=document.createElement('nav');
  nav.className='nav';
  sidebar.append(title,nav);
  return nav;
}
function resolveGuildId(){
  const q=new URLSearchParams(location.search);
  const id=String(q.get('guildId')||q.get('serverId')||localStorage.getItem('selectedServerId')||localStorage.getItem('guildId')||'').trim();
  if(id){localStorage.setItem('selectedServerId',id);localStorage.setItem('guildId',id);}
  return id;
}
async function select(section){
  document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
  if(section==='overview'){overview.hidden=false;workspace.hidden=true;return;}
  const gid=resolveGuildId();
  overview.hidden=true;
  workspace.hidden=false;
  if(!gid){
    title.textContent='Server selection required';
    description.textContent='Choose a Discord server before opening configuration.';
    body.innerHTML='<div class="card panel"><div class="panel-title">No server selected</div><div class="panel-sub">This page needs a selected Discord server. Return to server selection and open the dashboard again.</div></div>';
    return;
  }
  const info=meta[section];
  const loader=panelLoaders[section];
  if(!info||!loader){
    body.innerHTML='<div class="card panel"><div class="panel-title">Panel unavailable</div><div class="panel-sub">This dashboard section is not registered.</div></div>';
    return;
  }
  title.textContent=info[0];
  description.textContent=info[1];
  body.innerHTML='<div class="card panel"><div class="panel-title">Loading</div><div class="panel-sub">Loading server configuration…</div></div>';
  try{
    const mod=await loader();
    if(typeof mod.render!=='function')throw new Error('Panel does not export render()');
    await mod.render({body,gid});
  }catch(e){
    console.error('[dashboard]',section,e);
    body.innerHTML='<div class="card panel"><div class="panel-title">Panel failed to load</div><div class="panel-sub">'+String(e?.message||e).replace(/[&<>]/g,'')+'</div></div>';
  }
}
ensureNavigation();
document.querySelector('#workspaceRefresh')?.addEventListener('click',()=>{
  const active=document.querySelector('[data-section].active');
  if(active)select(active.dataset.section);
});
window.spideyDashboard={select,resolveGuildId,panels};