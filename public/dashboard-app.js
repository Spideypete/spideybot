const body=document.querySelector('#workspaceBody');
const workspace=document.querySelector('#featureWorkspace');
const overview=document.querySelector('#overview');
const title=document.querySelector('#workspaceTitle');
const description=document.querySelector('#workspaceDescription');

const panelLoaders={
 settings:()=>import('./panels/testify-settings.js'),
 community:()=>import('./panels/testify-community.js'),
 moderation:()=>import('./panels/testify-moderation.js'),
 automod:()=>import('./panels/testify-automod.js'),
 audit:()=>import('./panels/testify-audit.js'),
 economy:()=>import('./panels/testify-economy.js'),
 levels:()=>import('./panels/testify-levels.js'),
 commands:()=>import('./panels/testify-commands.js'),
 members:()=>import('./panels/testify-members.js'),
 tickets:()=>import('./panels/testify-tickets.js'),
 giveaways:()=>import('./panels/testify-giveaways.js'),
 music:()=>import('./panels/testify-music.js'),
 casino:()=>import('./panels/testify-casino.js'),
 lottery:()=>import('./panels/testify-lottery.js'),
 system:()=>import('./panels/testify-system.js'),
 owner:()=>import('./panels/testify-owner.js')
};

const meta={
 settings:['Server Settings','Prefix, welcome, autorole and core server controls.'],
 community:['Community','Welcome, verification, counting and sticky-message controls.'],
 moderation:['Moderation','Warnings, permissions and moderation controls.'],
 automod:['AutoMod','Invite, link, spam, mention and blocked-word protection.'],
 audit:['Audit Log','Server audit events and moderation activity delivery.'],
 economy:['Economy','Wallets, rewards, shop and economy rankings.'],
 levels:['Levels','XP progression, rewards and server rankings.'],
 commands:['Commands','Manage the bot command catalogue and per-server command switches.'],
 members:['Members','View progression and economy rankings for this server.'],
 tickets:['Tickets','Support ticket configuration and management.'],
 giveaways:['Giveaways','Community giveaway configuration and management.'],
 music:['Music','Music playback and server music controls.'],
 casino:['Casino','Casino availability, limits and game settings.'],
 lottery:['Lottery','Lottery settings, ticketing and announcements.'],
 system:['System','Safe diagnostics, configuration normalization and runtime controls.'],
 owner:['Owner','Owner-only internal administration and diagnostics.']
};

function resolveGuildId(){
  const query=new URLSearchParams(location.search).get('guildId');
  const stored=localStorage.getItem('selectedServerId');
  const id=query||stored||'';
  if(query) localStorage.setItem('selectedServerId',query);
  return id;
}

async function select(section){
  document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
  if(section==='overview'){overview.hidden=false;workspace.hidden=true;return;}
  const gid=resolveGuildId();
  if(!gid){
    overview.hidden=true;workspace.hidden=false;
    body.innerHTML='<div class="card panel"><div class="panel-title">No server selected</div><div class="panel-sub">Open the server selector and choose a Discord server before using dashboard controls.</div></div>';
    return;
  }
  overview.hidden=true;workspace.hidden=false;
  const info=meta[section];
  title.textContent=info?.[0]||'Dashboard';
  description.textContent=info?.[1]||'Configure your server.';
  body.innerHTML='<div class="card panel"><div class="panel-title">Loading</div><div class="panel-sub">Loading live server data…</div></div>';
  const loader=panelLoaders[section];
  if(!loader){
    body.innerHTML='<div class="card panel"><div class="panel-title">Panel unavailable</div><div class="panel-sub">This dashboard section is not registered.</div></div>';
    return;
  }
  try{
    const mod=await loader();
    if(typeof mod.render!=='function') throw new Error('Panel does not export render()');
    await mod.render({body,gid});
  }catch(e){
    console.error('[dashboard] panel failed',section,e);
    body.innerHTML='<div class="card panel"><div class="panel-title">Panel failed to load</div><div class="panel-sub">'+String(e?.message||e).replace(/[&<>]/g,'')+'</div></div>';
  }
}

document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.section)));
document.querySelector('#workspaceRefresh')?.addEventListener('click',()=>{const active=document.querySelector('[data-section].active');if(active)select(active.dataset.section);});
window.spideyDashboard={select,resolveGuildId};
