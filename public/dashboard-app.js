const body=document.querySelector('#workspaceBody');
const workspace=document.querySelector('#featureWorkspace');
const overview=document.querySelector('#overview');
const title=document.querySelector('#workspaceTitle');
const description=document.querySelector('#workspaceDescription');
const gid=new URLSearchParams(location.search).get('guildId')||localStorage.getItem('selectedServerId');

const panelLoaders={
 analytics:()=>import('./panels/analytics.js'),
 settings:()=>import('./panels/settings.js'),
 logging:()=>import('./panels/logging.js'),
 moderation:()=>import('./panels/server-guard.js'),
 roles:()=>import('./panels/roles.js'),
 categories:()=>import('./panels/categories.js'),
 messages:()=>import('./panels/messages.js'),
 commands:()=>import('./panels/commands.js'),
 levels:()=>import('./panels/levels.js'),
 leaderboard:()=>import('./panels/leaderboard.js'),
 giveaways:()=>import('./panels/giveaways.js'),
 tickets:()=>import('./panels/tickets.js'),
 social:()=>import('./panels/social.js'),
 invites:()=>import('./panels/invites.js'),
 testifySettings:()=>import('./panels/testify-settings.js'),
 testifyAutomod:()=>import('./panels/testify-automod.js'),
 testifyEconomy:()=>import('./panels/testify-economy.js'),
 testifyLevels:()=>import('./panels/testify-levels.js'),
 testifyModeration:()=>import('./panels/testify-moderation.js'),
 testifySystem:()=>import('./panels/testify-system.js')
};

const meta={
 analytics:['Analytics','Live server activity and usage metrics.'],
 settings:['General Settings','Core server configuration and bot preferences.'],
 messages:['Server Messages','Welcome, goodbye and boost message automation.'],
 moderation:['Server Guard','Security, anti-spam, raid and protection controls.'],
 logging:['Logging','Message and moderation event logging.'],
 roles:['Reaction Roles','Create and manage reaction-based role assignments.'],
 categories:['Role Categories','Organize roles into configurable categories.'],
 commands:['Custom Commands','Create custom commands and review the current command catalog.'],
 levels:['XP & Levels','Configure progression, rewards and level-up behavior.'],
 leaderboard:['Leaderboard','View server XP rankings.'],
 giveaways:['Giveaways','Create, end, delete and reroll giveaways.'],
 tickets:['Tickets','Configure and manage support tickets.'],
 social:['Social Notifications','Monitor Twitch, YouTube, Kick, TikTok and other supported channels.'],
 invites:['Invites','Track invite codes, joins, leaves and referral rankings.'],
 testifySettings:['Testify Settings','Prefix, welcome, autorole, counting and server utilities.'],
 testifyAutomod:['Testify AutoMod','Invite, link, spam, mention and word filtering.'],
 testifyModeration:['Testify Moderation','Warnings, command controls, audit configuration and safety tools.'],
 testifyEconomy:['Testify Economy','Wallet, bank, rewards, shop and economy rankings.'],
 testifyLevels:['Testify Levels','XP progression, level rewards and leaderboards.'],
 testifySystem:['Testify System','Safe internal controls and diagnostics.']
};

async function select(section){
 document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
 if(section==='overview'){overview.hidden=false;workspace.hidden=true;return;}
 if(!gid){overview.hidden=true;workspace.hidden=false;body.innerHTML='<div class="card panel"><div class="panel-title">No server selected</div><div class="panel-sub">Return to server selection and choose a Discord server.</div></div>';return;}
 overview.hidden=true;workspace.hidden=false;
 title.textContent=meta[section]?.[0]||'Feature';
 description.textContent=meta[section]?.[1]||'Configure your server.';
 body.innerHTML='<div class="card panel"><div class="panel-title">Loading</div><div class="panel-sub">Loading live server data…</div></div>';
 const loader=panelLoaders[section];
 if(!loader){body.innerHTML='<div class="card panel"><div class="panel-title">Panel unavailable</div><div class="panel-sub">No panel is registered for this menu item.</div></div>';return;}
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
window.spideyDashboard={select};
