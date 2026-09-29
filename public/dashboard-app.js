import * as analytics from './panels/analytics.js';
import * as settings from './panels/settings.js';
import * as logging from './panels/logging.js';
import * as serverGuard from './panels/server-guard.js';
import * as roles from './panels/roles.js';
import * as categories from './panels/categories.js';
import * as messages from './panels/messages.js';
import * as commands from './panels/commands.js';
import * as levels from './panels/levels.js';
import * as leaderboard from './panels/leaderboard.js';
import * as giveaways from './panels/giveaways.js';
import * as tickets from './panels/tickets.js';
import * as social from './panels/social.js';
import * as invites from './panels/invites.js';
import * as testifySettings from './panels/testify-settings.js';
import * as testifyAutomod from './panels/testify-automod.js';
import * as testifyEconomy from './panels/testify-economy.js';
import * as testifyLevels from './panels/testify-levels.js';
import * as testifyModeration from './panels/testify-moderation.js';
import * as testifySystem from './panels/testify-system.js';

const panels={analytics,settings,logging,moderation:serverGuard,roles,categories,messages,commands,levels,leaderboard,giveaways,tickets,social,invites,testifySettings,testifyAutomod,testifyEconomy,testifyLevels,testifyModeration,testifySystem};
const body=document.querySelector('#workspaceBody');
const workspace=document.querySelector('#featureWorkspace');
const overview=document.querySelector('#overview');
const title=document.querySelector('#workspaceTitle');
const description=document.querySelector('#workspaceDescription');
const gid=new URLSearchParams(location.search).get('guildId')||localStorage.getItem('selectedServerId');

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

function select(section){
 document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
 if(section==='overview'){overview.hidden=false;workspace.hidden=true;return;}
 if(!gid){body.innerHTML='<div class="card panel">No server selected.</div>';return;}
 overview.hidden=true;workspace.hidden=false;
 title.textContent=meta[section]?.[0]||'Feature';
 description.textContent=meta[section]?.[1]||'Configure your server.';
 body.innerHTML='<div class="card panel"><div class="panel-title">Loading</div><div class="panel-sub">Loading live server data…</div></div>';
 const mod=panels[section];
 if(!mod?.render){body.innerHTML='<div class="card panel">Panel unavailable.</div>';return;}
 Promise.resolve(mod.render({body,gid})).catch(e=>{body.innerHTML='<div class="card panel"><div class="panel-title">Panel error</div><div class="panel-sub">'+String(e?.message||e).replace(/[&<>]/g,'')+'</div></div>';});
}
document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.section)));
document.querySelector('#workspaceRefresh')?.addEventListener('click',()=>{const active=document.querySelector('[data-section].active');if(active)select(active.dataset.section);});
