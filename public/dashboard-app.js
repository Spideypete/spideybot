
// Right-side toast notifications, replacing blocking browser alert popups.
(function installSpideyToasts(){
 if (window.__spideyToastInstalled) return;
 window.__spideyToastInstalled = true;
 const originalAlert = window.alert.bind(window);
 window.alert = function(message){
   let host = document.getElementById('spideyToastHost');
   if(!host){
     host=document.createElement('div');host.id='spideyToastHost';host.className='spidey-toast-host';
     host.setAttribute('aria-live','polite');host.setAttribute('aria-atomic','false');
     document.body.appendChild(host);
   }
   const text=String(message ?? '');
   const toast=document.createElement('div');toast.className='spidey-toast';
   const isError=/could not|failed|error|no access|not authenticated|invalid/i.test(text);
   toast.classList.add(isError?'is-error':'is-success');
   const mark=document.createElement('span');mark.className='spidey-toast-mark';mark.textContent=isError?'!':'✓';
   const copy=document.createElement('div');copy.className='spidey-toast-copy';copy.textContent=text;
   const close=document.createElement('button');close.type='button';close.className='spidey-toast-close';close.setAttribute('aria-label','Dismiss notification');close.textContent='×';
   close.onclick=()=>toast.remove();toast.append(mark,copy,close);host.appendChild(toast);
   requestAnimationFrame(()=>toast.classList.add('is-visible'));
   window.setTimeout(()=>{toast.classList.remove('is-visible');window.setTimeout(()=>toast.remove(),220);},5200);
 };
})();
const body=document.querySelector('#workspaceBody');
const workspace=document.querySelector('#featureWorkspace');
const overview=document.querySelector('#overview');
const title=document.querySelector('#workspaceTitle');
const description=document.querySelector('#workspaceDescription');
const navigation=document.querySelector('#navigation');

const FEATURES=[
  ['Essentials',[
    ['welcome','Welcome & Goodbye','Member greetings, welcome channels, messages and automatic roles.','chats-circle'],
    ['premium','Premium','Compare Free, Premium and Pro plans.','crown'],
    ['reactionRoles','Reaction Roles','Create self-assignable role mappings for your community.','hand-waving'],
    ['moderator','Moderation','Warnings, kicks, bans, channel controls and moderation history.','shield-check'],
    ['automod','AutoMod','Filter invites, links, spam, mentions, caps and blocked words.','shield-warning'],
    ['audit','Audit Log','Configure the channel used for important server activity.','list-checks'],
    ['levels','Levels','XP progression, level rewards and level-up announcements.','chart-line-up'],
    ['achievements','Achievements','Configure achievement milestones and reward behaviour.','trophy']
  ]],
  ['Server Management',[
    ['customCommands','Custom Commands','Create, enable and disable custom commands.','terminal-window'],
    ['inviteTracker','Invite Tracker','Track referral activity and invite logging.','users-three'],
    ['ticketing','Ticketing','Configure support tickets, categories, staff roles and transcripts.','ticket'],
    ['emojis','Emojis','Configure server emoji management and utility controls.','smiley'],
    ['polls','Polls','Configure community poll behaviour and defaults.','chart-bar'],
    ['embeds','Embed Messages','Configure reusable rich message defaults.','article']
  ]],
  ['Utilities',[
    ['reminders','Reminders','Configure scheduled reminders, recurring events and timezone defaults.','bell'],
    ['birthdays','Birthdays','Configure birthday announcements, roles, timezones and custom messages.','cake']
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
    ['giveaways','Giveaways','Configure giveaway events, entry rules and winner selection.','gift'],
    ['economy','Economy','Configure currency, daily rewards, balances and transfers.','coins'],
    ['music','Music','Configure voice playback, DJ role and playback limits.','music-notes'],
    ['casino','Casino','Configure slots, betting limits and casino controls.','dice-five'],
    ['lottery','Lottery','Configure lottery entries, draw schedule and prizes.','ticket'],
    ['games','Games','Manage community games and activities.','gamepad-2']
  ]],
  ['Advanced',[
    ['ai','AI Assistant','Configure Gemini, your server’s assistant name and AI behaviour.','sparkle']
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
const endpoint=id=>'/api/features/spidey-suite/'+encodeURIComponent(id);
const load=async id=>(await api(endpoint(id))).config||{};
const save=async(id,patch)=>api(endpoint(id),{method:'PUT',body:JSON.stringify(patch)});
const all=()=>FEATURES.flatMap(g=>g[1]);
const feature=key=>all().find(x=>x[0]===key);
const enabled=(c,f)=>c.plugins?.[f[0]]!==false;
const effectiveTier=c=>{const raw=String(c?.tier||'free').toLowerCase();return raw!=='free'&&c?.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':(['free','premium','pro'].includes(raw)?raw:'free');};
const PANEL_TIER_BADGES={levels:{label:'Free: 10 · Premium: 20 · Pro: 100',kind:'limits',note:'Level role rewards per server: Free allows 10, Premium allows 20, and Pro allows 100. Premium and Pro limits are enforced when saving rewards.'},music:{label:'Premium / Pro',kind:'locked',note:'Music controls require Premium or Pro.'},polls:{label:'Premium / Pro',kind:'locked',note:'Polls require Premium or Pro.'},emojis:{label:'Premium / Pro',kind:'locked',note:'Server emoji management requires Premium or Pro.'},reactionRoles:{label:'Premium: 8 · Pro: Unlimited',kind:'partial',note:'Premium unlocks 8 role mappings and 10 reactions per message; Pro unlocks unlimited mappings and reactions.'},achievements:{label:'Premium: 15 · Pro: Unlimited',kind:'partial',note:'Premium unlocks 15 milestones and custom announcements; Pro unlocks unlimited milestones.'},customCommands:{label:'Free: 5 · Premium: 25 · Pro: 100',kind:'limits',note:'Free: 5 commands · Premium: 25 · Pro: 100.'},inviteTracker:{label:'Free: 10 · Premium: 20 · Pro: 100',kind:'limits',note:'Invite milestone rewards: Free 10 · Premium 20 · Pro 100.'},embeds:{label:'Premium: Embed styling',kind:'partial',note:'Premium and Pro unlock embed colour, image URL and footer customisation.'},reminders:{label:'Premium: Behaviour settings',kind:'partial',note:'Reminder behaviour customisation requires Premium or Pro.'},birthdays:{label:'Premium: Custom events',kind:'partial',note:'Custom birthday events require Premium or Pro.'},economy:{label:'Premium: Custom currency',kind:'partial',note:'Custom currency name and symbol require Premium or Pro.'},giveaways:{label:'Free: 10 · Premium: 20 · Pro: 100',kind:'limits',note:'Active giveaway messages: Free 10 · Premium 20 · Pro 100.'},twitch:{label:'Free: 5 · Premium: 10 · Pro: 20',kind:'limits',note:'Social alert accounts per section: Free 5 · Premium 10 · Pro 20.'},youtube:{label:'Free: 5 · Premium: 10 · Pro: 20',kind:'limits',note:'Social alert accounts per section: Free 5 · Premium 10 · Pro 20.'},reddit:{label:'Free: 5 · Premium: 10 · Pro: 20',kind:'limits',note:'Social alert accounts per section: Free 5 · Premium 10 · Pro 20.'},instagram:{label:'Free: 5 · Premium: 10 · Pro: 20',kind:'limits',note:'Social alert accounts per section: Free 5 · Premium 10 · Pro 20.'},rss:{label:'Free: 5 · Premium: 10 · Pro: 20',kind:'limits',note:'Social alert accounts per section: Free 5 · Premium 10 · Pro 20.'},kick:{label:'Free: 5 · Premium: 10 · Pro: 20',kind:'limits',note:'Social alert accounts per section: Free 5 · Premium 10 · Pro 20.'},podcast:{label:'Free: 5 · Premium: 10 · Pro: 20',kind:'limits',note:'Social alert accounts per section: Free 5 · Premium 10 · Pro 20.'},tiktok:{label:'Free: 5 · Premium: 10 · Pro: 20',kind:'limits',note:'Social alert accounts per section: Free 5 · Premium 10 · Pro 20.'},xalerts:{label:'Free: 5 · Premium: 10 · Pro: 20',kind:'limits',note:'Social alert accounts per section: Free 5 · Premium 10 · Pro 20.'},ai:{label:'Free 50 · Premium 200 · Pro 1,000',kind:'limits',note:'Daily AI requests per server: Free 50 · Premium 200 · Pro 1,000.'}};
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Translate the dashboard's legacy/Lucide-style icon identifiers to verified Phosphor web-font names.
const PHOSPHOR_ICON_ALIASES={
 'house':'house','chats-circle':'chat-circle','hand-waving':'hand-waving',
 'shield-check':'shield-check','shield-warning':'shield-warning','list-checks':'list-checks',
 'chart-line-up':'chart-line-up','trophy':'trophy','terminal-window':'terminal-window',
 'users-three':'users-three','ticket':'ticket','smiley':'smiley','chart-bar':'chart-bar',
 'article':'article','bell':'bell','cake':'cake','twitch-logo':'broadcast',
 'youtube-logo':'youtube-logo','reddit-logo':'alien','instagram-logo':'camera',
 'rss':'rss','broadcast':'broadcast','microphone-stage':'microphone-stage',
 'tiktok-logo':'music-notes','x-logo':'x','gift':'gift','coins':'coins',
 'music-notes':'music-notes','dice-five':'dice-five','gamepad-2':'game-controller',
 'sparkle':'sparkle','command':'terminal','gear':'gear','kick':'broadcast',
 'automodspam':'shield-warning'
};
// Icons are intentionally disabled until a reliable, self-hosted icon set is added.
const icon=()=>'';
async function guildDropdownOptions(id){const [channelResult,roleResult]=await Promise.all([api('/api/guild/'+encodeURIComponent(id)+'/channels').catch(()=>({channels:[]})),api('/api/guild/'+encodeURIComponent(id)+'/roles').catch(()=>({roles:[]}))]);return {channels:(channelResult.channels||[]).filter(ch=>ch.type==='text'||ch.type==='announcement'||ch.type==='news'),roles:(roleResult.roles||[]).filter(role=>!role.managed)};}
function guildSelect(id,label,items,selected,placeholder){return '<label class="field">'+esc(label)+'<select id="'+id+'">'+optionList(items,selected,placeholder||'Choose…')+'</select></label>';}
function guildMultiSelect(id,label,items,selectedValues,placeholder){const selected=new Set((selectedValues||[]).map(String));const names=(items||[]).filter(item=>selected.has(String(item.id))).map(item=>item.name);return '<div class="field"><span>'+esc(label)+'</span><details class="channel-dropdown" id="'+id+'Dropdown"><summary id="'+id+'Summary">'+(names.length?esc(names.length+' channel'+(names.length===1?'':'s')+' selected'):'Choose ignored channels')+' <span aria-hidden="true">▾</span></summary><div class="channel-dropdown-menu">'+((items||[]).length?(items||[]).map(item=>'<label class="channel-dropdown-option"><input type="checkbox" data-channel-option="'+esc(id)+'" value="'+esc(item.id)+'" '+(selected.has(String(item.id))?'checked':'')+'><span>#'+esc(item.name)+'</span></label>').join(''):'<p class="mention-help">No text channels available.</p>')+'</div></details><span class="mention-help">'+esc(placeholder||'Choose one or more channels to ignore.')+'</span></div>';}
const input=(id,label,value,type='text')=>'<label class="field">'+esc(label)+'<input id="'+id+'" type="'+type+'" value="'+esc(value??'')+'"></label>';
const check=(id,label,value)=>'<label class="check"><span>'+esc(label)+'</span><input id="'+id+'" type="checkbox" '+(value?'checked':'')+'></label>';
const button=(id,label)=>'<button class="select" id="'+id+'" type="button">'+esc(label)+'</button>';
const card=(h,s,c)=>'<div class="card panel"><div class="panel-head"><div><div class="panel-title">'+esc(h)+'</div><div class="panel-sub">'+esc(s||'')+'</div></div></div>'+c+'</div>';
const val=id=>document.getElementById(id)?.value??'';
const yes=id=>!!document.getElementById(id)?.checked;

function addStyles(){
 if(!document.getElementById('welcome-panel-styles')){const ws=document.createElement('style');ws.id='welcome-panel-styles';ws.textContent=".plan-locked-inline{display:inline-block;margin-left:6px;color:#a78bfa;font-size:11px;font-weight:700}.pricing-card.pricing-premium{border-color:rgba(145,70,255,.7);background:linear-gradient(145deg,rgba(109,61,245,.19),rgba(21,149,163,.16))}.pricing-card.pricing-pro{border-color:rgba(218,165,32,.65);background:linear-gradient(145deg,rgba(218,165,32,.22),rgba(255,204,82,.07))}.pricing-card.pricing-current{box-shadow:0 0 0 2px currentColor,0 0 22px rgba(109,61,245,.18)}..plan-lock-card{max-width:720px;margin:18px auto;padding:26px;border:1px solid rgba(145,70,255,.45);border-radius:18px;text-align:center;background:linear-gradient(135deg,rgba(109,61,245,.16),rgba(21,149,163,.14))}.plan-lock-card h3{font-size:20px;margin:8px 0}.plan-lock-card p{max-width:520px;margin:0 auto 18px;color:var(--muted);line-height:1.6}.plan-lock-icon{font-size:30px}.plan-lock-card.gold{border-color:rgba(218,165,32,.5);background:linear-gradient(135deg,rgba(218,165,32,.20),rgba(255,204,82,.08))}.plan-lock-card.purple{background:linear-gradient(135deg,rgba(109,61,245,.2),rgba(21,149,163,.16))}.audit-timeline{display:grid;gap:10px}.audit-timeline{display:grid;gap:10px}.audit-entry{border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--surface)}.audit-entry-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.audit-entry-head span,.audit-entry small{font-size:11px;color:var(--muted)}.audit-entry p{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}.audit-entry small{display:block;overflow-wrap:anywhere}.welcome-panel{display:grid;gap:14px}.welcome-section-disabled{opacity:.48}.welcome-section-disabled .welcome-section-heading{opacity:1}.rr-entry{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--border);border-radius:10px;margin-top:8px}.rr-entry p{font-size:11px;color:var(--muted);margin-top:4px}.rr-remove{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:8px;padding:7px 10px;cursor:pointer}.rr-mapping{margin-top:16px;border-top:1px solid var(--border);padding-top:14px}.rr-mapping h4{font-size:12px;margin-bottom:8px}.rr-mapping-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mod-punishment-row{display:grid;grid-template-columns:100px minmax(100px,1fr) minmax(120px,1fr);gap:8px;align-items:center;padding:8px;margin-top:8px;border:1px solid var(--border);border-radius:10px}.mod-punishment-row input,.mod-punishment-row select{width:100%;min-width:0;min-height:38px;border:1px solid var(--border);border-radius:9px;padding:8px;background:var(--surface);color:var(--text);font:inherit;font-size:11px}@media(max-width:620px){.mod-punishment-row{grid-template-columns:1fr}}.rr-options{display:grid;gap:8px;margin-top:12px}.welcome-message-section{border:1px solid var(--border);border-radius:14px;padding:16px;background:var(--surface2)}.welcome-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}.welcome-section-heading h3{font-size:13px;font-weight:850}.welcome-section-heading p,.command-help p{font-size:11px;color:var(--muted);margin-top:4px}.welcome-section-heading .check{border:0;padding:0;gap:10px}.welcome-message-section .field{margin:10px 0}.welcome-message-section .field input,.welcome-message-section .field textarea,.welcome-message-section .field select,.mention-tools select{display:block;width:100%;margin-top:5px;min-height:40px;border:1px solid var(--border);border-radius:10px;padding:9px 10px;background:var(--surface);color:var(--text);font:inherit;font-size:12px}.welcome-message-section .field textarea{resize:vertical;line-height:1.5}.welcome-message-section [hidden]{display:none!important}.word-counter{display:block;text-align:right;color:var(--muted);font-size:10px;margin-top:4px}.word-counter.over-limit{color:#d97706}.mention-tools{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;margin:0 0 12px}.mention-tools>span,.mention-help{grid-column:1/-1;font-size:10px;color:var(--muted)}.mention-tools button{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:9px;padding:0 11px;min-height:38px;font-size:11px;font-weight:750;cursor:pointer}.mention-tools select{margin:0}.mention-help{line-height:1.5}.embed-two-col{display:grid;grid-template-columns:140px minmax(0,1fr);gap:12px}.command-help{border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--surface)}.welcome-panel .panel-actions{margin-top:4px}@media(max-width:620px){.mention-tools{grid-template-columns:1fr}.mention-tools button{min-height:38px}.embed-two-col{grid-template-columns:1fr}.welcome-section-heading{flex-direction:column}}";document.head.appendChild(ws);}


 if(!document.getElementById('level-reward-button-styles')){const lr=document.createElement('style');lr.id='level-reward-button-styles';lr.textContent=".level-reward-row{display:grid;grid-template-columns:minmax(90px,.65fr) minmax(150px,1.35fr) auto;align-items:end;gap:10px}.level-reward-row .field{min-width:0;margin:8px 0}.level-reward-action{display:inline-flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap;min-height:30px;padding:5px 9px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);font-size:11px;font-weight:750;line-height:1.1;cursor:pointer}.level-reward-add{min-height:30px;padding:5px 10px}.level-reward-remove{align-self:end;margin:8px 0}.level-reward-action:disabled{opacity:.45;cursor:not-allowed}@media(max-width:520px){.level-reward-row{grid-template-columns:minmax(0,1fr) minmax(0,1.4fr) auto;gap:7px}.level-reward-remove{font-size:10px;padding:5px 7px}}";document.head.appendChild(lr);}

 if(document.getElementById('integrated-dashboard-styles'))return;
 const s=document.createElement('style');s.id='integrated-dashboard-styles';
 s.textContent='.field{display:block;font-size:11px;font-weight:750;color:var(--muted);margin:10px 0}.field input{display:block;width:100%;margin-top:5px;min-height:40px;border:1px solid var(--border);border-radius:10px;padding:9px 10px;background:var(--surface);color:var(--text)}.check{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--border);font-size:12px;font-weight:700}.check input{width:18px;height:18px}.panel-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.command-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.command-item{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:56px;padding:12px 14px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2);line-height:1.4}.command-access-note{margin:0 0 12px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--muted);font-size:11px;line-height:1.5}.command-item>span{flex:1;min-width:0;overflow-wrap:anywhere;font-size:12px;font-weight:700;color:var(--text)}.command-item .command-switch{appearance:none;-webkit-appearance:none;box-sizing:border-box;position:relative;flex:0 0 38px;width:38px;min-width:38px;height:20px;min-height:20px;padding:0;margin:0;border:0;border-radius:999px;background:var(--border-strong,#8b8b9a);cursor:pointer;transition:background .16s ease}.command-item .command-switch:before{content:\"\";box-sizing:border-box;position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px #0003;transition:transform .16s ease}.command-item .command-switch:checked{background:var(--petrol,#087f8c)}.command-item .command-switch:checked:before{transform:translateX(18px)}.command-item .command-switch:disabled{opacity:.55;cursor:not-allowed}.command-item:has(.command-switch:disabled){opacity:.82}.member-count-insert-actions{display:flex;flex-wrap:wrap;gap:8px}.member-count-insert{border:1px solid var(--border);border-radius:10px;background:var(--surface-2);color:var(--text);padding:9px 12px;font:inherit;font-size:12px;font-weight:750;transition:background .15s,border-color .15s,transform .15s}.member-count-insert:hover{background:var(--accent-soft);border-color:var(--petrol);transform:translateY(-1px)}.feature-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;padding:12px 14px;border:1px solid var(--border);border-radius:13px;background:var(--surface-2)}.feature-toggle>span{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.7px}.feature-toggle button{position:relative;width:48px;height:26px;border:0;border-radius:999px;background:#9ca3b8;padding:0;transition:background .12s ease,box-shadow .12s ease;cursor:pointer}.feature-toggle button:before{content:\"\";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .12s ease}.feature-toggle button.on{background:var(--petrol);box-shadow:0 0 0 3px color-mix(in srgb,var(--petrol) 16%,transparent)}.feature-toggle button.on:before{transform:translateX(22px)}.feature-toggle button:disabled{opacity:.7;cursor:wait}.overview-feature-group{margin-top:18px}.overview-feature-group h2{font-size:16px;font-weight:800;margin-bottom:10px}.overview-feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.overview-feature-card{padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--surface);transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}.overview-feature-card:hover{transform:translateY(-1px);box-shadow:var(--shadow)}.overview-feature-top{display:flex;align-items:flex-start;gap:11px}.overview-feature-icon{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;background:var(--accent-soft);color:var(--purple)}.dark .overview-feature-icon{background:var(--accent-soft);color:var(--purple)}.overview-feature-copy{min-width:0;flex:1}.overview-feature-copy strong{display:block;font-size:12px}.overview-feature-copy span{display:block;font-size:10px;color:var(--muted);margin-top:3px;line-height:1.45}.overview-feature-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:14px}.overview-feature-status{font-size:10px;font-weight:800;color:var(--muted)}.overview-feature-card.is-on .overview-feature-status{color:var(--petrol)}.overview-feature-card.is-off{opacity:.82}.overview-toggle{position:relative;width:42px;height:23px;border:0;border-radius:999px;background:#9ca3b8;cursor:pointer;transition:background .12s ease}.overview-toggle:before{content:\"\";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;transition:transform .12s ease}.overview-toggle.on{background:var(--petrol)}.overview-toggle.on:before{transform:translateX(19px)}.overview-toggle:disabled{opacity:.7;cursor:wait}.nav button.feature-disabled{opacity:.48}.nav button.feature-disabled:after{content:\"OFF\";margin-left:auto;font-size:8px;font-weight:800;letter-spacing:.5px;padding:3px 6px;border-radius:999px;background:var(--surface-2);color:var(--muted)}@media(max-width:900px){.overview-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.command-grid{grid-template-columns:1fr}.overview-feature-grid{grid-template-columns:1fr}}';
 document.head.appendChild(s);
}
(function installEssentialsPurpleGlow(){if(document.getElementById('essentials-purple-glow'))return;const style=document.createElement('style');style.id='essentials-purple-glow';style.textContent=".nav-title{color:#5b21b6!important;text-shadow:0 0 8px rgba(139,92,246,.10);letter-spacing:.035em}.overview-feature-group .overview-feature-card{border-color:rgba(139,92,246,.48);box-shadow:0 0 0 1px rgba(139,92,246,.12),0 0 15px rgba(139,92,246,.14);transition:border-color .18s ease,box-shadow .18s ease,transform .12s ease}.overview-feature-group .overview-feature-card.is-on{border-color:rgba(168,85,247,.88);box-shadow:0 0 0 1px rgba(168,85,247,.25),0 0 21px rgba(139,92,246,.26),inset 0 0 16px rgba(139,92,246,.045)}.overview-feature-group .overview-feature-card.is-off{border-color:rgba(139,92,246,.38);box-shadow:0 0 0 1px rgba(139,92,246,.10),0 0 11px rgba(139,92,246,.10)}.overview-feature-group .overview-feature-card .overview-toggle.on{background:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.22),0 0 12px rgba(139,92,246,.48)}.overview-feature-group .overview-feature-card .overview-feature-status{color:#a78bfa}";document.head.appendChild(style);})();
function installSidebarHeadingGlow(){if(document.getElementById('sidebar-heading-purple-glow'))return;const style=document.createElement('style');style.id='sidebar-heading-purple-glow';style.textContent=".sidebar .nav-group-toggle{width:100%;min-height:35px;height:auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 11px 7px;margin-top:3px;border:0;border-radius:7px;background:transparent;color:#4b2568!important;text-shadow:0 0 2px rgba(75,37,104,.10),0 0 5px rgba(75,37,104,.10);font-size:10px;letter-spacing:.65px;font-weight:850;font-style:italic;text-transform:none;text-align:left;cursor:pointer}.sidebar .nav-group-toggle:hover{background:rgba(118,81,168,.08)}.sidebar .nav-group-label{font-weight:850;font-style:italic}.sidebar .nav-group-chevron{font-size:13px;font-style:normal;line-height:1;opacity:.8;text-shadow:none}.sidebar .nav[hidden]{display:none!important}.dark .sidebar .nav-group-toggle{color:#b49acb!important;text-shadow:0 0 3px rgba(139,92,246,.10),0 0 6px rgba(139,92,246,.10)}.dark .sidebar .nav-group-toggle:hover{background:rgba(139,92,246,.12)}.sidebar .nav-group-items{max-height:1200px;opacity:1;overflow:hidden;transform:translateY(0);transition:max-height .28s cubic-bezier(.2,.7,.2,1),opacity .22s ease,transform .28s cubic-bezier(.2,.7,.2,1);will-change:max-height,opacity,transform}.sidebar .nav-group-items.is-collapsed{max-height:0;opacity:0;transform:translateY(-7px);pointer-events:none}";document.head.appendChild(style);}
function switcher(){ return ''; }
async function toggleFeature(id,f,current){
 const next=!enabled(current,f);
 const result=await save(id,{plugins:{[f[0]]:next}});
 return {config:result.config||result,next};
}
function refreshToggleUI(f,next){
 const el=document.querySelector('[data-feature-toggle]');
 if(el){
   el.classList.toggle('on',next);
   el.disabled=false;
   const label=el.closest('.feature-toggle')?.querySelector('span');
   if(label)label.textContent=next?'Enabled':'Disabled';
 }
 document.querySelectorAll('[data-section="'+f[0]+'"]').forEach(b=>b.classList.toggle('feature-disabled',!next));
 return next;
}
async function setFeatureEnabled(id,key,next){
 const previous=await load(id).catch(()=>({plugins:{}}));
 const previousPlugin=previous.plugins?.[key]!==false;
 await save(id,{plugins:{[key]:next}});
 try{
  if(key==='welcome'){
   const result=await api('/api/config/server-messages?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({welcomeEnabled:next,enableWelcome:next,goodbyeEnabled:next,enableGoodbye:next})});
   if(result.success!==true)throw new Error(result.error||'Server did not confirm Welcome/Goodbye state');
  }else if(key==='reactionRoles'){
   const result=await api('/api/bot-config/react-roles/settings?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({enabled:next})});
   if(result.success!==true||result.config?.enabled!==next)throw new Error(result.error||'Server did not confirm Reaction Roles state');
  }
 }catch(err){
  await save(id,{plugins:{[key]:previousPlugin}}).catch(()=>{});
  throw err;
 }
 return next;
}
function attachToggle(id,f,c){
 const el=document.querySelector('[data-feature-toggle]');
 if(!el)return;
 el.addEventListener('click',async e=>{
   const current=await load(id).catch(()=>c);
   const next=!enabled(current,f);
   e.currentTarget.disabled=true;
   try{
     await setFeatureEnabled(id,f[0],next);
     c.plugins={...(c.plugins||{}),[f[0]]:next};
     if(f[0]==='welcome'||f[0]==='reactionRoles'){
      await select(f[0]);
      return;
     }
     refreshToggleUI(f,next);
   }catch(err){
     e.currentTarget.disabled=false;
     alert('Could not '+(next?'enable ':'disable ')+f[1]+': '+(err.message||String(err)));
   }
 });
}
function baseFeaturePanel(id,f,c,fields){
 body.innerHTML=card(f[1],f[2],fields+'<div class="panel-actions">'+button('saveFeature','Save '+f[1])+'</div>');
 document.getElementById('saveFeature').onclick=async()=>{
   const fresh=await load(id);
   const patch={channels:{...(fresh.channels||{}),[f[0]]:val('channel')||null},roles:{...(fresh.roles||{}),[f[0]]:val('role')||null},messages:{...(fresh.messages||{}),[f[0]]:val('message')||''}};
   await save(id,patch);alert(f[1]+' saved.');
 };
 attachToggle(id,f,c);
}
function optionList(items,selected,placeholder){
 const first='<option value="">'+esc(placeholder||'Choose…')+'</option>';
 return first+(items||[]).map(item=>'<option value="'+esc(item.id)+'" '+(String(item.id)===String(selected||'')?'selected':'')+'>'+esc(item.name)+' ('+esc(item.id)+')</option>').join('');
}
function wordCount(value){return String(value||'').trim().split(/\s+/).filter(Boolean).length;}
function mentionTools(prefix,channels,roles){
 return '<div class="mention-tools"><span>Insert a mention</span><button type="button" data-insert-user="'+prefix+'">Insert member tag</button><select id="'+prefix+'ChannelMention">'+optionList(channels,'','Choose channel')+'</select><button type="button" data-insert-channel="'+prefix+'">Insert channel</button><select id="'+prefix+'RoleMention">'+optionList(roles,'','Choose role')+'</select><button type="button" data-insert-role="'+prefix+'">Insert role</button><button type="button" data-resolve-ids="'+prefix+'">Resolve pasted channel/role IDs</button><div class="mention-help">Use {user} to tag the joining member, {username}, {server} and {membercount}. Channel and role inserts use Discord mentions.</div></div>';
}
function textEditor(prefix,label,value,channels,roles){
 return '<label class="field">'+esc(label)+'<textarea id="'+prefix+'Text" rows="6" maxlength="10000" data-word-limit="500">'+esc(value||'')+'</textarea><span class="word-counter" id="'+prefix+'TextCount">0 / 500 words</span></label>'+mentionTools(prefix+'Text',channels,roles);
}
function embedEditor(prefix,embed,channels,roles){
 const e=embed||{};
 return '<div class="embed-fields" id="'+prefix+'EmbedFields">'+
 '<label class="field">Embed title<input id="'+prefix+'Title" maxlength="256" value="'+esc(e.title||'')+'"></label>'+
 '<label class="field">Embed description<textarea id="'+prefix+'Description" rows="6" maxlength="10000" data-word-limit="500">'+esc(e.description||'')+'</textarea><span class="word-counter" id="'+prefix+'DescriptionCount">0 / 500 words</span></label>'+
 mentionTools(prefix+'Description',channels,roles)+
 '<div class="embed-two-col"><label class="field">Embed colour<input id="'+prefix+'Color" type="color" value="'+(/^#[0-9a-f]{6}$/i.test(e.color||'')?e.color:'#56306f')+'"></label><label class="field">Footer<input id="'+prefix+'Footer" maxlength="2048" value="'+esc(e.footer||'')+'"></label></div>'+
 '<label class="field">Thumbnail image URL<input id="'+prefix+'Thumbnail" type="url" value="'+esc(e.thumbnail||'')+'" placeholder="https://…"></label>'+
 '<label class="field">Large image URL<input id="'+prefix+'Image" type="url" value="'+esc(e.image||'')+'" placeholder="https://…"></label></div>';
}
function messageSection(prefix,label,enabled,channel,type,message,embed,channels,roles,bannerUrl){
 return '<section class="welcome-message-section" id="'+prefix+'Content"><div class="welcome-section-heading"><div><h3>'+esc(label)+'</h3><p>Sent '+(prefix==='welcome'?'when a member joins':'when a member leaves')+'.</p></div></div>'+
 '<label class="field">'+esc(label)+' channel<select id="'+prefix+'Channel">'+optionList(channels,channel,'Choose a text channel')+'</select></label>'+
 '<label class="field">Message format<select id="'+prefix+'Type"><option value="text" '+((type||'text')==='text'?'selected':'')+'>Normal text</option><option value="embed" '+(type==='embed'?'selected':'')+'>Discord embed</option></select></label>'+
 '<div class="panel-section"><h3>Banner image</h3><p class="muted">Optional image shown with this '+(prefix==='welcome'?'welcome':'goodbye')+' message. Use a direct HTTPS image URL (PNG, JPG, GIF or WEBP).</p><label class="field">Banner image URL<input id="'+prefix+'Banner" type="url" placeholder="https://example.com/banner.png" value="'+esc(bannerUrl||'')+'"></label><p class="mention-help">The banner is sent as an image embed alongside the message, even when Normal text is selected.</p></div>'+
 '<div id="'+prefix+'TextPanel" '+(type==='embed'?'hidden':'')+'>'+textEditor(prefix,label+' message',message,channels,roles)+'</div>'+
 '<div id="'+prefix+'EmbedPanel" '+(type==='embed'?'':'hidden')+'>'+embedEditor(prefix,embed,channels,roles)+'</div></section>';
}
async function renderWelcomePanel(id,f,c){
 const [channelResult,roleResult,settingsResult]=await Promise.all([
  api('/api/guild/'+encodeURIComponent(id)+'/channels'),
  api('/api/guild/'+encodeURIComponent(id)+'/roles'),
  api('/api/config/'+encodeURIComponent(id))
 ]);
 const channels=(channelResult.channels||[]).filter(x=>x.type==='text');
 const roles=roleResult.roles||[];
 const guildConfig=settingsResult||{};
 const sm={...(guildConfig['server-messages']||{}),...(guildConfig.serverMessages||{})};
 try{await api('/api/config/server-messages?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({welcomeEnabled:true,enableWelcome:true,goodbyeEnabled:true,enableGoodbye:true})});}catch(err){console.warn('[dashboard] could not enable welcome/goodbye defaults',err);}
 const welcomeType=sm.welcomeType||(sm.welcomeEmbed?'embed':'text');
 const goodbyeType=sm.goodbyeType||(sm.goodbyeEmbed?'embed':'text');
 const bodyHtml=messageSection('welcome','Welcome message',sm.enableWelcome??sm.welcomeEnabled??false,sm.welcomeChannel||'',welcomeType,sm.welcomeMessage??'Welcome {user} to {server}! 🎉',sm.welcomeEmbed,channels,roles,sm.welcomeBanner||'')+
 messageSection('goodbye','Goodbye message',sm.enableGoodbye??sm.goodbyeEnabled??false,sm.goodbyeChannel||'',goodbyeType,sm.goodbyeMessage??'{user} has left {server}. 👋',sm.goodbyeEmbed,channels,roles,sm.goodbyeBanner||'')+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Automatic welcome role</h3><p>Give every new member this role automatically when a role is selected.</p></div></div><label class="field">Role to assign<select id="autoroleRole">'+optionList(roles,sm.autoroleRole||sm.autoroleRoleId||c.autorole?.roleId||'','Choose a role')+'</select></label><p class="mention-help">SPIDEY BOT needs Manage Roles, and its highest role must be above the selected role.</p></section>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Admin commands</h3><p>Administrative configuration only. These settings do not change who can run the commands.</p></div></div>'+input('prefix','Prefix (admin use)',c.prefix||'!')+'<div class="command-help"><strong>Message placeholders you can insert</strong><p>Use <code>{user}</code> to mention the member, <code>{username}</code> for their username, <code>{server}</code> for the server name and <code>{membercount}</code> for the current server member count.</p><div class="button-row member-count-insert-actions"><button type="button" class="level-reward-action member-count-insert" data-insert-user="welcomeText" data-insert-token="{membercount}"><span aria-hidden="true">＋</span> Insert member count into welcome</button><button type="button" class="level-reward-action member-count-insert" data-insert-user="goodbyeText" data-insert-token="{membercount}"><span aria-hidden="true">＋</span> Insert member count into goodbye</button></div><p>Member count can be used in normal messages and embed titles, descriptions or footers.</p></div></section>'+
 '<div class="panel-actions"><button class="select" id="saveWelcomeSettings" type="button">Save welcome & goodbye settings</button></div>';
 body.innerHTML=card('Welcome & Goodbye','Configure join and leave messages, mentions, embeds and automatic roles.','<div class="welcome-panel">'+bodyHtml+'</div>');
 const setMode=(key)=>{const type=val(key+'Type');document.getElementById(key+'TextPanel').hidden=type==='embed';document.getElementById(key+'EmbedPanel').hidden=type!=='embed';};
 ['welcome','goodbye'].forEach(key=>{
  document.getElementById(key+'Type').addEventListener('change',()=>setMode(key));
 });
 document.querySelectorAll('[data-word-limit]').forEach(el=>{
  const update=()=>{const words=String(el.value||'').trim().split(/\s+/).filter(Boolean);if(words.length>500)el.value=words.slice(0,500).join(' ');const count=wordCount(el.value);const counter=document.getElementById(el.id+'Count');if(counter)counter.textContent=count+' / 500 words';counter?.classList.toggle('over-limit',count>=500);};
  el.addEventListener('input',update);update();
 });
 function insertAtCursor(textareaId,text){
  const el=document.getElementById(textareaId);if(!el)return;
  const start=el.selectionStart??el.value.length,end=el.selectionEnd??start;
  el.value=el.value.slice(0,start)+text+el.value.slice(end);
  el.focus();el.selectionStart=el.selectionEnd=start+text.length;el.dispatchEvent(new Event('input',{bubbles:true}));
 }
 document.querySelectorAll('[data-insert-user]').forEach(btn=>btn.addEventListener('click',()=>insertAtCursor(btn.dataset.insertUser,btn.dataset.insertToken||'{user}')));
 document.querySelectorAll('[data-resolve-ids]').forEach(btn=>btn.addEventListener('click',()=>{
  const id=btn.dataset.resolveIds,el=document.getElementById(id);if(!el)return;
  const channelIds=new Set(channels.map(item=>String(item.id))),roleIds=new Set(roles.map(item=>String(item.id)));
  el.value=String(el.value||'').replace(/\b\d{17,20}\b/g,raw=>channelIds.has(raw)?'<#'+raw+'>':roleIds.has(raw)?'<@&'+raw+'>':raw);
  el.dispatchEvent(new Event('input',{bubbles:true}));
 }));
 document.querySelectorAll('[data-insert-channel]').forEach(btn=>btn.addEventListener('click',()=>{
  const prefix=btn.dataset.insertChannel,selected=val(prefix+'ChannelMention');if(selected)insertAtCursor(prefix,'<#'+selected+'>');
 }));
 document.querySelectorAll('[data-insert-role]').forEach(btn=>btn.addEventListener('click',()=>{
  const prefix=btn.dataset.insertRole,selected=val(prefix+'RoleMention');if(selected)insertAtCursor(prefix,'<@&'+selected+'>');
 }));
 const makeEmbed=key=>{
  const description=val(key+'Description');
  const e={title:val(key+'Title').trim(),description,color:val(key+'Color'),footer:val(key+'Footer').trim(),thumbnail:val(key+'Thumbnail').trim(),image:val(key+'Image').trim()};
  return Object.fromEntries(Object.entries(e).filter(([_,v])=>String(v||'').trim()));
 };
  document.getElementById('saveWelcomeSettings').onclick=async()=>{
  const messages={welcome:val('welcomeType')==='embed'?'':val('welcomeText'),goodbye:val('goodbyeType')==='embed'?'':val('goodbyeText')};
  const embeds={welcome:val('welcomeType')==='embed'?makeEmbed('welcome'):null,goodbye:val('goodbyeType')==='embed'?makeEmbed('goodbye'):null};
  if(wordCount(val('welcomeText'))>500||wordCount(val('goodbyeText'))>500||wordCount(val('welcomeDescription'))>500||wordCount(val('goodbyeDescription'))>500){alert('Each message or embed description must be 500 words or fewer.');return;}
  const settings={
   welcomeEnabled:true,enableWelcome:true,welcomeChannel:val('welcomeChannel')||null,welcomeMessage:messages.welcome,welcomeEmbed:embeds.welcome,welcomeType:val('welcomeType'),welcomeBanner:val('welcomeBanner').trim(),
   goodbyeEnabled:true,enableGoodbye:true,goodbyeChannel:val('goodbyeChannel')||null,goodbyeMessage:messages.goodbye,goodbyeEmbed:embeds.goodbye,goodbyeType:val('goodbyeType'),goodbyeBanner:val('goodbyeBanner').trim(),
   autoroleEnabled:true,autoroleRole:val('autoroleRole')||null
  };
  for(const key of ['welcome','goodbye']){
   if(settings[key+'Channel']&&!String(settings[key+'Channel']).trim()){alert('Choose a valid channel for the '+key+' message.');return;}
   if(!settings[key+'Channel'])continue;
   if(settings[key+'Type']==='text'&&!String(settings[key+'Message']||'').trim()){alert('Enter the '+key+' message.');return;}
   if(settings[key+'Type']==='embed'&&!['title','description','image','thumbnail','footer'].some(field=>String(embeds[key]?.[field]||'').trim())){alert('Add a title, description, footer or image to the '+key+' embed.');return;}
  }
  try{
   await api('/api/config/server-messages?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify(settings)});
   await save(id,{prefix:val('prefix')||'!',autorole:{enabled:settings.autoroleEnabled,roleId:settings.autoroleRole}});
   alert('Welcome, goodbye and automatic role settings saved.');
  }catch(err){alert('Could not save settings: '+(err.message||String(err)));}
 };
 attachToggle(id,f,c);
}

async function renderReactionRolesPanel(id,f,c){
 const [channelResult,roleResult,settingsResult,emojiResult]=await Promise.all([
  api('/api/guild/'+encodeURIComponent(id)+'/channels'),
  api('/api/guild/'+encodeURIComponent(id)+'/roles'),
  api('/api/bot-config/react-roles/settings?guildId='+encodeURIComponent(id)),
  api('/api/guild/'+encodeURIComponent(id)+'/emojis').catch(()=>({emojis:[]}))
 ]);
 const channels=(channelResult.channels||[]).filter(x=>x.type==='text');
 const roles=(roleResult.roles||[]).filter(x=>!x.managed);
 const serverEmojis=emojiResult.emojis||[];
 const unicodeEmojis=['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😍','🥰','😘','😎','🤔','😭','😡','👍','👎','👏','🙌','🙏','❤️','💙','💜','🔥','✨','⭐','🎉','🎮','🎯','🏆','✅','❌','⚠️','💯','👀','💀','🐱','🐶','🍀','🌟'];
 const rr=settingsResult.config||{};
 const rrTierRaw=String(c.tier||'free').toLowerCase();
 const rrTier=rrTierRaw!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':rrTierRaw;
 const rrPaid=rrTier==='premium'||rrTier==='pro';
 const rrRoleLimit=rrTier==='pro'?'Unlimited':rrTier==='premium'?'8':'3';
 const rrReactionLimit=rrTier==='pro'?'Unlimited':rrTier==='premium'?'10':'5';
  const emojiValue=e=>(e.animated?'<a:':'<:')+e.name+':'+e.id+'>';
  const emojiVisual=value=>{const raw=String(value||'');const match=serverEmojis.find(e=>raw===emojiValue(e)||raw===e.id||raw===e.name+':'+e.id||raw===e.name);return match?'<img src="'+esc(match.url)+'" alt=":'+esc(match.name)+':" title=":'+esc(match.name)+':" style="width:26px;height:26px;object-fit:contain;vertical-align:middle">':esc(raw||'😀');};
  const savedEmoji=String((rr.entries||[]).slice(-1)[0]?.emoji||'');
  const selectedEmoji=serverEmojis.find(e=>savedEmoji===emojiValue(e)||savedEmoji===e.id||savedEmoji===e.name+':'+e.id||savedEmoji===e.name);
  const initialEmojiValue=selectedEmoji?emojiValue(selectedEmoji):(unicodeEmojis.includes(savedEmoji)?savedEmoji:'');
  const initialEmojiLabel=selectedEmoji?'<img src="'+esc(selectedEmoji.url)+'" alt=":'+esc(selectedEmoji.name)+':" style="width:28px;height:28px;object-fit:contain"> <span>:'+esc(selectedEmoji.name)+':</span>':(initialEmojiValue?'<span style="font-size:25px">'+esc(initialEmojiValue)+'</span> <span>'+esc(initialEmojiValue)+'</span>':'<span>Choose an emoji</span>');
  const emojiMenuItems=unicodeEmojis.map(e=>'<button type="button" data-rr-emoji-value="'+esc(e)+'" style="display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:0;border-radius:7px;background:transparent;color:inherit;text-align:left;cursor:pointer"><span style="font-size:25px;line-height:1.2">'+esc(e)+'</span><span>'+esc(e)+'</span></button>').join('')+serverEmojis.map(e=>{const value=emojiValue(e);return '<button type="button" data-rr-emoji-value="'+esc(value)+'" style="display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:0;border-radius:7px;background:transparent;color:inherit;text-align:left;cursor:pointer"><img src="'+esc(e.url)+'" alt=":'+esc(e.name)+':" style="width:28px;height:28px;object-fit:contain"><span>:'+esc(e.name)+':</span></button>';}).join('');
 try{await api('/api/bot-config/react-roles/settings?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({enabled:true})});}catch(err){console.warn('[dashboard] could not enable reaction roles defaults',err);}
 const entries=Array.isArray(rr.entries)?rr.entries:[];
  const entryRows=entries.map((e,i)=>'<div class="rr-entry"><div><strong>'+emojiVisual(e.emoji)+' → '+esc(e.roleName||roles.find(r=>r.id===e.roleId)?.name||'Role')+'</strong><p>#'+esc(e.channelName||channels.find(ch=>ch.id===e.channelId)?.name||'channel')+' · Message '+esc(e.messageId||'')+'</p></div><button type="button" class="rr-remove" data-remove-rr="'+i+'">Remove</button></div>').join('');
 const channelOptions=optionList(channels,'','Choose a text channel');
 const roleOptions=optionList(roles,'','Choose a role');
 body.innerHTML=card('Reaction Roles','Create custom text/embed messages and map emoji reactions to server roles. Settings apply only to the selected server.',
 '<div class="welcome-panel reaction-roles-panel">'+
 '<p class="mention-help" role="note" style="padding:12px 14px;border:1px solid rgba(145,70,255,.45);border-radius:10px;background:rgba(145,70,255,.08);color:var(--text-primary,#fff)"><strong>Plan limits for this server:</strong> '+rrRoleLimit+' reaction-role mappings and '+rrReactionLimit+' reactions per message. <strong>Current tier: '+esc(rrTier.toUpperCase())+'.</strong></p>'+
 '<p class="mention-help" role="note" style="padding:12px 14px;border:1px solid rgba(145,70,255,.45);border-radius:10px;background:rgba(145,70,255,.08);color:var(--text-primary,#fff)"><strong>⚠️ Discord role hierarchy:</strong> Move the <strong>SPIDEY BOT</strong> role above every role you want it to assign or remove in <strong>Server Settings → Roles</strong>. The bot also needs the <strong>Manage Roles</strong> permission. Discord will block reaction roles below the bot’s highest role.</p>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Create reaction role</h3><p>Post a new message or attach a reaction role to a message that already exists.</p></div></div>'+
 '<label class="field">Message action<select id="rrMessageAction"><option value="create">Create a new message</option><option value="existing">Use an existing message</option></select></label>'+
 '<div id="rrCreateMessage">'+
 '<label class="field">Post in channel<select id="rrChannel">'+channelOptions+'</select></label>'+
 '<label class="field">Message format<select id="rrType"><option value="text">Normal text</option><option value="embed">Discord embed</option></select></label>'+
 '<div id="rrTextPanel">'+input('rrMessageText','Message text','React below to choose your roles.')+
 '<div class="mention-tools"><span>Insert a mention into the message</span><input id="rrMentionUser" type="text" placeholder="User ID to mention" aria-label="User ID to mention"><button type="button" data-rr-insert="user">Insert user mention</button><select id="rrMentionChannel">'+channelOptions+'</select><button type="button" data-rr-insert="channel">Insert channel mention</button><select id="rrMentionRole">'+roleOptions+'</select><button type="button" data-rr-insert="role">Insert role mention</button><button type="button" id="rrResolveIds">Resolve pasted channel/role IDs</button></div></div>'+
 '<div id="rrEmbedPanel" hidden>'+input('rrEmbedTitle','Embed title','Choose your roles')+'<label class="field">Embed description<textarea id="rrEmbedDescription" rows="4" maxlength="4000">React below to choose your roles.</textarea></label>'+input('rrEmbedColor','Embed colour (hex)','5865F2')+input('rrEmbedFooter','Footer','SPIDEY BOT • Reaction Roles')+input('rrEmbedImage','Image URL','')+'</div>'+
 '</div>'+
 '<div id="rrExistingMessage" hidden><label class="field">Message channel<select id="rrExistingChannel">'+channelOptions+'</select></label>'+input('rrMessageId','Existing message ID','')+'<p class="mention-help">Paste the message ID from the selected server and channel. The bot must be able to view the channel and message.</p></div>'+
  '<div class="rr-mapping"><h4>Emoji → role mapping</h4><p class="mention-help">Add several emoji-to-role mappings to the same message. Each reaction can assign a different role.</p><div id="rrMappingRows"><div class="rr-mapping-row"><div class="rr-mapping-grid"><label class="field">Choose emoji<div style="position:relative"><input type="hidden" data-rr-emoji value="'+esc(initialEmojiValue)+'"><button type="button" data-rr-emoji-button aria-expanded="false" style="display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:44px;padding:8px 12px;border:1px solid var(--border-color,rgba(255,255,255,.16));border-radius:9px;background:var(--surface-2,rgba(255,255,255,.04));color:inherit;text-align:left;cursor:pointer"><span data-rr-emoji-label style="display:flex;align-items:center;gap:9px">'+initialEmojiLabel+'</span><span>▾</span></button><div data-rr-emoji-menu hidden style="position:absolute;z-index:50;top:calc(100% + 5px);left:0;right:0;max-height:270px;overflow:auto;padding:6px;border:1px solid var(--border-color,rgba(255,255,255,.18));border-radius:10px;background:var(--surface-1,#17171f);box-shadow:0 12px 32px rgba(0,0,0,.35)">'+(emojiMenuItems||'<p class="mention-help">No emojis available.</p>')+'</div></div></label><label class="field">Role to assign<select data-rr-role>'+roleOptions+'</select></label></div></div></div><div class="panel-actions"><button type="button" class="select" id="rrAddMapping">＋ Add another reaction</button></div><p class="mention-help">Choose from the connected server’s Emojis panel or standard emojis. Custom emojis display as their actual images, not text codes.</p></div>'+
 '<div class="rr-options">'+check('rrAllowMultiple','Allow members to select multiple roles',rr.allowMultiple!==false)+check('rrRemoveOnUnreact','Remove role when reaction is removed',rr.removeOnUnreact!==false)+(rrPaid?check('rrDmConfirm','Send a DM confirmation',!!(rr.dmConfirm||rr.dmConfirmations)):'<label class="field"><input type="checkbox" id="rrDmConfirm" checked disabled> Send a DM confirmation <span class="plan-locked-inline">🔒 Premium or Pro only to switch this off</span></label>')+'</div>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Language and notifications</h3><p>Choose the language and whether the bot should send optional notices to a server channel.</p></div></div><label class="field">Panel language<select id="rrLanguage"><option value="en" '+((rr.language||'en')==='en'?'selected':'')+'>English</option><option value="es" '+(rr.language==='es'?'selected':'')+'>Español</option><option value="fr" '+(rr.language==='fr'?'selected':'')+'>Français</option><option value="de" '+(rr.language==='de'?'selected':'')+'>Deutsch</option><option value="pt" '+(rr.language==='pt'?'selected':'')+'>Português</option><option value="pl" '+(rr.language==='pl'?'selected':'')+'>Polski</option><option value="ru" '+(rr.language==='ru'?'selected':'')+'>Русский</option></select></label>'+check('rrUpdateNotifications','Enable update notifications',!!rr.updateNotifications)+check('rrErrorReporting','Enable error reporting',!!rr.errorReporting)+'<label class="field">Notification/error channel<select id="rrNotificationChannel">'+optionList(channels,rr.notificationChannelId||'','Choose a channel (optional)')+'</select></label><p class="mention-help">These preferences are stored per server. Notification delivery requires the bot to have permission to send messages in the selected channel.</p></section>'+
 '<div class="panel-actions"><button class="select" id="rrCreateSave" type="button">Save reaction role</button><button class="select" id="rrSaveSettings" type="button">Save settings only</button></div></section>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Existing reaction roles</h3><p>Manage role mappings already configured for this server.</p></div></div>'+(entryRows||'<p class="mention-help">No reaction roles have been created yet.</p>')+'</section></div>');
 // Reaction Roles is always enabled; configuration remains editable.
 document.getElementById('rrMessageAction').addEventListener('change',()=>{const existing=val('rrMessageAction')==='existing';document.getElementById('rrCreateMessage').hidden=existing;document.getElementById('rrExistingMessage').hidden=!existing;});
  const rrMappingRows=document.getElementById('rrMappingRows');
  rrMappingRows.addEventListener('click',event=>{
   const button=event.target.closest('[data-rr-emoji-button]');
   if(button){const row=button.closest('.rr-mapping-row'),menu=row.querySelector('[data-rr-emoji-menu]');menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));return;}
   const option=event.target.closest('[data-rr-emoji-value]');
   if(option){const row=option.closest('.rr-mapping-row'),value=option.dataset.rrEmojiValue;row.querySelector('[data-rr-emoji]').value=value;row.querySelector('[data-rr-emoji-label]').innerHTML=option.innerHTML;row.querySelector('[data-rr-emoji-menu]').hidden=true;row.querySelector('[data-rr-emoji-button]').setAttribute('aria-expanded','false');}
  });
  document.getElementById('rrAddMapping').addEventListener('click',()=>{
   const row=rrMappingRows.querySelector('.rr-mapping-row').cloneNode(true);
   row.querySelector('[data-rr-emoji]').value='';
   row.querySelector('[data-rr-emoji-label]').innerHTML='<span>Choose an emoji</span>';
   row.querySelector('[data-rr-emoji-menu]').hidden=true;
   row.querySelector('[data-rr-emoji-button]').setAttribute('aria-expanded','false');
   row.querySelector('[data-rr-role]').selectedIndex=0;
   const remove=document.createElement('button');remove.type='button';remove.className='rr-remove';remove.textContent='Remove mapping';remove.style.marginTop='8px';
   remove.addEventListener('click',()=>row.remove());
   row.appendChild(remove);rrMappingRows.appendChild(row);
  });
 document.getElementById('rrType').addEventListener('change',()=>{const embed=val('rrType')==='embed';document.getElementById('rrTextPanel').hidden=embed;document.getElementById('rrEmbedPanel').hidden=!embed;});
 document.querySelectorAll('[data-rr-insert]').forEach(btn=>btn.addEventListener('click',()=>{const type=btn.dataset.rrInsert;const target=document.getElementById('rrMessageText');let value='';if(type==='user'&&/^\\d{17,20}$/.test(val('rrMentionUser').trim()))value='<@'+val('rrMentionUser').trim()+'>';if(type==='user'&&!value){alert('Enter a valid Discord user ID first.');return;}if(type==='channel'&&val('rrMentionChannel'))value='<#'+val('rrMentionChannel')+'>';if(type==='role'&&val('rrMentionRole'))value='<@&'+val('rrMentionRole')+'>';if(!value)return;const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;target.value=target.value.slice(0,start)+value+target.value.slice(end);target.focus();target.selectionStart=target.selectionEnd=start+value.length;}));
 document.getElementById('rrResolveIds').addEventListener('click',()=>{const channelIds=new Set(channels.map(x=>String(x.id))),roleIds=new Set(roles.map(x=>String(x.id)));const el=document.getElementById('rrMessageText');el.value=el.value.replace(/\b\d{17,20}\b/g,raw=>channelIds.has(raw)?'<#'+raw+'>':roleIds.has(raw)?'<@&'+raw+'>':raw);});
 const saveSettings=async()=>{
  const requested={allowMultiple:yes('rrAllowMultiple'),removeOnUnreact:yes('rrRemoveOnUnreact'),dmConfirm:rrPaid?yes('rrDmConfirm'):true,enabled:true,language:val('rrLanguage')||'en',updateNotifications:yes('rrUpdateNotifications'),errorReporting:yes('rrErrorReporting'),notificationChannelId:val('rrNotificationChannel')||null};
  const result=await api('/api/bot-config/react-roles/settings?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify(requested)});
  const saved=result.config||{};
  if(saved.dmConfirm!==requested.dmConfirm||saved.updateNotifications!==requested.updateNotifications)throw new Error('Discord did not persist the DM/notification toggles. Please try saving again.');
  return saved;
};
 if(!rrPaid){['rrEmbedColor','rrEmbedFooter','rrEmbedImage'].forEach(key=>{const el=document.getElementById(key);if(el){el.disabled=true;el.title='Premium or Pro required';el.style.opacity='.55';}}); }
 document.getElementById('rrSaveSettings').onclick=async()=>{try{const saved=await saveSettings();alert('Reaction role settings saved. DM confirmations: '+(saved.dmConfirm?'ON':'OFF')+'. Update notifications: '+(saved.updateNotifications?'ON':'OFF')+'.');}catch(e){alert('Could not save settings: '+e.message);}};
 document.getElementById('rrCreateSave').onclick=async()=>{
  const action=val('rrMessageAction'),channelId=action==='existing'?val('rrExistingChannel'):val('rrChannel');
  const mappings=Array.from(document.querySelectorAll('#rrMappingRows .rr-mapping-row')).map(row=>({emoji:row.querySelector('[data-rr-emoji]').value.trim(),roleId:row.querySelector('[data-rr-role]').value})).filter(m=>m.emoji||m.roleId);
  if(!channelId||!mappings.length||mappings.some(m=>!m.emoji||!m.roleId)){alert('For each reaction, choose both an emoji and a role.');return;}
  const seen=new Set();for(const m of mappings){if(seen.has(m.emoji)){alert('Each reaction mapping must use a different emoji.');return;}seen.add(m.emoji);}
  try{
   let messageId=val('rrMessageId').trim();
   if(action==='create'){
    const type=val('rrType');
    const payload={channelId,type,content:type==='text'?val('rrMessageText'):undefined,title:val('rrEmbedTitle'),description:val('rrEmbedDescription'),color:val('rrEmbedColor'),footer:val('rrEmbedFooter'),image:val('rrEmbedImage')};
    const posted=await api('/api/bot-config/react-roles/post?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify(payload)});
    if(!posted.success)throw new Error(posted.error||posted.message||'Could not post message');
    messageId=posted.messageId;
   }
   if(!messageId){throw new Error('Enter the existing message ID.');}
   for(const mapping of mappings){
    const added=await api('/api/bot-config/react-roles/add?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({channelId,messageId,emoji:mapping.emoji,roleId:mapping.roleId})});
    if(!added.success)throw new Error(added.error||added.message||'Could not add reaction '+mapping.emoji);
   }
   await saveSettings();
   alert('Reaction role message saved with '+mappings.length+' reaction'+(mappings.length===1?'':'s')+'.');await renderReactionRolesPanel(id,f,await load(id));
  }catch(e){alert('Could not create reaction role: '+e.message);}
 };
 document.querySelectorAll('[data-remove-rr]').forEach(btn=>btn.addEventListener('click',async()=>{const index=Number(btn.dataset.removeRr);if(!confirm('Remove this reaction role mapping?'))return;try{const result=await api('/api/bot-config/react-roles/remove?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({index})});if(result.success===false)throw new Error(result.error||result.message);await renderReactionRolesPanel(id,f,await load(id));}catch(e){alert('Could not remove reaction role: '+e.message);}}));
 attachToggle(id,f,c);
}

async function renderSourceAlertPanel(id,f,c){
 const key=f[0];
 const definitions={
  rss:{title:'RSS Feeds',label:'Feed name',placeholder:'My blog',sourceLabel:'Feed URL',sourcePlaceholder:'https://example.com/feed.xml',hint:'Add a public RSS or Atom feed URL. The bot needs a feed polling worker to deliver new entries.'},
  reddit:{title:'Reddit Alerts',label:'Alert name',placeholder:'Gaming subreddit',sourceLabel:'Subreddit or Reddit URL',sourcePlaceholder:'r/gaming or https://reddit.com/r/gaming',hint:'Use a subreddit such as r/gaming or a Reddit community URL.'},
  podcast:{title:'Podcast Alerts',label:'Podcast name',placeholder:'My favourite podcast',sourceLabel:'Podcast RSS URL',sourcePlaceholder:'https://example.com/podcast.xml',hint:'Podcast episode feeds are usually RSS or Atom URLs provided by the podcast host.'},
  instagram:{title:'Instagram Alerts',label:'Account label',placeholder:'Creator name',sourceLabel:'Instagram username or profile URL',sourcePlaceholder:'username or https://instagram.com/username',hint:'Instagram access and reliable change detection may require an approved API or external provider.'},
  xalerts:{title:'X Alerts',label:'Account label',placeholder:'Creator name',sourceLabel:'X username or profile URL',sourcePlaceholder:'username or https://x.com/username',hint:'X monitoring requires API access or a compatible external provider; credentials and usage limits may apply.'}
 };
 const def=definitions[key];
 const configKey=key+'Alerts';
 const existing=Array.isArray(c[configKey])?c[configKey]:[];
 const sourceTierRaw=String(c.tier||'free').toLowerCase();
 const sourceTier=sourceTierRaw!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':sourceTierRaw;
 const sourceLimit=sourceTier==='pro'?20:sourceTier==='premium'?10:5;
 let entries=existing.map(x=>({...x}));
 const channelsResult=await api('/api/guild/'+encodeURIComponent(id)+'/channels');
 const channels=(channelsResult.channels||[]).filter(ch=>ch.type==='text');
 const channelOptions=selected=>'<option value="">Choose a text channel</option>'+channels.map(ch=>'<option value="'+esc(ch.id)+'" '+(ch.id===selected?'selected':'')+'>'+esc(ch.name)+'</option>').join('');
 const drawEntries=()=>entries.map((entry,index)=>'<article class="rr-entry"><div style="min-width:0;flex:1"><strong>'+esc(entry.label||entry.source)+'</strong><p>'+esc(entry.source)+' · '+esc(channels.find(ch=>ch.id===entry.channelId)?.name||'Channel ID: '+(entry.channelId||'not selected'))+' · '+(entry.enabled===false?'Paused':'Enabled')+'</p></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="rr-remove" type="button" data-alert-toggle="'+index+'">'+(entry.enabled===false?'Enable':'Pause')+'</button><button class="rr-remove" type="button" data-alert-remove="'+index+'">Remove</button></div></article>').join('');
 body.innerHTML=card(def.title,'Configure sources and their Discord destination channels.','<div class="welcome-panel">'+
  '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>'+def.title+' settings</h3><p>Choose a default destination and enable or pause this alert type.</p></div></div>'+
  check('sourceAlertsEnabled','Enable '+def.title.toLowerCase()+' for this server',c[key+'AlertsEnabled']===true)+
  '<label class="field">Default notification channel<select id="sourceDefaultChannel">'+channelOptions(c[key+'DefaultChannel']||'')+'</select></label>'+
  '<div class="panel-actions"><button class="select" id="saveSourceSettings" type="button">Save settings</button></div></section>'+
  '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Add a source</h3><p>Each source can use its own channel or the default destination.</p></div></div>'+
  '<label class="field">'+def.label+'<input id="sourceLabel" maxlength="100" placeholder="'+esc(def.placeholder)+'"></label>'+
  '<label class="field">'+def.sourceLabel+'<input id="sourceValue" maxlength="1000" placeholder="'+esc(def.sourcePlaceholder)+'"></label>'+
  '<label class="field">Post notifications to<select id="sourceChannel">'+channelOptions('')+'</select></label>'+
  '<p class="mention-help">'+def.hint+'</p>'+
  '<div class="panel-actions"><button class="select" id="addSourceAlert" type="button">Add source</button></div></section>'+
  '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Configured sources</h3><p>'+entries.length+' source(s) saved</p></div></div><div id="sourceAlertEntries">'+(drawEntries()||'<p class="mention-help">No sources added yet.</p>')+'</div>'+
  '<div class="panel-actions"><button class="select" id="saveSourceList" type="button">Save source list</button></div></section>'+
  '<p class="mention-help">This panel currently saves dashboard configuration. Actual automated delivery requires the corresponding runtime monitor and credentials/API access to be implemented and tested.</p></div>');
 const persist=async()=>{const patch={[configKey]:entries,[key+'AlertsEnabled']:yes('sourceAlertsEnabled'),[key+'DefaultChannel']:val('sourceDefaultChannel')||null};const result=await save(id,patch);if(result?.success===false)throw new Error(result.error||'Save failed');};
 document.getElementById('saveSourceSettings').onclick=async()=>{try{await persist();alert(def.title+' settings saved.');}catch(err){alert('Could not save settings: '+err.message);}};
 document.getElementById('addSourceAlert').onclick=async()=>{if(entries.length>=sourceLimit){alert('This server has reached its '+sourceLimit+' account/source limit for the '+sourceTier.toUpperCase()+' plan.');return;}const label=val('sourceLabel').trim(),source=val('sourceValue').trim(),channelId=val('sourceChannel')||val('sourceDefaultChannel');if(!source){alert('Enter a source first.');return;}if(!channelId){alert('Choose a notification channel, either for this source or as the default.');return;}if(key==='rss'||key==='podcast'){try{const u=new URL(source);if(!['http:','https:'].includes(u.protocol))throw new Error();}catch(_){alert('Enter a valid http:// or https:// feed URL.');return;}}const duplicate=entries.some(e=>e.source.toLowerCase()===source.toLowerCase());if(duplicate){alert('This source is already configured.');return;}entries.push({label:label||source,source,channelId,enabled:true,addedAt:new Date().toISOString()});try{await persist();await renderSourceAlertPanel(id,f,{...(await load(id))});}catch(err){alert('Could not add source: '+err.message);}};
 document.querySelectorAll('[data-alert-toggle]').forEach(btn=>btn.onclick=async()=>{const index=Number(btn.dataset.alertToggle);if(!entries[index])return;entries[index].enabled=entries[index].enabled===false;try{await persist();await renderSourceAlertPanel(id,f,{...(await load(id))});}catch(err){alert('Could not update source: '+err.message);}});
 document.querySelectorAll('[data-alert-remove]').forEach(btn=>btn.onclick=async()=>{const index=Number(btn.dataset.alertRemove);if(!entries[index]||!confirm('Remove this source?'))return;entries.splice(index,1);try{await persist();await renderSourceAlertPanel(id,f,{...(await load(id))});}catch(err){alert('Could not remove source: '+err.message);}});
 document.getElementById('saveSourceList').onclick=async()=>{try{await persist();alert('Source list saved.');}catch(err){alert('Could not save source list: '+err.message);}};
 attachToggle(id,f,c);
}

async function renderDebilInspiredPanel(id,f,c){
 const k=f[0];
 const schemas={
  giveaways:{key:'giveawaySettings',title:'Giveaway settings',intro:'GiveawayBot-style workflow: timed giveaways, entry buttons, winner selection and rerolls.',fields:[
   ['enabled','Enable giveaway controls',c.giveawaySettings?.enabled!==false,'check'],
   ['channelId','Default giveaway channel ID',c.giveawaySettings?.channelId||'','channel'],
   ['defaultDurationMinutes','Default duration (minutes)',c.giveawaySettings?.defaultDurationMinutes||60,'number'],
   ['defaultWinners','Default winner count',c.giveawaySettings?.defaultWinners||1,'number'],
   ['allowReroll','Allow rerolling winners',c.giveawaySettings?.allowReroll!==false,'check'],
   ['requireRoleId','Optional required role ID',c.giveawaySettings?.requireRoleId||'','role']
  ]},
  economy:{key:'economySettings',title:'Economy settings',intro:'Configure server currency, rewards, and member transfers.',fields:[
   ['enabled','Enable economy',c.economySettings?.enabled!==false,'check'],
   ['currencyName','Currency name',c.economySettings?.currencyName||'Credits','text'],
   ['currencySymbol','Currency symbol',c.economySettings?.currencySymbol||'₵','text'],
   ['dailyReward','Daily reward amount',c.economySettings?.dailyReward||100,'number'],
   ['dailyCooldownHours','Daily reward cooldown (hours)',c.economySettings?.dailyCooldownHours||24,'number'],
   ['startingBalance','Starting balance',c.economySettings?.startingBalance||0,'number'],
   ['allowTransfers','Allow member-to-member transfers',c.economySettings?.allowTransfers!==false,'check']
  ]},
  music:{key:'musicSettings',title:'Music settings',intro:'Configure SPIDEY BOT voice playback, queue limits, source options and DJ controls. Source availability depends on the installed extractors and upstream platform changes.',fields:[
   ['enabled','Enable music controls',c.musicSettings?.enabled!==false,'check'],
   ['djRoleId','DJ role ID (optional)',c.musicSettings?.djRoleId||'','role'],
   ['musicChannelId','Optional music command channel ID',c.musicSettings?.musicChannelId||'','channel'],
   ['maxQueueSize','Maximum upcoming tracks',c.musicSettings?.maxQueueSize??100,'number'],
   ['defaultVolume','Default playback volume (0–200)',c.musicSettings?.defaultVolume??100,'number'],
   ['allowPlaylists','Allow playlists',c.musicSettings?.allowPlaylists!==false,'check'],
   ['allowSoundCloud','Allow SoundCloud searches/links',c.musicSettings?.allowSoundCloud!==false,'check'],
   ['allowSpotify','Allow Spotify searches/links when supported',c.musicSettings?.allowSpotify!==false,'check'],
   ['allowSkip','Allow skip, pause, resume and queue controls',c.musicSettings?.allowSkip!==false,'check']
  ]},
  casino:{key:'casinoSettings',title:'Casino settings',intro:'Configure slots, bet limits, and multipliers for virtual in-server currency.',fields:[
   ['enabled','Enable casino',c.casinoSettings?.enabled!==false,'check'],
   ['minBet','Minimum bet',c.casinoSettings?.minBet||50,'number'],
   ['maxBet','Maximum bet',c.casinoSettings?.maxBet||10000,'number'],
   ['slotsEnabled','Enable slots',c.casinoSettings?.slotsEnabled!==false,'check'],
   ['showMultipliers','Show slots multiplier help',c.casinoSettings?.showMultipliers!==false,'check']
  ]},
  lottery:{key:'lotterySettings',title:'Lottery settings',intro:'Configure a virtual-currency lottery. Scheduled draws and payouts require runtime support.',fields:[
   ['enabled','Enable lottery',c.lotterySettings?.enabled!==false,'check'],
   ['ticketPrice','Ticket price',c.lotterySettings?.ticketPrice||10,'number'],
   ['maxTicketsPerMember','Maximum tickets per member',c.lotterySettings?.maxTicketsPerMember||5,'number'],
   ['drawIntervalHours','Draw interval (hours)',c.lotterySettings?.drawIntervalHours||24,'number'],
   ['prizePercent','Prize pool percentage',c.lotterySettings?.prizePercent||80,'number']
  ]},
  games:{key:'gamesSettings',title:'Games settings',intro:'Configure community games including Rock Paper Scissors, slots, jokes, and quote cards. Slots are also managed in Casino.',fields:[
   ['enabled','Enable games panel settings',c.gamesSettings?.enabled!==false,'check'],
   ['rockPaperScissors','Rock Paper Scissors',c.gamesSettings?.rockPaperScissors!==false,'check'],
   ['jokes','Joke command',c.gamesSettings?.jokes!==false,'check'],
   ['quoteCards','Quote image command',c.gamesSettings?.quoteCards!==false,'check'],
   ['gameChannelId','Optional games channel ID',c.gamesSettings?.gameChannelId||'','channel']
  ]},
  ai:{key:'aiAssistantSettings',title:'Gemini AI Assistant settings',intro:'Powered by Google Gemini. Server admins can customise the assistant name and allowed channel; provider credentials stay private on Railway.',fields:[
   ['enabled','Enable AI Assistant',c.aiAssistantSettings?.enabled!==false,'check'],
   ['assistantName','Assistant name (used for the Discord command)',c.aiAssistantSettings?.assistantName||c.aiAssistantName||'spidey','text'],
   ['channelId','Optional allowed channel ID',c.aiAssistantSettings?.channelId||'','channel'],
   ['keepConversationContext','Keep conversation context',c.aiAssistantSettings?.keepConversationContext!==false,'check'],
   ['maxResponseLength','Maximum response characters',c.aiAssistantSettings?.maxResponseLength||1900,'number']
  ]},
  premium:{key:'premiumSettings',title:'Premium / Pro',intro:'Compare Premium and Pro plans, pay securely through PayPal, and unlock the selected plan for this Discord server after payment is verified.',fields:[]}
 };
 const schema=schemas[k]; if(!schema)return false;
 const current=c[schema.key]||{};
 const dropdowns=['giveaways','music','games','ai'].includes(k)?await guildDropdownOptions(id):{channels:[],roles:[]};
 if(k==='premium'){
 const currentTierRaw=String(c.tier||'free').toLowerCase();
 const currentTier= currentTierRaw!=='free' && c.tierEndDate && Number(c.tierEndDate)<=Date.now() ? 'free' : (['free','premium','pro'].includes(currentTierRaw)?currentTierRaw:'free');
 const pricing={premium:{1:4.99,3:13.99,6:24.99,12:39.99},pro:{1:7.99,3:21.99,6:39.99,12:69.99}};
 const periods=[{months:1,label:'Monthly'},{months:3,label:'3 Months'},{months:6,label:'6 Months'},{months:12,label:'Yearly'}];
 let selectedPeriod=1;
 const money=n=>'$'+Number(n).toFixed(2);
 const renderPricing=()=>{
  const months=selectedPeriod;
  const p=pricing.premium[months], pro=pricing.pro[months];
  const premiumMonthly=(p/months).toFixed(2),proMonthly=(pro/months).toFixed(2);
  const freeFeatures=['Welcome & Goodbye; Moderation, AutoMod, Audit Log and Levels','Level role rewards: up to 10 per server','Ticketing, Casino, Lottery, Games, Economy and System','3 reaction-role mappings; 5 reactions per message','8 message milestones and 8 emoji milestones','5 custom commands; 10 invite milestone rewards','2 saved Embed Messages; 10 giveaway messages','5 accounts per social-alert section','Reminders and Birthdays standard settings','50 AI requests per server per day','5 configured statistics counters','Polls, server emojis and Music require Premium or Pro'];
  const premiumFeatures=['Everything in Free','Level role rewards increased to 20 per server','8 reaction-role mappings; 10 reactions per message','15 message milestones and 15 emoji milestones','25 custom commands; 20 invite milestone rewards','5 saved Embed Messages; 20 giveaway messages','10 accounts per social-alert section','Polls, server emojis and Music unlocked','Embed colour, image URL and footer customisation','DM-confirmation opt-out, milestone announcements','Reminder behaviour and Birthday custom events','200 AI requests per server per day','10 configured statistics counters'];
  const proFeatures=['Everything in Premium','Level role rewards increased to 100 per server','Unlimited reaction-role mappings and reactions per message','Unlimited message and emoji milestones','100 custom commands; 100 invite milestone rewards','30 saved Embed Messages; 100 giveaway messages','20 accounts per social-alert section','Gold Pro plan styling and highest standard feature limits','1,000 AI requests per server per day','20 configured statistics counters'];
  const featureList=items=>'<ul>'+items.map(x=>'<li><span>✓</span>'+x+'</li>').join('')+'</ul>';
  const comparisonRows=[["Welcome & Goodbye","Core features; specified limits","Customisation and higher limits","Customisation and unlimited reaction limits"],["Moderation","All","All","All"],["AutoMod","All","All","All"],["Audit Log","All","All","All"],["Levels","All","All","All"],["Achievements","8 message + 8 emoji milestones","15 of each; announcements","Unlimited; announcements"],["Custom Commands","5","25","100"],["Invite Tracker","10 rewards","20 rewards","100 rewards"],["Ticketing","All","All","All"],["Emojis","Locked","All","All"],["Polls","Locked","All","All"],["Embed Messages","2","5","30"],["Reminders","All except Reminder behaviour","All","All"],["Birthdays","All except Custom events","All","All"],["Social Alerts","5 accounts per section","10 per section","20 per section"],["Giveaways","10 invite giveaway messages","20 messages","100 messages"],["Economy","All except currency name/symbol","All","All"],["Music","Locked","All","All"],["Casino, Lottery & Games","All","All","All"],["AI Assistant","50 requests/day/server","200 requests/day/server","1,000 requests/day/server"],["Statistics","5 configured counters","10 configured counters","20 configured counters"],["Commands","View status","View and control entitled settings","View and control entitled settings"],["System","All","All","All"]];
  const comparisonTable='<section class="subscription-comparison" aria-labelledby="subscription-comparison-title"><h3 id="subscription-comparison-title">Subscription feature comparison</h3><p>Consolidated reference for subscription checks and plan access.</p><div class="subscription-table-wrap"><table class="subscription-table"><thead><tr><th scope="col">Panel</th><th scope="col">Free</th><th scope="col">Premium</th><th scope="col">Pro</th></tr></thead><tbody>'+comparisonRows.map(row=>'<tr>'+row.map((cell,i)=>i===0?'<th scope="row">'+cell+'</th>':'<td>'+cell+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></section>';
  body.innerHTML=card(k==='premium'?'Premium / Pro':f[1],schema.intro,
   '<div class="billing-period-tabs" role="tablist" aria-label="Billing period">'+periods.map(x=>'<button type="button" class="billing-period-tab '+(x.months===months?'active':'')+'" data-period="'+x.months+'" role="tab" aria-selected="'+(x.months===months)+'">'+x.label+'</button>').join('')+'</div>'+
   '<p class="billing-period-note">Prices are charged once for the selected period. Checkout is securely handled by PayPal.</p>'+
   '<div class="pricing-grid">'+
   '<article class="pricing-card pricing-free"><div class="pricing-card-head"><h3>Free</h3></div><div class="pricing-price"><strong>$0</strong><span>forever</span></div><p class="pricing-desc">For every server, with no subscription required.</p>'+featureList(freeFeatures)+'<button type="button" class="pricing-pay-button" '+(currentTier==='free'?'disabled':'')+'>'+(currentTier==='free'?'Current plan':'Free plan')+'</button></article>'+
   '<article class="pricing-card pricing-premium '+(currentTier==='premium'?'pricing-current':'')+'"><div class="pricing-card-head"><div class="pricing-plan-title"><img class="pricing-lottie premium-lottie" src="/premium-logo.gif" alt="" loading="eager"><h3>Premium</h3></div></div><div class="pricing-price"><strong>'+money(p)+'</strong><span>/ '+(months===1?'month':months+' months')+'</span></div><p class="pricing-desc">'+money(Number(premiumMonthly))+' per month equivalent</p>'+featureList(premiumFeatures)+'<button type="button" class="pricing-pay-button" '+(currentTier==='premium'?'disabled':'')+' '+(currentTier==='premium'?'':'data-pay-tier="premium"')+'>'+(currentTier==='premium'?'Current plan':'Pay with PayPal')+'</button></article>'+
   '<article class="pricing-card pricing-pro '+(currentTier==='pro'?'pricing-current':'')+'"><div class="pricing-card-head"><div class="pricing-plan-title"><img class="pricing-lottie pro-lottie" src="/pro-logo.gif" alt="" loading="eager"><h3>Pro</h3></div></div><div class="pricing-price"><strong>'+money(pro)+'</strong><span>/ '+(months===1?'month':months+' months')+'</span></div><p class="pricing-desc">'+money(Number(proMonthly))+' per month equivalent</p>'+featureList(proFeatures)+'<button type="button" class="pricing-pay-button" '+(currentTier==='pro'?'disabled':'')+' '+(currentTier==='pro'?'':'data-pay-tier="pro"')+'>'+(currentTier==='pro'?'Current plan':'Pay with PayPal')+'</button></article>'+
   '</div>'+comparisonTable);
  body.querySelectorAll('[data-period]').forEach(btn=>btn.addEventListener('click',()=>{selectedPeriod=Number(btn.dataset.period);renderPricing();}));
  body.querySelectorAll('[data-pay-tier]').forEach(btn=>btn.addEventListener('click',()=>checkoutPremium(btn.dataset.payTier,months,btn)));
 };
 const checkoutPremium=async(tier,months,btn)=>{
  const price=pricing[tier]?.[months];
  if(!price){alert('That billing period is not available.');return;}
  if(!confirm('Continue to PayPal to pay '+money(price)+' for '+tier.toUpperCase()+' ('+months+' month'+(months===1?'':'s')+')?'))return;
  const original=btn.textContent;btn.disabled=true;btn.textContent='Connecting to PayPal…';
  try{
   const response=await fetch('/api/paypal/create-order',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({guildId:id,tier,durationMonths:months})});
   const result=await response.json();
   if(!response.ok||!result.approvalUrl||!result.orderId)throw new Error(result.error||'Could not start PayPal checkout.');
   try{localStorage.setItem('pendingPayPalOrder',JSON.stringify({orderId:result.orderId,tier,durationMonths:months,guildId:id}));}catch(storageError){}
   window.location.href=result.approvalUrl;
  }catch(error){alert('PayPal checkout could not start: '+(error.message||String(error)));btn.disabled=false;btn.textContent=original;}
 };
 renderPricing();
 return true;
}
 const controls=schema.fields.map(([field,label,defaultValue,type])=>type==='check'
  ?'<label class="check"><span>'+esc(label)+'</span><input type="checkbox" id="debil_'+field+'" '+(defaultValue?'checked':'')+'></label>'
  :type==='channel'?guildSelect('debil_'+field,label,dropdowns.channels,defaultValue,'No channel (optional)')
  :type==='role'?guildSelect('debil_'+field,label,dropdowns.roles,defaultValue,'No role (optional)')
  :input('debil_'+field,label,defaultValue,type)).join('');
 const aiToday=new Date().toISOString().slice(0,10);
 const aiUsed=c.aiDailyUsage?.date===aiToday?Math.max(0,Number(c.aiDailyUsage.count)||0):0;
 const aiTier=effectiveTier(c);
 const aiLimit=aiTier==='pro'?1000:aiTier==='premium'?200:50;
 const aiUsageNote=k==='ai'?'<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Daily server allowance</h3><p>'+Math.min(aiLimit,aiUsed)+' of '+aiLimit.toLocaleString()+' AI requests used today (UTC). Allowance is per server and resets at 00:00 UTC.</p><p class="mention-help">Free: 50 requests · Premium: 200 requests · Pro: 1,000 requests per day.</p></div></div><div class="progress-track"><div class="progress-fill" style="width:'+Math.min(100,aiUsed/aiLimit*100)+'%"></div></div></section>':'';
 body.innerHTML=card(f[1],schema.intro,'<div class="welcome-panel">'+aiUsageNote+'<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>'+esc(schema.title)+'</h3><p>Settings are saved per server.</p></div></div>'+controls+'<div class="panel-actions">'+button('saveDebilSettings','Save '+f[1])+'</div></section></div>');
 if(k==='economy' && !['premium','pro'].includes((String(c.tier||'free').toLowerCase()!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':String(c.tier||'free').toLowerCase()))){['debil_currencyName','debil_currencySymbol'].forEach(key=>{const el=document.getElementById(key);if(el){el.disabled=true;el.title='Premium or Pro required';el.style.opacity='.55';}});const note=document.createElement('p');note.className='plan-locked-inline';note.textContent='🔒 Currency name and symbol customisation requires Premium or Pro.';body.querySelector('.welcome-message-section')?.appendChild(note);}

 document.getElementById('saveDebilSettings').onclick=async()=>{
  const next={};
  schema.fields.forEach(([field,,defaultValue,type])=>{
   const element=document.getElementById('debil_'+field);
   if(type==='check')next[field]=!!element?.checked;
   else if(type==='number')next[field]=Math.max(0,Number(element?.value)||0);
   else next[field]=String(element?.value||'').trim();
  });
  const result=await save(id,{[schema.key]:next});
  if(result?.success===false)throw new Error(result.error||'Save failed');
  alert(f[1]+' settings saved.');
 };
 attachToggle(id,f,c);
 return true;
}


async function renderGiveawaysPanel(id,f,c){
 const [channelResult,emojiResult,giveawayResult]=await Promise.all([
  api('/api/guild/'+encodeURIComponent(id)+'/channels'),
  api('/api/guild/'+encodeURIComponent(id)+'/emojis').catch(()=>({emojis:[]})),
  api('/api/config/giveaways?guildId='+encodeURIComponent(id)).catch(()=>({giveaways:{}}))
 ]);
 const channels=(channelResult.channels||[]).filter(ch=>['text','announcement','news'].includes(ch.type));
 const emojis=emojiResult.emojis||[];
 const existing=giveawayResult.giveaways||{};
 const giveawayTierRaw=String(c.tier||'free').toLowerCase();
 const giveawayTier=giveawayTierRaw!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':giveawayTierRaw;
 const giveawayLimit=giveawayTier==='pro'?100:giveawayTier==='premium'?20:10;
 const active=Object.entries(existing).filter(([,g])=>g.status==='active');
 const options='<option value="🎁">🎁 Default giveaway emoji</option>'+emojis.map(e=>'<option value="'+esc(e.id)+'">'+(e.animated?'GIF ':'')+':'+esc(e.name)+':</option>').join('');
 const durationOptions='<option value="minutes">Minutes</option><option value="hours" selected>Hours</option><option value="days">Days</option>';
 const renderActive=()=>active.length?active.map(([name,g])=>'<div class="giveaway-active-row"><div class="giveaway-active-copy"><strong>'+esc(g.prize||name)+'</strong><span>#'+esc(g.channelName||g.channel||g.channelId||'channel not set')+' · '+esc(String(g.winners||1))+' winner(s) · ends '+esc(g.endsAt?new Date(g.endsAt).toLocaleString():'at scheduled time')+'</span></div><button type="button" class="select giveaway-remove" data-remove-giveaway="'+esc(name)+'">Remove</button></div>').join(''):'<p class="mention-help">No active giveaways for this server yet.</p>';
 const draw=()=>{body.innerHTML=card(f[1],'Create and manage giveaways for this Discord server.',
  '<div class="welcome-panel">'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Post a giveaway</h3><p>'+active.length+' of '+giveawayLimit+' active giveaway messages used on the '+esc(giveawayTier.toUpperCase())+' plan. Choose the format, message, entry emoji and duration, then post it to Discord.</p></div></div>'+
   '<label class="field">Giveaway prize<input id="gwPrize" maxlength="200" placeholder="e.g. Nitro, game key, gift card"></label>'+
   '<label class="field">Post to channel<select id="gwChannel">'+optionList(channels,'','Choose a text channel')+'</select></label>'+
   '<label class="field">Message format<select id="gwFormat"><option value="text">Normal text</option><option value="embed" selected>Embed</option></select></label>'+
   '<div id="gwTextFields"><label class="field">Text shown in the giveaway<textarea id="gwMessage" rows="5" maxlength="4000" placeholder="Enter the message members will see. Use {prize}, {winners} and {duration} if helpful."></textarea></label></div>'+
   '<div id="gwEmbedFields"><label class="field">Embed title<input id="gwTitle" maxlength="256" value="🎉 Giveaway!"></label><label class="field">Embed description<textarea id="gwDescription" rows="5" maxlength="4000" placeholder="Write the giveaway details shown inside the embed."></textarea></label></div>'+
   '<label class="field">Entry emoji<input type="hidden" id="gwEmoji" value="🎁"><div class="gw-emoji-picker" id="gwEmojiPicker"><button type="button" class="gw-emoji-trigger" id="gwEmojiTrigger"><span class="gw-emoji-selected" id="gwEmojiSelected">🎁 <span>Default giveaway emoji</span></span><span aria-hidden="true">▾</span></button><div class="gw-emoji-menu" id="gwEmojiMenu" hidden><button type="button" class="gw-emoji-option" data-emoji-value="🎁"><span class="gw-emoji-preview">🎁</span><span>Default giveaway emoji</span></button>'+emojis.map(e=>'<button type="button" class="gw-emoji-option" data-emoji-value="'+esc(e.id)+'"><img class="gw-emoji-preview" src="'+esc(e.url)+'" alt="" loading="lazy"><span>:'+esc(e.name)+':</span>'+(e.animated?'<small>Animated</small>':'')+'</button>').join('')+'</div></div><span class="mention-help">Choose an emoji from this server. Each option shows the actual emoji image; the selected server emoji will be used as the entry reaction.</span></label>'+
   '<label class="field">External emoji/image URL (optional)<input id="gwEmojiUrl" type="url" placeholder="https://example.com/emoji.png"><span class="mention-help">Use a direct HTTPS image URL. It will appear as an image on the giveaway post. External URLs cannot be used as Discord reaction emojis, so the 🎁 reaction is used if no server emoji is selected.</span></label>'+
   '<div class="embed-two-col"><label class="field">How long will it run?<input id="gwDuration" type="number" min="1" max="525600" value="24"></label><label class="field">Duration unit<select id="gwDurationUnit">'+durationOptions+'</select></label></div>'+
   '<label class="field">Number of winners<input id="gwWinners" type="number" min="1" max="100" value="1"></label>'+
   '<div class="panel-actions"><button type="button" class="select" id="gwPost">Post giveaway</button></div></section>'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Active giveaways</h3><p>Remove a giveaway to delete its post from Discord and remove it from the active list.</p></div><button type="button" class="select" id="gwRefresh">Refresh</button></div><div class="giveaway-active-list">'+renderActive()+'</div></section>'+
  '</div>');
  const emojiPicker=document.getElementById('gwEmojiPicker'),emojiMenu=document.getElementById('gwEmojiMenu'),emojiTrigger=document.getElementById('gwEmojiTrigger'),emojiValueInput=document.getElementById('gwEmoji'),emojiSelected=document.getElementById('gwEmojiSelected');
  emojiTrigger.addEventListener('click',()=>{emojiMenu.hidden=!emojiMenu.hidden;});
  emojiPicker.querySelectorAll('[data-emoji-value]').forEach(option=>option.addEventListener('click',()=>{const value=option.dataset.emojiValue;emojiValueInput.value=value;const emoji=emojis.find(e=>String(e.id)===String(value));emojiSelected.replaceChildren();if(emoji){const img=document.createElement('img');img.className='gw-emoji-preview';img.src=emoji.url;img.alt='';emojiSelected.appendChild(img);const label=document.createElement('span');label.textContent=':'+emoji.name+':';emojiSelected.appendChild(label);}else emojiSelected.textContent='🎁 Default giveaway emoji';emojiMenu.hidden=true;}));
  document.addEventListener('click',event=>{if(!emojiPicker.contains(event.target))emojiMenu.hidden=true;},{once:false});
  const fmt=document.getElementById('gwFormat');
  const toggleFormat=()=>{document.getElementById('gwTextFields').hidden=fmt.value!=='text';document.getElementById('gwEmbedFields').hidden=fmt.value!=='embed';};
  fmt.addEventListener('change',toggleFormat);toggleFormat();
  document.getElementById('gwPost').onclick=async()=>{
   const prize=val('gwPrize').trim(),channel=val('gwChannel'),format=val('gwFormat');
   const durationValue=Math.max(1,Number(val('gwDuration'))||0),unit=val('gwDurationUnit');
   const duration=Math.round(durationValue*(unit==='days'?1440:unit==='hours'?60:1));
   const winners=Math.max(1,Math.min(100,Number(val('gwWinners'))||1));
   const emojiValue=val('gwEmoji'),emoji=emojis.find(e=>String(e.id)===String(emojiValue));
   const emojiUrl=val('gwEmojiUrl').trim();
   if(!prize||!channel){alert('Enter a prize and choose a channel.');return;}
   if(emojiUrl&&!/^https:\/\/\S+/i.test(emojiUrl)){alert('The external emoji/image URL must start with https://');return;}
   const btn=document.getElementById('gwPost');btn.disabled=true;btn.textContent='Posting…';
   try{
    const result=await api('/api/giveaway/create?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({
     prize,channel,duration,winners,format,
     message:val('gwMessage').trim(),
     embedTitle:val('gwTitle').trim(),
     embedDescription:val('gwDescription').trim(),
     emojiId:emoji?.id||null,emojiName:emoji?.name||null,emojiUrl
    })});
    if(!result.success)throw new Error(result.error||'Could not post giveaway');
    alert('Giveaway posted to Discord.');
    const refreshed=await api('/api/config/giveaways?guildId='+encodeURIComponent(id));
    for(const key of Object.keys(existing))delete existing[key];
    Object.assign(existing,refreshed.giveaways||{});
    active.splice(0,active.length,...Object.entries(existing).filter(([,g])=>g.status==='active'));
    draw();
   }catch(err){alert('Could not post giveaway: '+(err.message||String(err)));btn.disabled=false;btn.textContent='Post giveaway';}
  };
  document.getElementById('gwRefresh').onclick=async()=>{try{const result=await api('/api/config/giveaways?guildId='+encodeURIComponent(id));for(const key of Object.keys(existing))delete existing[key];Object.assign(existing,result.giveaways||{});active.splice(0,active.length,...Object.entries(existing).filter(([,g])=>g.status==='active'));draw();}catch(err){alert('Could not refresh giveaways: '+err.message);}};
  body.querySelectorAll('[data-remove-giveaway]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Remove this giveaway and delete its Discord post?'))return;btn.disabled=true;try{const result=await api('/api/giveaway/end?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({name:btn.dataset.removeGiveaway})});if(!result.success)throw new Error(result.error||'Could not remove giveaway');delete existing[btn.dataset.removeGiveaway];active.splice(0,active.length,...Object.entries(existing).filter(([,g])=>g.status==='active'));draw();}catch(err){alert('Could not remove giveaway: '+err.message);btn.disabled=false;}});
 };
 if(!document.getElementById('giveaway-panel-styles')){const st=document.createElement('style');st.id='giveaway-panel-styles';st.textContent='.gw-emoji-picker{position:relative}.gw-emoji-trigger{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:42px;padding:8px 12px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:inherit;cursor:pointer}.gw-emoji-selected{display:flex;align-items:center;gap:9px}.gw-emoji-menu{position:absolute;z-index:30;top:calc(100% + 4px);left:0;right:0;max-height:260px;overflow:auto;padding:5px;border:1px solid var(--border);border-radius:10px;background:var(--surface);box-shadow:0 12px 30px #0003}.gw-emoji-menu[hidden]{display:none!important}.gw-emoji-option{display:flex;align-items:center;gap:10px;width:100%;padding:7px 9px;border:0;border-radius:7px;background:transparent;color:inherit;text-align:left;cursor:pointer}.gw-emoji-option:hover,.gw-emoji-option:focus{background:var(--surface-hover,var(--border))}.gw-emoji-option small{margin-left:auto;color:var(--muted)}.gw-emoji-preview{width:28px;height:28px;object-fit:contain;flex:0 0 28px}.gw-emoji-selected .gw-emoji-preview{width:26px;height:26px}.giveaway-active-list{display:grid;gap:9px}.giveaway-active-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}.giveaway-active-copy{display:grid;gap:4px;min-width:0}.giveaway-active-copy strong{font-size:12px;overflow-wrap:anywhere}.giveaway-active-copy span{font-size:10px;color:var(--muted);overflow-wrap:anywhere}.giveaway-remove{flex:0 0 auto}.welcome-message-section [hidden]{display:none!important}@media(max-width:600px){.giveaway-active-row{align-items:flex-start;flex-direction:column}.giveaway-remove{align-self:flex-end}}';document.head.appendChild(st);}
 draw();
 attachToggle(id,f,c);
}

const PANEL_COMMANDS={welcome:['/welcome','/goodbye'],reactionRoles:['/reactionrole'],moderator:['/mod purge','/mod softban','/mod unban','/mod clearwarnings','/mod slowmode','/mod lock','/mod unlock'],automod:['/automod'],audit:['/auditlog'],levels:['/rank','/leaderboard','/level'],achievements:['/stats'],customCommands:['/your-custom-command'],inviteTracker:['/invites stats','/invites leaderboard'],ticketing:['/ticket'],emojis:['/emoji'],polls:['/fun poll'],embeds:['/embed'],reminders:['/remind'],birthdays:['/birthday'],twitch:['/twitch'],youtube:['/youtube'],reddit:['/reddit'],instagram:['/instagram'],rss:['/rss'],kick:['/kick'],podcast:['/podcast'],tiktok:['/tiktok'],xalerts:['/x'],giveaways:['/giveaway'],economy:['/economy daily','/economy beg','/economy shop'],music:['/play','/pause','/resume','/skip','/queue','/shuffle','/loop','/volume','/stop'],casino:['/casino'],lottery:['/lottery'],games:['/fun calculator','/fun advice','/fun dadjoke'],ai:['/ask'],commands:['/help','/adminhelp'],system:['/adminhelp'],premium:[]};
function commandStrip(panelKey){const cmds=PANEL_COMMANDS[panelKey]||[];return '<section class="panel-command-strip"><div><strong>Discord commands for this panel</strong><p>Use these in your server. Permissions and enabled features may affect availability.</p></div><div class="panel-command-list">'+(cmds.length?cmds.map(c=>'<code>'+esc(c)+'</code>').join(''):'<span class="panel-command-empty">No Discord commands available yet.</span>')+'</div></section>';}
if(!document.getElementById('plan-tier-ui-styles')){const st=document.createElement('style');st.id='plan-tier-ui-styles';st.textContent=".plan-requirement-badge{display:inline-flex;align-items:center;max-width:100%;width:max-content;margin:6px 0 3px;padding:4px 7px;border:1px solid rgba(139,92,246,.35);border-radius:999px;background:rgba(139,92,246,.10);color:#a78bfa;font-size:9px;font-weight:850;line-height:1.25}.overview-feature-copy .plan-requirement-badge{display:flex}.plan-card-detail{font-size:10px!important;line-height:1.4!important;color:var(--muted)!important;margin-top:4px!important}.overview-feature-card.is-plan-locked{opacity:.72;border-style:dashed}.overview-feature-card.is-plan-locked .overview-feature-status{color:#a78bfa}.plan-upgrade-link{border:0;background:transparent;color:#a78bfa;font-size:10px;font-weight:800;cursor:pointer;text-decoration:underline;padding:4px}.sidebar-tier-badge{margin-left:auto;flex:0 0 auto;max-width:100px;white-space:normal;text-align:center;padding:3px 5px;border:1px solid rgba(139,92,246,.35);border-radius:6px;color:#a78bfa;background:rgba(139,92,246,.08);font-size:8px;font-weight:850;line-height:1.2}.sidebar-tier-badge.is-locked{border-color:rgba(139,92,246,.55);background:rgba(139,92,246,.15)}.nav button.feature-plan-locked{opacity:.68}.plan-tier-notice{display:flex;align-items:center;gap:10px;margin:0 0 14px;padding:10px 12px;border:1px solid rgba(139,92,246,.35);border-radius:10px;background:rgba(139,92,246,.07);font-size:11px;color:var(--muted);line-height:1.45}.plan-tier-notice .plan-requirement-badge{margin:0;flex:0 0 auto}.channel-dropdown{position:relative;margin-top:6px}.channel-dropdown summary{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:40px;padding:9px 11px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;list-style:none}.channel-dropdown summary::-webkit-details-marker{display:none}.channel-dropdown[open] summary{border-color:var(--petrol);border-radius:10px 10px 0 0}.channel-dropdown-menu{max-height:230px;overflow:auto;border:1px solid var(--border);border-top:0;border-radius:0 0 10px 10px;background:var(--surface);padding:6px}.channel-dropdown-option{display:flex;align-items:center;gap:9px;padding:8px;border-radius:7px;color:var(--text);font-size:11px;cursor:pointer}.channel-dropdown-option:hover{background:var(--surface-2)}.channel-dropdown-option input{width:15px;height:15px;flex:0 0 auto}.channel-dropdown-option span{overflow-wrap:anywhere}";document.head.appendChild(st);}
if(!document.getElementById('panel-command-pricing-styles')){const st=document.createElement('style');st.id='panel-command-pricing-styles';st.textContent=".panel-command-strip{margin-top:16px;padding:13px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.panel-command-strip strong{font-size:12px}.panel-command-strip p{font-size:10px;color:var(--muted);margin:4px 0 10px}.panel-command-list{display:flex;gap:7px;flex-wrap:wrap}.panel-command-list code{padding:5px 8px;border-radius:7px;background:var(--surface-2);font-size:11px}.panel-command-empty{font-size:11px;color:var(--muted)}.billing-period-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 8px}.billing-period-tab{border:1px solid var(--border);border-radius:10px;padding:9px 15px;background:var(--surface);color:var(--text);cursor:pointer;font-weight:700;font-size:12px}.billing-period-tab.active{border-color:var(--petrol);background:var(--surface-2);box-shadow:0 0 0 1px var(--petrol)}.billing-period-note{font-size:11px;color:var(--muted);margin:0 0 16px}.pricing-pay-button{display:block;width:100%;margin-top:18px;border:0;border-radius:9px;padding:11px 12px;background:var(--petrol);color:#fff;font-weight:800;cursor:pointer}.pricing-pay-button:disabled{opacity:.55;cursor:not-allowed}.pricing-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.subscription-comparison{margin-top:28px;min-width:0}.subscription-comparison h3{font-size:18px;margin-bottom:5px}.subscription-comparison>p{font-size:12px;color:var(--muted);margin-bottom:12px}.subscription-table-wrap{width:100%;overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.subscription-table{width:100%;min-width:720px;border-collapse:separate;border-spacing:0;font-size:12px;text-align:left}.subscription-table th,.subscription-table td{padding:11px 13px;border-bottom:1px solid var(--border);vertical-align:top;line-height:1.45}.subscription-table thead th{position:sticky;top:0;background:var(--surface-2);font-weight:800;white-space:nowrap}.subscription-table tbody th{font-weight:750;min-width:150px;background:var(--surface)}.subscription-table tbody td{color:var(--text);min-width:155px}.subscription-table tbody tr:last-child th,.subscription-table tbody tr:last-child td{border-bottom:0}.subscription-table tbody tr:hover th,.subscription-table tbody tr:hover td{background:var(--surface-2)}.pricing-card{border:1px solid var(--border);border-radius:15px;padding:17px;background:var(--surface);min-width:0;overflow:hidden;transition:transform .2s ease,box-shadow .2s ease}.pricing-card:hover{transform:translateY(-3px)}.pricing-featured{border-color:var(--petrol);box-shadow:0 0 0 1px var(--petrol)}.pricing-card-head{display:flex;justify-content:space-between;gap:6px;align-items:center}.pricing-card-head h3{font-size:16px}.pricing-card-head span{font-size:9px;color:var(--petrol);font-weight:850}.pricing-plan-title{display:flex;align-items:center;justify-content:flex-start;gap:9px;min-width:0}.pricing-plan-title h3{margin:0}.pricing-lottie{display:block;flex:0 0 auto;width:auto;max-width:74px;height:38px;object-fit:contain;object-position:left center;margin:0;border:0;background:transparent;pointer-events:none}.pricing-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.pricing-card-head>span{flex:0 0 auto}@media(max-width:520px){.pricing-lottie{max-width:58px;height:32px}.pricing-plan-title{gap:7px}}.pricing-premium{border-color:#7c3aed;background:linear-gradient(180deg,rgba(91,33,182,.20),var(--surface) 42%);box-shadow:inset 0 0 0 1px rgba(124,58,237,.22)}.pricing-premium .pricing-card-head h3,.pricing-premium .pricing-card-head span{color:#a78bfa}.pricing-premium .pricing-pay-button{background:#6d28d9;color:#fff}.pricing-pro{border-color:#d4a72c;background:linear-gradient(180deg,rgba(212,167,44,.18),var(--surface) 42%);box-shadow:inset 0 0 0 1px rgba(212,167,44,.25)}.pricing-pro .pricing-card-head h3,.pricing-pro .pricing-card-head span{color:#e5b93f}.pricing-pro .pricing-pay-button{background:#e5b93f;color:#241a05}.pricing-current{box-shadow:0 0 0 2px currentColor,0 8px 26px rgba(0,0,0,.14)}.pricing-price{display:flex;align-items:baseline;gap:6px;margin:16px 0 8px}.pricing-price strong{font-size:29px}.pricing-price span,.pricing-desc{font-size:11px;color:var(--muted)}.pricing-card ul{padding:0;list-style:none;margin:15px 0 0;display:grid;gap:10px}.pricing-card li{font-size:11px;line-height:1.45;display:flex;gap:7px}.pricing-card li span{color:var(--petrol);font-weight:900}.pricing-premium li span{color:#a78bfa}.pricing-pro li span{color:#e5b93f}@media(max-width:950px){.pricing-grid{grid-template-columns:1fr}}";document.head.appendChild(st);}
async function renderPanel(id,f,c){
 try {

 const k=f[0];
 if(k==='giveaways'){await renderGiveawaysPanel(id,f,c);return;}
 if(['economy','music','casino','lottery','games','ai','premium'].includes(k)){await renderDebilInspiredPanel(id,f,c);return;}
 if(k==='welcome'){await renderWelcomePanel(id,f,c);return;}
 if(k==='reactionRoles'){await renderReactionRolesPanel(id,f,c);return;}
 if(['rss','reddit','podcast','instagram','xalerts'].includes(k)){await renderSourceAlertPanel(id,f,c);return;}
 if(['twitch','youtube','tiktok','kick'].includes(k)){
  const platform=k, titleByPlatform={twitch:'Twitch',youtube:'YouTube',tiktok:'TikTok',kick:'Kick'};
  const platformTitle=titleByPlatform[platform], settingKey=platform+'ChannelId';
  const socialTierRaw=String(c.tier||'free').toLowerCase();
  const socialTier=socialTierRaw!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':socialTierRaw;
  const socialLimit=socialTier==='pro'?20:socialTier==='premium'?10:5;
  const root='/api/social-notifications/'+encodeURIComponent(id);
  const [socialResult,channelResult]=await Promise.all([
   api(root),
   api('/api/guild/'+encodeURIComponent(id)+'/channels')
  ]);
  const socialConfig=socialResult.config||{}, allNotifications=socialResult.notifications||[];
  const channels=(channelResult.channels||[]).filter(ch=>ch.type==='text');
  const tracked=allNotifications.filter(n=>n.platform===platform);
  const accountLabel=platform==='youtube'?'YouTube channel ID (UC…; not the display name)':'Streamer username';
  const accountHint=platform==='youtube'?'Use the channel ID beginning with UC. YouTube API access must be configured on the bot host.':platform==='twitch'?'Use the Twitch login name without @. Twitch Client ID and Client Secret must be configured on the bot host.':platform==='tiktok'?'Use the TikTok username without @. Live detection requires runtime support; it is not currently implemented in this bot handler.':'Use the Kick username without @.';
  const options=items=>'<option value="">Choose a text channel</option>'+items.map(ch=>'<option value="'+esc(ch.id)+'">'+esc(ch.name)+'</option>').join('');
  const trackedRows=()=>tracked.map(n=>'<article class="rr-entry"><div style="min-width:0;flex:1"><strong>'+esc(n.username)+'</strong><p>'+esc(n.channelId===socialConfig[settingKey]?'Default '+platformTitle+' alert channel':'Channel ID: '+n.channelId)+' · '+(n.enabled?'Enabled':'Paused')+(n.isLive?' · LIVE':'')+'</p></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="rr-remove" type="button" data-social-toggle="'+esc(n.username)+'">'+(n.enabled?'Pause':'Enable')+'</button><button class="rr-remove" type="button" data-social-remove="'+esc(n.username)+'">Remove</button></div></article>').join('');
  body.innerHTML=card(platformTitle+' Alerts','Manage '+platformTitle+' accounts and choose where live notifications are posted.','<div class="welcome-panel">'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>'+platformTitle+' alert settings</h3><p>Notifications are checked by the bot polling service every five minutes.</p></div></div>'+
   check('socialAlertsEnabled','Enable social alerts for this server',socialConfig.enabled===true)+
   '<label class="field">Default '+platformTitle+' notification channel<select id="socialDefaultChannel">'+options(channels)+'</select></label>'+
   '<p class="mention-help">The default channel is saved per platform. Each monitored account also stores its own destination channel when added.</p>'+
   '<div class="panel-actions"><button class="select" id="saveSocialSettings" type="button">Save '+platformTitle+' settings</button></div></section>'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Add a '+platformTitle+' account</h3><p>New accounts start enabled and will post when a new live session is detected.</p></div></div>'+
   '<label class="field">'+accountLabel+'<input id="socialUsername" maxlength="100" placeholder="'+(platform==='youtube'?'UCxxxxxxxxxxxxxxxxxxxxxx':'username')+'"></label>'+
   '<label class="field">Post alerts to<select id="socialAccountChannel">'+options(channels)+'</select></label>'+
   '<p class="mention-help">'+accountHint+'</p>'+
   '<div class="panel-actions"><button class="select" id="addSocialAccount" type="button">Add '+platformTitle+' account</button></div></section>'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Monitored '+platformTitle+' accounts</h3><p>'+tracked.length+' of '+socialLimit+' accounts used on the '+esc(socialTier.toUpperCase())+' plan</p></div></div><div id="socialTrackedAccounts">'+(trackedRows()||'<p class="mention-help">No '+platformTitle+' accounts are being monitored yet.</p>')+'</div>'+
   '<p class="mention-help">Live alerts require the bot to be online and have permission to send messages and embeds in the selected channel.</p></section></div>');
  document.getElementById('socialDefaultChannel').value=socialConfig[settingKey]||'';
  document.getElementById('socialAccountChannel').value=socialConfig[settingKey]||'';
  document.getElementById('saveSocialSettings').onclick=async()=>{const channelId=val('socialDefaultChannel')||null;try{const result=await api(root,{method:'POST',body:JSON.stringify({enabled:yes('socialAlertsEnabled'),[settingKey]:channelId})});if(result?.success===false)throw new Error(result.error||'Save failed');alert(platformTitle+' alert settings saved.');await renderPanel(id,f,await load(id));}catch(err){alert('Could not save '+platformTitle+' settings: '+err.message);}};
  document.getElementById('addSocialAccount').onclick=async()=>{if(tracked.length>=socialLimit){alert('This server has reached its '+socialLimit+' '+platformTitle+' account limit for the '+socialTier.toUpperCase()+' plan.');return;}const username=val('socialUsername').trim().replace(/^@/,'');const channelId=val('socialAccountChannel');if(!username){alert('Enter a '+(platform==='youtube'?'YouTube channel ID':'username')+' first.');return;}if(!channelId){alert('Choose the channel where alerts should be posted.');return;}if(platform==='youtube'&&!/^UC[A-Za-z0-9_-]{20,}$/.test(username)){alert('YouTube expects a channel ID beginning with UC, not a handle or display name.');return;}if(platform!=='youtube'&&!/^[A-Za-z0-9._-]{1,100}$/.test(username)){alert('Enter a valid username without spaces.');return;}try{const result=await api(root,{method:'POST',body:JSON.stringify({platform,username,channelId})});if(result?.success===false)throw new Error(result.error||'Could not add account');alert(platformTitle+' account added.');await renderPanel(id,f,await load(id));}catch(err){alert('Could not add '+platformTitle+' account: '+err.message);}};
  document.querySelectorAll('[data-social-remove]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Stop monitoring '+platformTitle+' account '+btn.dataset.socialRemove+'?'))return;try{const result=await api(root+'/'+encodeURIComponent(platform)+'/'+encodeURIComponent(btn.dataset.socialRemove),{method:'DELETE'});if(result?.success===false)throw new Error(result.error||'Remove failed');await renderPanel(id,f,await load(id));}catch(err){alert('Could not remove account: '+err.message);}});
  document.querySelectorAll('[data-social-toggle]').forEach(btn=>btn.onclick=async()=>{try{const result=await api(root+'/'+encodeURIComponent(platform)+'/'+encodeURIComponent(btn.dataset.socialToggle)+'/toggle',{method:'POST',body:JSON.stringify({})});if(result?.success===false)throw new Error(result.error||'Update failed');await renderPanel(id,f,await load(id));}catch(err){alert('Could not update account: '+err.message);}});
  attachToggle(id,f,c);return;
 }
 if(k==='reminders'){
  const cfg=c.reminderSettings||{};
  body.innerHTML=card('Reminders','Inspired by RemindmeBot: configure reminder defaults, recurring reminders and timezone handling. Reminder scheduling and slash-command delivery must be supported by the bot runtime to take effect.',switcher(id,f,c)+
   '<div class="welcome-panel">'+
   '<section class="welcome-message-section"><h3>Reminder defaults</h3>'+check('reminderEnabled','Enable reminders',cfg.enabled!==false)+input('reminderTimezone','Server timezone (IANA)',cfg.timezone||'UTC')+input('reminderChannel','Default reminder channel ID (optional)',cfg.channelId||'')+input('reminderMax','Maximum active reminders per member',cfg.maxPerUser??25,'number')+'</section>'+
   '<section class="welcome-message-section"><h3>Reminder behaviour</h3>'+check('reminderDm','Deliver personal reminders by direct message',cfg.dm!==false)+check('reminderRecurring','Allow recurring reminders',cfg.recurring!==false)+check('reminderMentions','Allow reminders to mention users and roles',cfg.allowMentions===true)+'<p class="mention-help">Reference features include one-time reminders, recurring intervals, reminders for other users or roles, and server timezone settings. Timezone must be a valid IANA name, such as Europe/London or Africa/Nairobi.</p></section>'+
   '<div class="panel-actions"><button class="select" id="saveReminderSettings" type="button">Save Reminders</button></div></div>');
  const reminderTierRaw=String(c.tier||'free').toLowerCase();const reminderTier=reminderTierRaw!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':reminderTierRaw;
  if(reminderTier==='free'){['reminderDm','reminderRecurring','reminderMentions'].forEach(key=>{const el=document.getElementById(key);if(el){el.disabled=true;el.title='Premium or Pro required';el.style.opacity='.55';}});const note=document.createElement('p');note.className='plan-locked-inline';note.textContent='🔒 Reminder behaviour settings require Premium or Pro.';body.querySelector('.welcome-message-section:nth-child(2)')?.appendChild(note);}
  document.getElementById('saveReminderSettings').onclick=async()=>{const timezone=val('reminderTimezone').trim()||'UTC';if(!/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(timezone)){alert('Enter a valid IANA timezone, for example Africa/Nairobi.');return;}const max=Math.floor(Number(val('reminderMax'))||25);if(max<1||max>500){alert('Maximum active reminders must be between 1 and 500.');return;}const fresh=await load(id);const result=await save(id,{reminderSettings:{enabled:yes('reminderEnabled'),timezone,channelId:val('reminderChannel').trim()||null,maxPerUser:max,dm:yes('reminderDm'),recurring:yes('reminderRecurring'),allowMentions:yes('reminderMentions')}});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Reminder settings saved.');};
  attachToggle(id,f,c);return;
 }
 if(k==='birthdays'){
  const cfg=c.birthdaySettings||{};
  const dropdowns=await guildDropdownOptions(id);
  body.innerHTML=card('Birthdays','Inspired by BirthdayBot: customize birthday announcements, birthday roles, privacy-friendly messages, timezone and recurring custom events.',switcher(id,f,c)+
   '<div class="welcome-panel">'+
   '<section class="welcome-message-section"><h3>Birthday announcements</h3>'+check('birthdayEnabled','Enable birthday celebrations',cfg.enabled!==false)+guildSelect('birthdayChannel','Birthday announcement channel',dropdowns.channels,cfg.channelId,'Choose a channel')+guildSelect('birthdayRole','Birthday role (optional)',dropdowns.roles,cfg.roleId,'No birthday role')+input('birthdayTimezone','Server timezone (IANA)',cfg.timezone||'UTC')+input('birthdayHour','Announcement hour (0–23)',cfg.hour??9,'number')+'</section>'+
   '<section class="welcome-message-section"><h3>Message and privacy</h3><label class="field">Birthday message<textarea id="birthdayMessage" rows="4" maxlength="1800" placeholder="Happy birthday, {user}! 🎂">'+esc(cfg.message||'Happy birthday, {user}! 🎂')+'</textarea></label>'+check('birthdayPing','Mention the birthday member',cfg.ping!==false)+check('birthdayAge','Allow age to be shown when available',cfg.showAge===true)+check('birthdayTimezoneUser','Use each member timezone when available',cfg.useMemberTimezone===true)+'<p class="mention-help">Supported message placeholder: {user}. Birthdays should not expose a member’s birth year unless the member has chosen to share it.</p></section>'+
   '<section class="welcome-message-section"><h3>Custom events</h3><p class="mention-help">Use one event per line in the format <code>Name | MM-DD | Message</code>. Leave the year out for an annual event, or use <code>YYYY-MM-DD</code> for a one-time event.</p><label class="field">Custom events<textarea id="birthdayEvents" rows="4" maxlength="8000" placeholder="Server anniversary | 04-12 | Happy server anniversary, {server}!">'+esc(cfg.customEventsText||'')+'</textarea></label></section>'+
   '<div class="panel-actions"><button class="select" id="saveBirthdaySettings" type="button">Save Birthdays</button></div></div>');
  const birthdayTierRaw=String(c.tier||'free').toLowerCase();const birthdayTier=birthdayTierRaw!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':birthdayTierRaw;
  if(birthdayTier==='free'){const el=document.getElementById('birthdayEvents');if(el){el.disabled=true;el.title='Premium or Pro required';el.style.opacity='.55';}const note=document.createElement('p');note.className='plan-locked-inline';note.textContent='🔒 Custom birthday events require Premium or Pro.';body.querySelector('.welcome-message-section:nth-child(3)')?.appendChild(note);}
  document.getElementById('saveBirthdaySettings').onclick=async()=>{const timezone=val('birthdayTimezone').trim()||'UTC';if(!/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(timezone)){alert('Enter a valid IANA timezone, for example Africa/Nairobi.');return;}const hour=Number(val('birthdayHour'));if(!Number.isInteger(hour)||hour<0||hour>23){alert('Announcement hour must be a whole number from 0 to 23.');return;}const fresh=await load(id);const result=await save(id,{birthdaySettings:{enabled:yes('birthdayEnabled'),channelId:val('birthdayChannel')||null,roleId:val('birthdayRole')||null,timezone,hour,message:val('birthdayMessage').trim().slice(0,1800)||'Happy birthday, {user}! 🎂',ping:yes('birthdayPing'),showAge:yes('birthdayAge'),useMemberTimezone:yes('birthdayTimezoneUser'),customEventsText:val('birthdayEvents').trim().slice(0,8000)}});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Birthday settings saved.');};
  attachToggle(id,f,c);return;
 }
 if(k==='moderator'){
  const [modCfg,channelResult,roleResult]=await Promise.all([
   api('/api/config/'+encodeURIComponent(id)),
   api('/api/guild/'+encodeURIComponent(id)+'/channels'),
   api('/api/guild/'+encodeURIComponent(id)+'/roles')
  ]);
  const channels=(channelResult.channels||[]).filter(x=>x.type==='text');
  const roles=roleResult.roles||[];
  if(!document.getElementById('moderator-role-picker-styles')){const style=document.createElement('style');style.id='moderator-role-picker-styles';style.textContent=".mod-role-picker{position:relative;display:grid;gap:8px;margin-top:8px}.mod-role-selected{display:flex;flex-wrap:wrap;align-items:center;gap:7px;min-height:48px;padding:9px;border:1px solid var(--border);border-radius:11px;background:var(--surface)}.mod-role-placeholder,.mod-role-empty{font-size:12px;color:var(--muted);padding:5px}.mod-role-chip{display:inline-flex;align-items:center;gap:7px;max-width:100%;padding:5px 7px;border:1px solid color-mix(in srgb,var(--role-colour) 55%,transparent);border-radius:999px;background:color-mix(in srgb,var(--role-colour) 13%,var(--surface));color:var(--text);font-size:11px;font-weight:750}.mod-role-dot{width:9px;height:9px;flex:0 0 9px;border-radius:50%;background:var(--role-colour);box-shadow:0 0 0 2px color-mix(in srgb,var(--role-colour) 17%,transparent)}.mod-role-chip button{display:grid;place-items:center;width:18px;height:18px;border:0;border-radius:50%;background:transparent;color:var(--muted);font-size:15px;line-height:1;cursor:pointer}.mod-role-chip button:hover{background:color-mix(in srgb,var(--role-colour) 20%,transparent);color:var(--text)}.mod-role-dropdown-toggle{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:42px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font:inherit;font-size:12px;text-align:left;cursor:pointer}.mod-role-dropdown-toggle:hover,.mod-role-dropdown-toggle.is-open{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.12)}.mod-role-chevron{transition:transform .15s ease}.mod-role-dropdown-toggle.is-open .mod-role-chevron{transform:rotate(180deg)}.mod-role-dropdown{position:absolute;z-index:30;top:100%;left:0;right:0;max-height:250px;overflow:auto;margin-top:5px;padding:5px;border:1px solid var(--border);border-radius:11px;background:var(--surface);box-shadow:0 14px 35px rgba(0,0,0,.2)}.mod-role-dropdown[hidden]{display:none!important}.mod-role-option{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:var(--text);text-align:left;font:inherit;font-size:12px;cursor:pointer}.mod-role-option:hover{background:var(--surface-2)}.mod-role-option.is-selected{background:color-mix(in srgb,var(--role-colour) 13%,var(--surface))}.mod-role-option-name{min-width:0;flex:1;overflow-wrap:anywhere}.mod-role-option-check{width:18px;height:18px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--role-colour) 55%,var(--border));border-radius:5px;color:var(--role-colour);font-weight:900}.mod-role-option.is-selected .mod-role-option-check{background:color-mix(in srgb,var(--role-colour) 15%,var(--surface))}";document.head.appendChild(style);}
  const selectedRoles=new Set((Array.isArray(modCfg.modRoleIds)?modCfg.modRoleIds:(modCfg.modRoleId||modCfg.moderatorRoleId?[modCfg.modRoleId||modCfg.moderatorRoleId]:[])).map(String));
  const roleColor=r=>{const value=r.color??r.hexColor??r.colorHex??0;if(typeof value==='string'){if(/^#[0-9a-f]{6}$/i.test(value))return value;const n=Number(value);return Number.isFinite(n)&&n>0?'#'+n.toString(16).padStart(6,'0').slice(-6):'#8b5cf6';}return Number(value)>0?'#'+Number(value).toString(16).padStart(6,'0').slice(-6):'#8b5cf6';};
  const roleChip=r=>'<span class="mod-role-chip" data-selected-role="'+esc(r.id)+'" style="--role-colour:'+roleColor(r)+'"><span class="mod-role-dot"></span>'+esc(r.name)+'<button type="button" aria-label="Remove '+esc(r.name)+'" data-remove-role="'+esc(r.id)+'">×</button></span>';
  const selectedRoleChips=()=>roles.filter(r=>selectedRoles.has(String(r.id))).map(roleChip).join('');
  const roleDropdownRows=()=>roles.filter(r=>!r.managed).map(r=>'<button type="button" class="mod-role-option '+(selectedRoles.has(String(r.id))?'is-selected':'')+'" data-toggle-role="'+esc(r.id)+'" style="--role-colour:'+roleColor(r)+'"><span class="mod-role-dot"></span><span class="mod-role-option-name">'+esc(r.name)+'</span><span class="mod-role-option-check">'+(selectedRoles.has(String(r.id))?'✓':'')+'</span></button>').join('');
  const channelSelect=(fieldId,label,current)=>'<label class="field">'+esc(label)+'<select id="'+fieldId+'"><option value="">No channel selected</option>'+channels.map(ch=>'<option value="'+esc(ch.id)+'" '+(String(current||'')===String(ch.id)?'selected':'')+'>'+esc('#'+ch.name)+'</option>').join('')+'</select></label>';
  body.innerHTML=card('Moderation','Configure moderator access, moderation logs, activity logs and strike punishments.', '<div class="welcome-panel moderation-panel">'+
   '<section class="welcome-message-section"><h3>Moderator access</h3><p class="mention-help">Select one or more roles from this server. Click a role to add it; click it again or use × to remove it.</p><div class="mod-role-picker" id="moderatorRolePicker"><div class="mod-role-selected" id="moderatorRoleSelected">'+(selectedRoleChips()||'<span class="mod-role-placeholder">No moderator roles selected</span>')+'</div><button type="button" class="mod-role-dropdown-toggle" id="moderatorRoleDropdownToggle" aria-expanded="false"><span>Choose server roles</span><span class="mod-role-chevron">▾</span></button><div class="mod-role-dropdown" id="moderatorRoleDropdown" hidden>'+(roleDropdownRows()||'<p class="mod-role-empty">No selectable roles found in this server.</p>')+'</div></div><p class="mention-help">Role names use their Discord role colours. Selection is saved for this server.</p></section>'+
   '<section class="welcome-message-section"><h3>Moderation log</h3><p class="mention-help">Record staff actions, targets and reasons in a server channel.</p>'+channelSelect('moderationLogChannel','Moderation log channel',modCfg.modLogChannelId||modCfg.logging?.moderationLogging?.modLogChannel)+check('logWarns','Log warnings',modCfg.logging?.moderationLogging?.logWarns!==false)+check('logKicks','Log kicks',modCfg.logging?.moderationLogging?.logKicks!==false)+check('logBans','Log bans',modCfg.logging?.moderationLogging?.logBans!==false)+check('logMutes','Log mutes and unmutes',modCfg.logging?.moderationLogging?.logMutes!==false)+'</section>'+
   '<section class="welcome-message-section"><h3>Activity logging</h3><p class="mention-help">Choose separate server channels for each type of activity log.</p>'+channelSelect('messageLogChannel','Message edit/delete log channel',modCfg.logging?.messageLogging?.channelId||modCfg.messageLogChannelId)+check('logMessageEdits','Log message edits',modCfg.logging?.messageLogging?.edits!==false)+check('logMessageDeletes','Log message deletions',modCfg.logging?.messageLogging?.deletes!==false)+channelSelect('serverLogChannel','Member join/leave log channel',modCfg.logging?.serverLogging?.channelId||modCfg.serverLogChannelId)+check('logJoins','Log member joins and leaves',modCfg.logging?.serverLogging?.memberJoins!==false)+channelSelect('voiceLogChannel','Voice activity log channel',modCfg.logging?.voiceLogging?.channelId)+check('logVoice','Log voice joins, leaves and moves',modCfg.logging?.voiceLogging?.enabled===true)+'</section>'+
   '<section class="welcome-message-section"><h3>Member verification</h3><p class="mention-help">Set up a dedicated verification channel and the role members receive after they press the Verify button. Configure channel permissions in Discord so unverified members can only see your rules and verification channels.</p>'+check('verificationEnabled','Enable member verification',modCfg.verification?.enabled===true)+channelSelect('verificationChannel','Verification channel',modCfg.verification?.channelId)+'<label class="field">Verification type<select id="verificationMethod">'+[['button','Normal button verification'],['dm_text','Type the text in a DM'],['dm_image','Picture selection in a DM']].map(([v,l])=>'<option value="'+v+'" '+(String(modCfg.verification?.method||'button')===v?'selected':'')+'>'+l+'</option>').join('')+'</select><span class="mention-help">Normal verification stays in the server. DM methods send the challenge privately inside Discord; no browser or external verification page is opened.</span></label>'+channelSelect('verificationLogChannel','Verification & account-age log channel',modCfg.verification?.logChannelId)+ '<p class="mention-help">SPIDEY BOT will send successful verifications, failed attempts, account-age blocks, quarantine actions, role/permission errors and unexpected verification errors to this channel. Choose a private staff channel. Leave empty to disable Discord-channel delivery.</p>'+
   '<label class="field">Verified role<select id="verificationVerifiedRole"><option value="">Choose verified role</option>'+roles.filter(r=>!r.managed).map(r=>'<option value="'+esc(r.id)+'" '+(String(modCfg.verification?.verifiedRoleId||modCfg.verification?.roleId||'')===String(r.id)?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select></label>'+
   '<label class="field">Unverified role (optional)<select id="verificationUnverifiedRole"><option value="">No unverified role</option>'+roles.filter(r=>!r.managed).map(r=>'<option value="'+esc(r.id)+'" '+(String(modCfg.verification?.unverifiedRoleId||'')===String(r.id)?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select></label>'+
   '<label class="field">Verification message<textarea id="verificationMessage" rows="4" maxlength="1800" placeholder="Please read our rules, then click Verify below to unlock the server.">'+esc(modCfg.verification?.message||'Welcome! Please read the server rules, then click Verify below to unlock the rest of the server.')+'</textarea></label>'+
   '<label class="field">Button label<input id="verificationButtonLabel" maxlength="80" value="'+esc(modCfg.verification?.buttonLabel||'Verify')+'" placeholder="Verify"></label>'+
   '<section class="welcome-message-section"><h3>Account age protection</h3><p class="mention-help">Set a minimum Discord account age in days. Newer accounts are assigned your selected quarantine role as soon as they join and cannot verify until they meet the age requirement. Set to 0 to disable this check. This feature only assigns quarantine; it does not kick, ban or mute anyone.</p>'+input('verificationMinimumAccountAgeDays','Minimum account age (days)',modCfg.verification?.minimumAccountAgeDays??0,'number')+'<label class="field">Quarantine role<select id="verificationQuarantineRole"><option value="">Choose quarantine role</option>'+roles.filter(r=>!r.managed).map(r=>'<option value="'+esc(r.id)+'" '+(String(modCfg.verification?.quarantineRoleId||'')===String(r.id)?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select><span class="mention-help">Use a role whose Discord channel permissions restrict access until a moderator clears the member.</span></label><p class="mention-help">Account-age quarantine actions are written to the moderation log when configured. The bot does not automatically remove quarantine or promote the member after the age threshold; a moderator can review them.</p></section>'+
   '<p class="mention-help">When you save with verification enabled, SPIDEY BOT will post or update the verification message in the selected channel. It needs View Channel, Send Messages, Embed Links and Manage Roles, and its bot role must be above the verification and quarantine roles. Set Discord channel permissions so unverified members can only see your rules and verification channels.</p></section>'+
   '<section class="welcome-message-section"><h3>Strike punishment ladder</h3><p class="mention-help">Configure escalation thresholds. Vortex supports None, Mute, Kick, Softban and Ban; timed mute/ban actions can have a duration.</p>'+
   [1,2,3,4,5].map(n=>'<div class="mod-punishment-row"><strong>'+n+' '+(n===1?'strike':'strikes')+'</strong><select id="punishmentAction'+n+'">'+['none','mute','kick','softban','ban'].map(v=>'<option value="'+v+'">'+v.charAt(0).toUpperCase()+v.slice(1)+'</option>').join('')+'</select><input id="punishmentTime'+n+'" placeholder="Duration (optional, e.g. 10m)"></div>').join('')+
   '</section><div class="panel-actions"><button class="select" id="saveModerationSettings" type="button">Save moderation settings</button></div></div>');
  const rolePicker=document.getElementById('moderatorRolePicker');
  if(rolePicker){
   const refreshRolePicker=()=>{
    const selectedHost=document.getElementById('moderatorRoleSelected');
    const dropdown=document.getElementById('moderatorRoleDropdown');
    if(selectedHost)selectedHost.innerHTML=selectedRoleChips()||'<span class="mod-role-placeholder">No moderator roles selected</span>';
    if(dropdown)dropdown.innerHTML=roleDropdownRows()||'<p class="mod-role-empty">No selectable roles found in this server.</p>';
   };
   const toggle=document.getElementById('moderatorRoleDropdownToggle');
   toggle?.addEventListener('click',()=>{const dropdown=document.getElementById('moderatorRoleDropdown');const open=!!dropdown?.hidden;if(dropdown)dropdown.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.classList.toggle('is-open',open);});
   rolePicker.addEventListener('click',event=>{
    const remove=event.target.closest('[data-remove-role]');
    const pick=event.target.closest('[data-toggle-role]');
    const roleId=remove?.dataset.removeRole||pick?.dataset.toggleRole;
    if(!roleId)return;
    event.preventDefault();
    if(selectedRoles.has(String(roleId)))selectedRoles.delete(String(roleId));else selectedRoles.add(String(roleId));
    refreshRolePicker();
   });
   document.addEventListener('click',event=>{if(!rolePicker.contains(event.target)){const dropdown=document.getElementById('moderatorRoleDropdown');if(dropdown)dropdown.hidden=true;toggle?.setAttribute('aria-expanded','false');toggle?.classList.remove('is-open');}});
  }
  document.querySelectorAll('.moderation-panel .field select').forEach(el=>{el.style.display='block';el.style.width='100%';el.style.marginTop='5px';el.style.minHeight='40px';el.style.border='1px solid var(--border)';el.style.borderRadius='10px';el.style.padding='9px 10px';el.style.background='var(--surface)';el.style.color='var(--text)';el.style.font='inherit';el.style.fontSize='12px';});
  const existingPunishments=modCfg.strikePunishments||modCfg.punishments||{};
  [1,2,3,4,5].forEach(n=>{const p=existingPunishments[n]||{};const action=document.getElementById('punishmentAction'+n);if(action)action.value=p.action||'none';const time=document.getElementById('punishmentTime'+n);if(time)time.value=p.time||'';});
  document.getElementById('saveModerationSettings').onclick=async()=>{
   const punishments={};[1,2,3,4,5].forEach(n=>punishments[n]={action:val('punishmentAction'+n)||'none',time:val('punishmentTime'+n).trim()||null});
   const chosenRoles=Array.from(selectedRoles).filter(roleId=>roles.some(role=>String(role.id)===String(roleId)));
   const moderationChannel=val('moderationLogChannel')||null;
   const messageChannel=val('messageLogChannel')||null;
   const serverChannel=val('serverLogChannel')||null;
   const voiceChannel=val('voiceLogChannel')||null;
   const logging={...(modCfg.logging||{}),moderationLogging:{...(modCfg.logging?.moderationLogging||{}),modLogChannel:moderationChannel,logWarns:yes('logWarns'),logKicks:yes('logKicks'),logBans:yes('logBans'),logMutes:yes('logMutes')},messageLogging:{...(modCfg.logging?.messageLogging||{}),channelId:messageChannel,edits:yes('logMessageEdits'),deletes:yes('logMessageDeletes')},serverLogging:{...(modCfg.logging?.serverLogging||{}),channelId:serverChannel,memberJoins:yes('logJoins')},voiceLogging:{...(modCfg.logging?.voiceLogging||{}),channelId:voiceChannel,enabled:yes('logVoice')}};
   const minimumAccountAgeDays=Math.max(0,Math.min(3650,Number(val('verificationMinimumAccountAgeDays'))||0));
   const verification={...(modCfg.verification||{}),enabled:yes('verificationEnabled'),method:['button','dm_text','dm_image'].includes(val('verificationMethod'))?val('verificationMethod'):'button',channelId:val('verificationChannel')||null,logChannelId:val('verificationLogChannel')||null,verifiedRoleId:val('verificationVerifiedRole')||null,roleId:val('verificationVerifiedRole')||null,unverifiedRoleId:val('verificationUnverifiedRole')||null,minimumAccountAgeDays,quarantineRoleId:val('verificationQuarantineRole')||null,message:val('verificationMessage').trim().slice(0,1800)||'Welcome! Please read the server rules, then click Verify below to unlock the rest of the server.',buttonLabel:val('verificationButtonLabel').trim().slice(0,80)||'Verify'};
   if(verification.enabled&&(!verification.channelId||!verification.verifiedRoleId)){alert('Choose a verification channel and a verified role before enabling verification.');return;}
   if(verification.unverifiedRoleId&&verification.unverifiedRoleId===verification.verifiedRoleId){alert('The verified and unverified roles must be different.');return;}
   if(minimumAccountAgeDays>0&&!verification.quarantineRoleId){alert('Choose a quarantine role when the minimum account age is greater than 0 days.');return;}
   if(verification.quarantineRoleId&&(verification.quarantineRoleId===verification.verifiedRoleId||verification.quarantineRoleId===verification.unverifiedRoleId)){alert('The quarantine role must be different from the verified and unverified roles.');return;}
   const saveButton=document.getElementById('saveModerationSettings');
   saveButton.disabled=true;saveButton.textContent='Saving…';
   try{
    const result=await api('/api/config/'+encodeURIComponent(id),{method:'POST',body:JSON.stringify({modRoleIds:chosenRoles,modRoleId:chosenRoles[0]||null,modLogChannelId:moderationChannel,messageLogChannelId:messageChannel,serverLogChannelId:serverChannel,strikePunishments:punishments,punishments,logging,verification})});
    if(result.success!==true)throw new Error(result.error||'Could not save moderation settings');
    if(verification.enabled){
     saveButton.textContent='Publishing verification…';
     const published=await api('/api/verification/'+encodeURIComponent(id)+'/post',{method:'POST',body:JSON.stringify({})});
     if(published.success!==true)throw new Error(published.error||'Settings saved, but the verification message could not be published');
     alert('Moderation settings saved and verification message '+(published.updated?'updated':'posted')+' in Discord.');
    }else{
     alert('Moderation settings saved. Member verification is disabled, so no verification message was posted.');
    }
   }catch(error){
    alert((verification.enabled?'Settings may be saved, but verification could not be published: ':'Could not save moderation settings: ')+(error.message||String(error)));
   }finally{
    saveButton.disabled=false;saveButton.textContent='Save moderation settings';
   }
  };
  return;
 }
 if(k==='audit'){
   const au=c.audit||{},events=Array.isArray(au.entries)?au.entries:[];
   const toggle=(key,label,checked)=>check(key,label,checked!==false);
   const logRows=events.slice(0,100).map(e=>'<article class="audit-entry"><div class="audit-entry-head"><strong>'+esc(e.title||e.type||'Server event')+'</strong><span>'+esc(e.time?new Date(e.time).toLocaleString():'Unknown time')+'</span></div><p>'+esc(e.description||'No additional details')+'</p><small>'+esc([e.actor?'Actor: '+e.actor:'',e.target?'Target: '+e.target:'',e.channel?'Channel: '+e.channel:''].filter(Boolean).join(' · '))+'</small></article>').join('');
   const channelResult=await api('/api/guild/'+encodeURIComponent(id)+'/channels').catch(()=>({channels:[]}));
   const auditChannels=(channelResult.channels||[]).filter(x=>x.type==='text'||x.type==='announcement'||x.type==='news');
   body.innerHTML=card('Audit Log','Track command usage and server activity in this dashboard, with optional delivery to a Discord staff channel.',
    '<div class="welcome-panel audit-panel">'+
    '<section class="welcome-message-section"><h3>Audit log delivery</h3><p class="mention-help">Send audit embeds to a staff-only Discord channel and keep a recent timeline visible here.</p>'+check('auditEnabled','Enable audit logging',au.enabled===true)+check('auditCommandUsage','Log slash command usage',au.commandUsage!==false)+'<label class="field">Discord audit channel<select id="auditChannel">'+optionList(auditChannels,au.channelId||'','Dashboard only (no Discord channel)')+'</select><span class="mention-help">Choose a staff-only text channel to receive command and event logs. Leave empty to keep logs in the dashboard only.</span></label>'+guildMultiSelect('ignoreChannels','Ignored channels',auditChannels,au.ignoreChannelIds||[],'Select channels to exclude from audit logging. Hold Ctrl (Windows) or Command (Mac) to select multiple.')+'</section>'+
    '<section class="welcome-message-section"><h3>Messages</h3>'+toggle('auditMessageDelete','Deleted messages',au.events?.messageDelete)+toggle('auditMessageEdit','Edited messages with before/after text',au.events?.messageUpdate)+toggle('auditBulkDelete','Bulk message deletion',au.events?.messageDeleteBulk)+'</section>'+
    '<section class="welcome-message-section"><h3>Members & moderation</h3>'+toggle('auditMemberJoin','Member joins',au.events?.memberJoin)+toggle('auditMemberLeave','Member leaves',au.events?.memberLeave)+toggle('auditMemberUpdate','Username, nickname and role changes',au.events?.memberUpdate)+toggle('auditBan','Bans and unbans',au.events?.bans)+toggle('auditVoice','Voice joins, leaves, moves and mute/deafen changes',au.events?.voice)+'</section>'+
    '<section class="welcome-message-section"><h3>Server structure</h3>'+toggle('auditChannels','Channel create, update and delete',au.events?.channels)+toggle('auditRoles','Role create, update and delete',au.events?.roles)+toggle('auditGuild','Server name and icon changes',au.events?.guild)+'</section>'+
    '<div class="panel-actions"><button class="select" id="saveAudit" type="button">Save audit settings</button><button class="select" id="refreshAudit" type="button">Refresh timeline</button><button class="select" id="exportAudit" type="button">Export JSON</button></div>'+
    '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Recent activity</h3><p class="mention-help">Up to 100 recent entries are displayed. Command records include command, user, channel and timestamp; sensitive option values are not stored.</p></div></div>'+input('auditSearch','Search by command, user, channel or action','')+'<div class="audit-timeline">'+(logRows||'<p class="mention-help">No audit events recorded yet. Enable audit logging and save settings to start collecting command usage.</p>')+'</div></section></div>');
   const ignoredDropdownSummary=document.getElementById('ignoreChannelsSummary');
    const updateIgnoredChannelSummary=()=>{const count=document.querySelectorAll('[data-channel-option="ignoreChannels"]:checked').length;if(ignoredDropdownSummary)ignoredDropdownSummary.innerHTML=esc(count?count+' channel'+(count===1?'':'s')+' selected':'Choose ignored channels')+' <span aria-hidden="true">▾</span>';};
    document.querySelectorAll('[data-channel-option="ignoreChannels"]').forEach(input=>input.addEventListener('change',updateIgnoredChannelSummary));
    updateIgnoredChannelSummary();
    document.getElementById('auditSearch').addEventListener('input',()=>{const q=val('auditSearch').toLowerCase();document.querySelectorAll('.audit-entry').forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?'':'none';});});
   document.getElementById('saveAudit').onclick=async()=>{
    const eventSettings={...(au.events||{}),messageDelete:yes('auditMessageDelete'),messageUpdate:yes('auditMessageEdit'),messageDeleteBulk:yes('auditBulkDelete'),memberJoin:yes('auditMemberJoin'),memberLeave:yes('auditMemberLeave'),memberUpdate:yes('auditMemberUpdate'),bans:yes('auditBan'),voice:yes('auditVoice'),channels:yes('auditChannels'),roles:yes('auditRoles'),guild:yes('auditGuild')};
    const ignoreChannelIds=Array.from(document.querySelectorAll('[data-channel-option="ignoreChannels"]:checked')).map(option=>option.value).filter(Boolean);
    const result=await save(id,{audit:{...au,enabled:yes('auditEnabled'),commandUsage:yes('auditCommandUsage'),channelId:val('auditChannel').trim()||null,ignoreChannelIds,events:eventSettings}});
    if(result.success===false)throw new Error(result.error||'Could not save audit settings');alert('Audit log settings saved.');
   };
   document.getElementById('refreshAudit').onclick=async()=>{try{const fresh=await load(id);await renderPanel(id,f,fresh);}catch(e){alert('Could not refresh audit timeline: '+e.message);}};
   document.getElementById('exportAudit').onclick=()=>{const blobText=JSON.stringify({guildId:id,exportedAt:new Date().toISOString(),entries:events},null,2);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([blobText],{type:'application/json'}));a.download='spideybot-audit-'+id+'.json';a.click();URL.revokeObjectURL(a.href);};
   return;
  }
  if(k==='automod'){
  const am=c.automod||{},rules=Array.isArray(am.customRules)?am.customRules:[];
  const dropdowns=await guildDropdownOptions(id);
  const ruleText=n=>Array.isArray(rules[n]?.terms)?rules[n].terms.join('\\n'):'';
  const area=(id,label,value,help)=>'<label class="field">'+esc(label)+'<textarea id="'+id+'" rows="4" maxlength="30000" placeholder="One term per line, or separate terms with commas">'+esc(value)+'</textarea><span class="mention-help">'+esc(help)+'</span></label>';
  const pick=(id,label,value)=>'<label class="field">'+esc(label)+'<select id="'+id+'">'+[['delete','Delete message'],['timeout','Delete + timeout'],['alert','Alert only']].map(x=>'<option value="'+x[0]+'" '+(value===x[0]?'selected':'')+'>'+x[1]+'</option>').join('')+'</select></label>';
  const section=(heading,sub,html)=>'<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>'+heading+'</h3><p>'+sub+'</p></div></div>'+html+'</section>';
  body.innerHTML=card('AutoMod protection','Build server rules, choose responses and route alerts to your staff channel.',
   '<div class="welcome-panel">'+
   section('Protection status','Controls are saved to this server configuration.',check('enabled','Enable AutoMod',am.enabled!==false)+check('notifyUser','Privately notify the member after a block',am.notifyUser!==false))+
   section('Keyword filters','Turn on curated categories and add up to three custom rules. Each custom rule accepts up to 1,000 terms.',
    check('presetProfanity','Profanity filter',am.presetProfanity!==false)+check('presetSlurs','Slur filter',!!am.presetSlurs)+check('presetSexual','Explicit sexual-content filter',!!am.presetSexual)+
    area('words','Additional blocked words',Array.isArray(am.words)?am.words.join('\\n'):'','Optional extra terms. Supports line breaks or commas.')+
    area('rule1','Custom rule 1',ruleText(0),'Up to 1,000 terms. Example: server-specific prohibited words.')+
    area('rule2','Custom rule 2',ruleText(1),'Up to 1,000 terms.')+
    area('rule3','Custom rule 3',ruleText(2),'Up to 1,000 terms.'))+
   section('Spam & links','Uses local heuristics and rate limits; no external machine-learning service is configured.',
    check('antiSpam','Detect repeated / rapid messages',am.antiSpam!==false)+input('max','Messages before spam action',am.maxMessages||6,'number')+
    input('window','Detection window (seconds)',Math.round((am.windowMs||8000)/1000),'number')+
    check('antiInvite','Block Discord invite links',am.antiInvite!==false)+check('antiLink','Scan links for suspicious / blocked domains',am.antiLink!==false)+area('blockedDomains','Custom blocked domains',Array.isArray(am.blockedDomains)?am.blockedDomains.join('\\n'):'','One domain per line, such as example.com. Only matching domains will be blocked.')+check('antiDuplicate','Block repeated identical messages',am.antiDuplicate!==false)+
    check('caps','Flag excessive capitalisation',!!am.caps)+check('massMention','Limit mass mentions',am.massMention!==false)+input('maxMentions','Maximum mentions per message (1–50)',Math.min(50,am.maxMentions||5),'number'))+
   section('Member profile screening','Check usernames and server nicknames when members join or update their profile.',
    check('screenUsername','Screen usernames',am.screenUsername!==false)+check('screenNickname','Screen server nicknames',am.screenNickname!==false)+check('screenActionTimeout','Timeout for prohibited profile terms',!!am.screenActionTimeout))+
   section('Automated responses','Choose what happens when a rule is triggered. Timeout requires the bot to have Moderate Members permission.',
    pick('action','Violation action',am.action||'delete')+input('timeoutMinutes','Timeout duration (minutes, 1–40320)',am.timeoutMinutes||10,'number')+
    check('alertStaff','Send staff alert',am.alertStaff!==false)+guildSelect('logChannel','Private staff log channel',dropdowns.channels,am.logChannelId,'Choose a staff log channel')+
    '<p class="mention-help">Use a private channel where only moderators can view AutoMod alerts. The bot needs View Channel and Send Messages permissions.</p>')+
   '<div class="panel-actions"><button class="select" id="saveAutoMod" type="button">Save AutoMod settings</button></div></div>');
  document.getElementById('saveAutoMod').onclick=async()=>{
   const parseTerms=id=>val(id).split(/[\\n,]/).map(x=>x.trim()).filter(Boolean).slice(0,1000);
   const customRules=[1,2,3].map((n)=>({name:'Custom rule '+n,terms:parseTerms('rule'+n)}));
   const patch={automod:{...am,enabled:yes('enabled'),notifyUser:yes('notifyUser'),presetProfanity:yes('presetProfanity'),presetSlurs:yes('presetSlurs'),presetSexual:yes('presetSexual'),words:parseTerms('words'),customRules,
    antiSpam:yes('antiSpam'),maxMessages:Math.max(2,Math.min(30,Number(val('max'))||6)),windowMs:Math.max(1,Math.min(60,Number(val('window'))||8))*1000,
    antiInvite:yes('antiInvite'),antiLink:yes('antiLink'),blockedDomains:parseTerms('blockedDomains'),antiDuplicate:yes('antiDuplicate'),caps:yes('caps'),massMention:yes('massMention'),maxMentions:Math.max(1,Math.min(50,Number(val('maxMentions'))||5)),
    screenUsername:yes('screenUsername'),screenNickname:yes('screenNickname'),screenActionTimeout:yes('screenActionTimeout'),action:val('action'),
    timeoutMinutes:Math.max(1,Math.min(40320,Number(val('timeoutMinutes'))||10)),alertStaff:yes('alertStaff'),logChannelId:val('logChannel')||null}};
   try{const result=await save(id,patch);if(result.success===false)throw new Error(result.error||'Save failed');alert('AutoMod settings saved.');}
   catch(err){alert('Could not save AutoMod settings: '+(err.message||String(err)));}
  };
  attachToggle(id,f,c);return;
 }
 if(k==='levels'){
  const currentLevels=c.levels||{},xpConfig=c['xp-levels']||{},dropdowns=await guildDropdownOptions(id),xpPerMessage=Math.max(1,Number(currentLevels.xpPerMessage||xpConfig.xpPerMessage)||15),xpPerLevel=Math.max(1,Number(currentLevels.xpPerLevel||xpConfig.xpPerLevel)||500),messagesNeeded=Math.ceil(xpPerLevel/xpPerMessage),levelTier=effectiveTier(c),levelRewardLimit=levelTier==='pro'?100:levelTier==='premium'?20:10;
  let roles=[];
  try{const roleResult=await api('/api/guild/'+encodeURIComponent(id)+'/roles');roles=(roleResult.roles||[]).filter(r=>!r.managed);}catch(err){console.warn('Could not load roles for level rewards',err);}
  const existingRewards=xpConfig.levelRoles||c.levelRoles||{};
  let rewardRows=Object.entries(existingRewards).map(([key,roleId])=>({level:Number(String(key).replace(/^level_/,'')||0),roleId})).filter(x=>Number.isInteger(x.level)&&x.level>=1).sort((a,b)=>a.level-b.level);
  const hiddenRewardCount=Math.max(0,rewardRows.length-levelRewardLimit);
  rewardRows=rewardRows.slice(0,levelRewardLimit);
  if(!rewardRows.length)rewardRows=[{level:1,roleId:''}];
  const roleOptions=(selected)=>'<option value="">Choose a reward role</option>'+roles.map(r=>'<option value="'+esc(r.id)+'" '+(String(selected||'')===String(r.id)?'selected':'')+'>'+esc(r.name)+'</option>').join('');
  const renderRewardRows=()=>rewardRows.map((row,index)=>'<div class="rr-mapping-grid level-reward-row" data-level-reward-row="'+index+'"><label class="field">Level reached<input type="number" min="1" max="10000" data-level-reward-level value="'+esc(String(row.level||1))+'"></label><label class="field">Give role<select data-level-reward-role>'+roleOptions(row.roleId)+'</select></label><button type="button" class="level-reward-action level-reward-remove" data-remove-level-reward="'+index+'"><span aria-hidden="true">−</span> Remove</button></div>').join('');
  const rewardsHtml='<div class="panel-section"><div class="plan-tier-notice"><span class="plan-requirement-badge">Free: 10 role rewards</span><span class="plan-requirement-badge">Premium: 20 role rewards</span><span class="plan-requirement-badge">Pro: 100 role rewards</span><p class="muted">Limits apply per server. Your current '+levelTier.toUpperCase()+' plan allows '+levelRewardLimit+' reward rules.</p>'+(hiddenRewardCount?'<p class="muted">'+hiddenRewardCount+' saved reward rule(s) above this plan limit are kept and hidden. They will be available again if this server upgrades.</p>':'')+'</div><div class="welcome-section-heading"><div><h3>Level role rewards</h3><p>Automatically give a role when a member reaches the level. Example: Level 1 → Noobie.</p></div><button type="button" class="level-reward-action level-reward-add" id="addLevelReward" '+(rewardRows.length>=levelRewardLimit?'disabled title="Plan reward limit reached"':'')+'><span aria-hidden="true">＋</span> Add more roles</button></div><div id="levelRewardRows">'+renderRewardRows()+'</div><label class="field">'+check('keepOldLevelRoles','Keep previous level reward roles',c.keepOldLevelRoles!==false)+'</label><p class="muted">Turn this off if members should lose earlier level reward roles when they earn a new one. The bot must have Manage Roles permission and its highest role must be above each reward role.</p></div>';
  body.innerHTML=card(f[1],f[2],switcher(id,f,c)+'<div class="panel-section"><h3>XP progression</h3>'+check('enabled','Enable leveling',currentLevels.enabled!==false)+input('xp','XP earned per eligible message',xpPerMessage,'number')+input('per','XP required per level',xpPerLevel,'number')+input('cooldown','XP cooldown per member (seconds)',currentLevels.xpCooldownSeconds??60,'number')+'<div id="xpEstimate" class="muted">At '+xpPerMessage+' XP per message, it takes about '+messagesNeeded+' eligible messages to earn '+xpPerLevel+' XP.</div></div><div class="panel-section"><h3>Voice chat XP</h3><p class="muted">Award XP while members are connected to an eligible voice channel. Bots and deafened members do not earn voice XP.</p>'+check('voiceXpEnabled','Enable voice chat XP',currentLevels.voiceXpEnabled===true)+input('voiceXpPerInterval','XP earned per voice interval',currentLevels.voiceXpPerInterval??5,'number')+input('voiceXpIntervalMinutes','Voice XP interval (minutes)',currentLevels.voiceXpIntervalMinutes??5,'number')+'</div><div class="panel-section"><h3>Emoji message XP</h3><p class="muted">Award bonus XP for messages containing standard or custom emojis. The per-message cap helps prevent spam farming.</p>'+check('emojiXpEnabled','Enable emoji XP',currentLevels.emojiXpEnabled===true)+input('emojiXpPerMessage','XP per emoji in a message',currentLevels.emojiXpPerMessage??2,'number')+input('maxEmojiXpPerMessage','Maximum emoji XP per message',currentLevels.maxEmojiXpPerMessage??6,'number')+'</div><div class="panel-section"><h3>Level-up log channel</h3><p class="muted">When someone levels up, SPIDEY BOT posts their current XP, level and XP progress in this channel. It does not post every message.</p>'+check('announce','Enable level-up announcements',currentLevels.announce!==false)+guildSelect('channel','Level-up log channel',dropdowns.channels,currentLevels.announceChannel||xpConfig.announcementChannel,'Choose a channel')+'</div>'+rewardsHtml+'<div class="panel-section"><h3>Admin XP editing</h3><p class="muted">Server administrators can use <code>/levels addxp</code>, <code>/levels setxp</code>, <code>/levels removexp</code> and <code>/levels reset</code>. The member’s level is recalculated from their total XP.</p></div><div class="panel-actions">'+button('save','Save levels')+'</div>');
  const updateEstimate=()=>{const xp=Math.max(1,Number(val('xp'))||15),per=Math.max(1,Number(val('per'))||500),needed=Math.ceil(per/xp);const estimate=document.getElementById('xpEstimate');if(estimate)estimate.textContent='At '+xp+' XP per message, it takes about '+needed+' eligible messages to earn '+per+' XP.';};
  document.getElementById('xp').addEventListener('input',updateEstimate);document.getElementById('per').addEventListener('input',updateEstimate);
  const wireRewardButtons=()=>{document.querySelectorAll('[data-remove-level-reward]').forEach(btn=>btn.onclick=()=>{rewardRows.splice(Number(btn.dataset.removeLevelReward),1);if(!rewardRows.length)rewardRows.push({level:1,roleId:''});document.getElementById('levelRewardRows').innerHTML=renderRewardRows();wireRewardButtons();});};
  document.getElementById('addLevelReward').onclick=()=>{rewardRows.push({level:Math.max(1,...rewardRows.map(r=>Number(r.level)||0))+1,roleId:''});document.getElementById('levelRewardRows').innerHTML=renderRewardRows();wireRewardButtons();};
  wireRewardButtons();
  document.getElementById('save').onclick=async()=>{
    const xp=Math.max(1,Math.min(10000,Number(val('xp'))||15)),per=Math.max(1,Math.min(1000000,Number(val('per'))||500)),cooldown=Math.max(0,Math.min(3600,Number(val('cooldown'))||0));
    const levelRoles={};const usedLevels=new Set();
    document.querySelectorAll('.level-reward-row').forEach(row=>{const level=Number(row.querySelector('[data-level-reward-level]').value),roleId=row.querySelector('[data-level-reward-role]').value;if(!Number.isInteger(level)||level<1||level>10000)throw new Error('Each reward level must be a whole number between 1 and 10000.');if(!roleId)return;if(usedLevels.has(level))throw new Error('Each level can only have one reward role.');usedLevels.add(level);levelRoles['level_'+level]=roleId;});
    const voiceXp=Number(val('voiceXpPerInterval')),voiceInterval=Number(val('voiceXpIntervalMinutes')),emojiXp=Number(val('emojiXpPerMessage')),emojiCap=Number(val('maxEmojiXpPerMessage'));
    if(![voiceXp,voiceInterval,emojiXp,emojiCap].every(Number.isFinite)||voiceXp<0||voiceInterval<1||emojiXp<0||emojiCap<0)throw new Error('Voice and emoji XP values must be non-negative, and the voice interval must be at least 1 minute.');
    const xpSources={voiceXpEnabled:yes('voiceXpEnabled'),voiceXpPerInterval:voiceXp,voiceXpIntervalMinutes:voiceInterval,emojiXpEnabled:yes('emojiXpEnabled'),emojiXpPerMessage:emojiXp,maxEmojiXpPerMessage:emojiCap};
    const updatedLevels={...currentLevels,enabled:yes('enabled'),xpPerMessage:xp,xpPerLevel:per,xpCooldownSeconds:cooldown,announce:yes('announce'),announceChannel:val('channel')||null,...xpSources};
    const updatedXpConfig={...xpConfig,xpPerMessage:xp,xpPerLevel:per,xpCooldownSeconds:cooldown,announceLevelUps:yes('announce'),announcementChannel:val('channel')||null,levelRoles,...xpSources};
    const result=await save(id,{levels:updatedLevels,'xp-levels':updatedXpConfig,keepOldLevelRoles:yes('keepOldLevelRoles')});
    if(result?.success===false)throw new Error(result.error||'Save failed');alert('Levels and level role rewards saved.');
  };
  attachToggle(id,f,c);return;
}
if(k==='achievements'){
  const a=c.achievements||{};
  const achTierRaw=String(c.tier||'free').toLowerCase();
  const achTier=achTierRaw!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':achTierRaw;
  const achPaid=achTier==='premium'||achTier==='pro';
  const messageMilestoneLimit=achTier==='pro'?Infinity:achTier==='premium'?15:8;
  const emojiMilestoneLimit=messageMilestoneLimit;
  const messages=Array.isArray(a.messages)?a.messages:[];
  const emojis=Array.isArray(a.emojis)?a.emojis:[];
  const [channelResult,roleResult]=await Promise.all([api('/api/guild/'+encodeURIComponent(id)+'/channels'),api('/api/guild/'+encodeURIComponent(id)+'/roles')]);
  const channels=(channelResult.channels||[]).filter(x=>x.type==='text'),roles=(roleResult.roles||[]).filter(x=>!x.managed);
  const renderRows=(prefix,entries,defaults)=>'<div id="'+prefix+'ThresholdRows">'+(entries.length?entries:[{threshold:defaults[0],roleId:''}]).map((entry,i)=>'<div class="rr-mapping-grid milestone-threshold-row" data-milestone-row="'+prefix+'"><label class="field">Threshold '+(i+1)+'<input type="number" min="1" max="100000000" value="'+esc(entry.threshold??defaults[i]??'')+'"></label><label class="field">Reward role<select>'+optionList(roles,entry.roleId||'','Choose a reward role')+'</select></label></div>').join('')+'</div>';
  const section=(prefix,label,entries,defaults)=>'<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>'+label+'</h3><p>'+entries.length+' / '+(prefix==='msg'?messageMilestoneLimit:emojiMilestoneLimit)+' milestones used on the '+esc(achTier.toUpperCase())+' plan. Each threshold can award a different role.</p></div></div>'+renderRows(prefix,entries,defaults)+'<div class="milestone-threshold-actions"><button type="button" class="level-reward-action level-reward-add" data-add-milestone="'+prefix+'"><span aria-hidden="true">＋</span> Add threshold</button><button type="button" class="level-reward-action level-reward-remove" data-remove-last-milestone="'+prefix+'"><span aria-hidden="true">−</span> Remove</button></div></section>';
  body.innerHTML=card('Achievements & milestones','Track message and emoji milestones independently from XP. SQLite stores lifetime totals separately for each member and server.',
   '<div class="welcome-panel">'+check('achEnabled','Enable milestone tracking',a.enabled!==false)+section('msg','Message milestones',messages,[10,100])+section('emoji','Emoji milestones',emojis,[5,50])+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Milestone announcements</h3><p>Post a congratulatory message when a member earns a configured milestone role.</p></div></div><label class="field">Announcement channel<select id="achChannel">'+optionList(channels,a.announcementChannelId||'','Choose a text channel')+'</select></label>'+check('achAnnounce','Send milestone congratulations',a.announce!==false)+'</section>'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Member statistics</h3><p>Members can run <code>/stats</code> to view their total messages and emoji usage. Counts are not XP and are never reset by leveling changes.</p></div></div><p class="mention-help">Emoji tracking includes Unicode emoji and custom Discord emoji. The bot needs Manage Roles and its highest role must be above each reward role.</p></section><div class="panel-actions">'+button('saveAchievements','Save achievements')+'</div></div>');
  const addRow=(prefix)=>{
   const container=document.getElementById(prefix+'ThresholdRows'),row=document.createElement('div');
   row.className='rr-mapping-grid milestone-threshold-row';row.dataset.milestoneRow=prefix;
   row.innerHTML='<label class="field">Threshold '+(container.children.length+1)+'<input type="number" min="1" max="100000000" value=""></label><label class="field">Reward role<select>'+optionList(roles,'','Choose a reward role')+'</select></label>';
   container.appendChild(row);bindButtons();
  };
  const bindButtons=()=>{
   body.querySelectorAll('[data-add-milestone]').forEach(btn=>btn.onclick=()=>{const prefix=btn.dataset.addMilestone;const limit=prefix==='msg'?messageMilestoneLimit:emojiMilestoneLimit;if(document.getElementById(prefix+'ThresholdRows').children.length>=limit){alert('This server has reached its '+limit+' milestone limit for the '+achTier.toUpperCase()+' plan.');return;}addRow(prefix);});
   body.querySelectorAll('[data-remove-last-milestone]').forEach(btn=>btn.onclick=()=>{const prefix=btn.dataset.removeLastMilestone,container=document.getElementById(prefix+'ThresholdRows');if(container.children.length<=1){alert('Keep at least one row. You can leave it empty if you do not need that reward.');return;}container.lastElementChild.remove();Array.from(container.children).forEach((row,i)=>{row.querySelector('.field').childNodes[0].textContent='Threshold '+(i+1);});});
  };
  bindButtons();
  if(!achPaid){['achChannel','achAnnounce'].forEach(key=>{const el=document.getElementById(key);if(el){el.disabled=true;el.title='Premium or Pro required for custom milestone announcements';el.style.opacity='.55';}});const note=document.createElement('p');note.className='plan-locked-inline';note.textContent='Free servers announce achievements in the channel where the milestone was reached. Custom announcement channels require Premium or Pro.';body.querySelector('.welcome-message-section:nth-of-type(3)')?.appendChild(note);}
  document.getElementById('saveAchievements').onclick=async()=>{
   const rows=prefix=>Array.from(document.getElementById(prefix+'ThresholdRows').querySelectorAll('[data-milestone-row]')).map(row=>({threshold:Math.max(1,Math.min(100000000,Number(row.querySelector('input')?.value)||1)),roleId:row.querySelector('select')?.value||null})).filter(x=>x.roleId);
   const result=await save(id,{achievements:{...a,enabled:yes('achEnabled'),messages:rows('msg'),emojis:rows('emoji'),announcementChannelId:val('achChannel')||null,announce:yes('achAnnounce')}});
   if(result?.success===false)throw new Error(result.error||'Save failed');alert('Achievement milestone settings saved.');
  };
  attachToggle(id,f,c);return;
 }
 if(k==='inviteTracker'){
  const it=c.inviteTracker||{};
  const inviteTierRaw=String(c.tier||'free').toLowerCase();
  const inviteTier=inviteTierRaw!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':inviteTierRaw;
  const inviteLimit=inviteTier==='pro'?100:inviteTier==='premium'?20:10;
  const rewards=Array.isArray(it.rewards)?it.rewards:[];
  const dropdowns=await guildDropdownOptions(id);
  body.innerHTML=card('Invite Tracker','Track which members invite people, show invite totals and leaderboards, log joins and leaves, and optionally reward invite milestones.', 
   '<div class="welcome-panel">'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Tracking settings</h3><p>Invite attribution requires the bot to have permission to view server invites.</p></div></div>'+
   check('itEnabled','Enable invite tracking',it.enabled!==false)+
   check('itLogJoins','Log successful invite joins',it.logJoins!==false)+
   check('itLogLeaves','Log when invited members leave',it.logLeaves!==false)+
   check('itRewardRoles','Automatically assign invite milestone roles',it.rewardRolesEnabled===true)+
   check('itFraudDetection','Flag suspicious invite joins',it.fraudDetectionEnabled===true)+
   input('itMinimumAge','Flag accounts younger than (hours)',it.minimumAccountAgeHours??24,'number')+
   input('itRapidThreshold','Flag join bursts at this member count',it.rapidJoinThreshold??5,'number')+
   input('itRapidWindow','Join burst window (seconds)',it.rapidJoinWindowSeconds??60,'number')+
   check('itBlockFraudRewards','Do not award roles for flagged joins',it.blockRewardsForFlagged!==false)+
   guildSelect('itLogChannel','Invite log channel',dropdowns.channels,it.logChannelId,'Choose an invite log channel')+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Invite milestone rewards</h3><p>'+rewards.length+' of '+inviteLimit+' rewards used on the '+esc(inviteTier.toUpperCase())+' plan.</p></div></div><div id="itRewardRows">'+(rewards.length?rewards:[{threshold:5,roleId:''},{threshold:10,roleId:''}]).map((reward,i)=>'<div class="rr-mapping-grid invite-reward-row" data-invite-reward-row><label class="field">Invite threshold<input type="number" min="1" max="100000000" value="'+esc(reward.threshold??'')+'"></label><label class="field">Reward role<select>'+optionList(dropdowns.roles,reward.roleId||'','Choose reward role')+'</select></label></div>').join('')+'</div><div class="invite-reward-actions"><button type="button" class="level-reward-action level-reward-add invite-reward-action" id="addInviteReward"><span aria-hidden="true">＋</span> Add reward</button><button type="button" class="level-reward-action level-reward-remove invite-reward-action" id="removeInviteReward"><span aria-hidden="true">−</span> Remove</button></div></section>'+
   '<p class="mention-help">Available commands: <code>/invites stats</code>, <code>/invites leaderboard</code>. Admins can also add, remove or reset invite counts. Fraud flags are heuristic warnings, not proof of abuse. Make sure the bot role is above any reward roles.</p>'+
   '<div class="panel-actions"><button class="select" id="saveInviteTracker" type="button">Save invite tracker</button></div></section></div>');
  const rewardContainer=document.getElementById('itRewardRows');
  document.getElementById('addInviteReward').onclick=()=>{if(rewardContainer.children.length>=inviteLimit){alert('This server has reached its '+inviteLimit+' invite milestone reward limit for the '+inviteTier.toUpperCase()+' plan.');return;}const row=document.createElement('div');row.className='rr-mapping-grid invite-reward-row';row.setAttribute('data-invite-reward-row','');row.innerHTML='<label class="field">Invite threshold<input type="number" min="1" max="100000000" value=""></label><label class="field">Reward role<select>'+optionList(dropdowns.roles,'','Choose reward role')+'</select></label>';rewardContainer.appendChild(row);};
  document.getElementById('removeInviteReward').onclick=()=>{if(rewardContainer.children.length<=1){alert('Keep at least one reward row.');return;}rewardContainer.lastElementChild.remove();};
  document.getElementById('saveInviteTracker').onclick=async()=>{
   const rewards=Array.from(rewardContainer.querySelectorAll('[data-invite-reward-row]')).map(row=>({threshold:Number(row.querySelector('input')?.value),roleId:row.querySelector('select')?.value||''})).filter(x=>x.roleId&&Number.isInteger(x.threshold)&&x.threshold>0&&x.threshold<=100000000);
   const minimumAccountAgeHours=Number(val('itMinimumAge')),rapidJoinThreshold=Number(val('itRapidThreshold')),rapidJoinWindowSeconds=Number(val('itRapidWindow'));if(!Number.isFinite(minimumAccountAgeHours)||minimumAccountAgeHours<0||minimumAccountAgeHours>8760||!Number.isInteger(rapidJoinThreshold)||rapidJoinThreshold<2||rapidJoinThreshold>100||!Number.isInteger(rapidJoinWindowSeconds)||rapidJoinWindowSeconds<10||rapidJoinWindowSeconds>3600){alert('Check fraud detection thresholds. Account age must be 0–8760 hours, join count 2–100 and window 10–3600 seconds.');return;}const next={...it,enabled:yes('itEnabled'),logJoins:yes('itLogJoins'),logLeaves:yes('itLogLeaves'),rewardRolesEnabled:yes('itRewardRoles'),fraudDetectionEnabled:yes('itFraudDetection'),minimumAccountAgeHours,rapidJoinThreshold,rapidJoinWindowSeconds,blockRewardsForFlagged:yes('itBlockFraudRewards'),logChannelId:val('itLogChannel')||null,rewards};
   try{const result=await save(id,{inviteTracker:next});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Invite tracker settings saved.');await renderPanel(id,f,await load(id));}
   catch(err){alert('Could not save invite tracker settings: '+(err.message||String(err)));}
  };
  attachToggle(id,f,c);return;
 }
 if(k==='customCommands'){
  const cc=c.customCommands||{items:[]};
  const customTierRaw=String(c.tier||'free').toLowerCase();
  const customTier=customTierRaw!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':customTierRaw;
  const customLimit=customTier==='pro'?100:customTier==='premium'?25:5;
  const items=Array.isArray(cc.items)?cc.items:[];
  const commandRows=items.map((x,index)=>{const locked=index>=customLimit;const lockAttr=locked?' disabled':'';return '<section class="welcome-message-section '+(locked?'custom-command-locked':'')+'" style="'+(locked?'opacity:.58':'')+'"><div class="welcome-section-heading"><div><h3>/'+esc(x.name)+(locked?' 🔒':'')+'</h3><p>'+(locked?'Locked on '+esc(customTier.toUpperCase())+' — upgrade to unlock':(x.enabled===false?'Disabled':'Enabled')+' · Used '+Number(x.count||0)+' times')+'</p></div><button type="button" class="rr-remove" data-remove-custom="'+index+'"'+lockAttr+'>Remove</button></div><label class="field">Response template<textarea data-custom-message="'+index+'" rows="3" maxlength="1800"'+lockAttr+'>'+esc(x.messageTemplate||'')+'</textarea></label><label class="field">Counter label<input data-custom-counter-label="'+index+'" maxlength="80" value="'+esc(x.counterLabel||'Count')+'"'+lockAttr+'></label><label class="check"><span>Increment counter and show {count}</span><input data-custom-counter="'+index+'" type="checkbox" '+(x.counterEnabled===false?'':'checked')+lockAttr+'></label><label class="check"><span>Command enabled</span><input data-custom-enabled="'+index+'" type="checkbox" '+(x.enabled===false?'':'checked')+lockAttr+'></label><div class="panel-actions"><button class="select" type="button" data-save-custom="'+index+'"'+lockAttr+'>Save changes</button><button class="select" type="button" data-reset-custom="'+index+'"'+lockAttr+'>Reset counter</button></div></section>';}).join('');
  body.innerHTML=card('Custom Commands','Build real server slash commands such as /kill. Each use increments a saved counter and inserts it into your custom response text.',
   '<div class="welcome-panel"><section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Create a command</h3><p>'+items.length+' of '+customLimit+' custom commands used on the '+esc(customTier.toUpperCase())+' plan. Use lowercase letters, numbers and hyphens only.</p></div></div>'+
   input('ccName','Command name (example: kill)','')+
   '<label class="field">Response text<textarea id="ccMessage" rows="4" maxlength="1800" placeholder="Ohh, killed! Total kills: {count}"></textarea></label>'+
   check('ccCounter','Increment and show a counter',true)+
   input('ccCounterLabel','Counter label (optional)','Total kills')+
   check('ccEnabled','Enable this command immediately',true)+
   '<p class="mention-help">Template variables: <code>{count}</code> = use count, <code>{user}</code> = member mention, <code>{username}</code> = member name, <code>{server}</code> = server name. Example: <code>Ohh killed you — {count}</code>.</p>'+
   '<div class="panel-actions"><button class="select" id="createCustomCommand" type="button">Create slash command</button></div></section>'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Your custom commands</h3><p>Commands are server-specific. New slash commands can take up to a minute to appear in Discord.</p></div></div>'+
   (commandRows||'<p class="mention-help">No custom commands created yet.</p>')+'</section></div>');
  document.getElementById('createCustomCommand').onclick=async()=>{
   const name=val('ccName').trim().toLowerCase().replace(/^\/+/,''),messageTemplate=val('ccMessage').trim();
   if(!/^[a-z0-9-]{1,32}$/.test(name)){alert('Enter a command name using 1–32 lowercase letters, numbers or hyphens.');return;}
   if(!messageTemplate){alert('Enter the response text for this command.');return;}
   if(items.some(x=>x.name===name)){alert('That custom command already exists.');return;}
   if(items.length>=customLimit){alert('This server has reached its '+customLimit+' custom command limit for the '+customTier.toUpperCase()+' plan.');return;}
   const next={...cc,items:[...items,{name,messageTemplate,counterEnabled:yes('ccCounter'),counterLabel:val('ccCounterLabel').trim(),enabled:yes('ccEnabled'),count:0}]};
   try{const result=await save(id,{customCommands:next});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Custom command saved. Discord may take up to a minute to register /'+name+'.');await renderPanel(id,f,await load(id));}
   catch(err){alert('Could not save custom command: '+(err.message||String(err)));}
  };
  document.querySelectorAll('[data-save-custom]').forEach(btn=>btn.addEventListener('click',async()=>{const index=Number(btn.dataset.saveCustom),messageTemplate=document.querySelector('[data-custom-message="'+index+'"]')?.value.trim()||'';if(!messageTemplate){alert('Enter response text before saving.');return;}if(messageTemplate.length>1800){alert('Response text must be 1,800 characters or fewer.');return;}const nextItems=items.map((x,i)=>i===index?{...x,messageTemplate,counterLabel:document.querySelector('[data-custom-counter-label="'+index+'"]')?.value.trim()||'Count',counterEnabled:!!document.querySelector('[data-custom-counter="'+index+'"]')?.checked,enabled:!!document.querySelector('[data-custom-enabled="'+index+'"]')?.checked}:x);try{const result=await save(id,{customCommands:{...cc,items:nextItems}});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Updated /'+nextItems[index].name+'.');await renderPanel(id,f,await load(id));}catch(err){alert('Could not update command: '+err.message);}}));
  document.querySelectorAll('[data-reset-custom]').forEach(btn=>btn.addEventListener('click',async()=>{const index=Number(btn.dataset.resetCustom);if(!confirm('Reset the saved counter for /'+items[index].name+' to zero?'))return;const nextItems=items.map((x,i)=>i===index?{...x,count:0}:x);try{const result=await save(id,{customCommands:{...cc,items:nextItems}});if(result?.success===false)throw new Error(result.error||'Save failed');await renderPanel(id,f,await load(id));}catch(err){alert('Could not reset counter: '+err.message);}}));
  document.querySelectorAll('[data-remove-custom]').forEach(btn=>btn.addEventListener('click',async()=>{const index=Number(btn.dataset.removeCustom);if(!confirm('Remove this custom slash command?'))return;const next={...cc,items:items.filter((_,i)=>i!==index)};try{const result=await save(id,{customCommands:next});if(result?.success===false)throw new Error(result.error||'Save failed');await renderPanel(id,f,await load(id));}catch(err){alert('Could not remove command: '+err.message);}}));
  attachToggle(id,f,c);return;
 }
 if(k==='economy'){body.innerHTML=card(f[1],f[2],switcher(id,f,c)+check('enabled','Enable economy',c.economy?.enabled!==false)+input('currency','Currency name',c.economy?.currency||'Web Fluid')+input('daily','Daily reward',c.economy?.daily||100,'number')+input('min','Work minimum',c.economy?.workMin||20,'number')+input('max','Work maximum',c.economy?.workMax||60,'number')+'<div class="panel-actions">'+button('save','Save economy')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{economy:{...(c.economy||{}),enabled:yes('enabled'),currency:val('currency')||'Web Fluid',daily:Number(val('daily'))||100,workMin:Number(val('min'))||20,workMax:Number(val('max'))||60}});alert('Economy saved.');};attachToggle(id,f,c);return;}
 if(k==='emojis'){
  const loadEmojiList=async()=>{const r=await api('/api/guild/'+encodeURIComponent(id)+'/emojis');return r.emojis||[];};
  let emojis=await loadEmojiList();
  const rows=()=>emojis.map(e=>'<article class="rr-entry"><div style="display:flex;align-items:center;gap:12px;min-width:0"><img src="'+esc(e.url)+'" alt="'+esc(e.name)+'" width="36" height="36" style="object-fit:contain"><div><strong>:'+esc(e.name)+':</strong><p>'+esc(e.animated?'Animated':'Static')+' · '+esc(e.id)+'</p></div></div><button class="rr-remove" type="button" data-delete-emoji="'+esc(e.id)+'">Delete</button></article>').join('');
  const render=()=>{const root=document.getElementById('serverEmojiList');if(root)root.innerHTML=rows()||'<p class="mention-help">No custom emojis were found in this server.</p>';document.querySelectorAll('[data-delete-emoji]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Delete this emoji from the Discord server? This affects everyone in the server.'))return;try{await api('/api/guild/'+encodeURIComponent(id)+'/emojis/'+encodeURIComponent(btn.dataset.deleteEmoji),{method:'DELETE'});emojis=emojis.filter(e=>e.id!==btn.dataset.deleteEmoji);render();alert('Emoji deleted from Discord.');}catch(err){alert('Could not delete emoji: '+err.message);}});};
  body.innerHTML=card('Server Emojis','View the custom emojis currently in the connected Discord server and add new ones directly to that server. Changes are immediately reflected in Discord and this list.','<div class="welcome-panel"><section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Add a server emoji</h3><p>Upload a PNG, JPG, GIF or WebP image. Discord permissions and the server emoji limit still apply.</p></div></div><label class="field">Emoji name<input id="newEmojiName" maxlength="32" placeholder="e.g. spidey_wave"></label><label class="field">Image file<input id="newEmojiFile" type="file" accept="image/png,image/jpeg,image/gif,image/webp"></label><p class="mention-help">Use 2–32 letters, numbers or underscores. The bot needs Manage Expressions and must not exceed the server emoji limit.</p><div class="panel-actions"><button class="select" id="uploadServerEmoji" type="button">Add emoji to Discord</button><button class="select" id="refreshServerEmojis" type="button">Refresh list</button></div></section><section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Connected server emojis</h3><p id="serverEmojiCount">'+emojis.length+' custom emojis</p></div></div><div id="serverEmojiList"></div></section></div>');
  render();
  document.getElementById('refreshServerEmojis').onclick=async()=>{try{emojis=await loadEmojiList();document.getElementById('serverEmojiCount').textContent=emojis.length+' custom emojis';render();}catch(err){alert('Could not refresh server emojis: '+err.message);}};
  document.getElementById('uploadServerEmoji').onclick=async()=>{const name=val('newEmojiName').trim(),file=document.getElementById('newEmojiFile').files?.[0];if(!/^[A-Za-z0-9_]{2,32}$/.test(name)){alert('Emoji names must be 2–32 letters, numbers or underscores.');return;}if(!file){alert('Choose an image file first.');return;}if(!/^image\/(png|jpeg|gif|webp)$/.test(file.type)){alert('Choose a PNG, JPG, GIF or WebP image.');return;}if(file.size>256*1024){alert('Choose an image under 256 KB.');return;}const reader=new FileReader();reader.onerror=()=>alert('Could not read that image file.');reader.onload=async()=>{try{const result=await api('/api/guild/'+encodeURIComponent(id)+'/emojis',{method:'POST',body:JSON.stringify({name,image:reader.result})});emojis=await loadEmojiList();document.getElementById('serverEmojiCount').textContent=emojis.length+' custom emojis';render();document.getElementById('newEmojiName').value='';document.getElementById('newEmojiFile').value='';alert('Added :'+name+': to Discord.');}catch(err){alert('Could not add emoji: '+err.message);}};reader.readAsDataURL(file);};
  attachToggle(id,f,c);return;
 }
 if(k==='polls'){
  const p=c.polls||{},channelsResult=await api('/api/guild/'+encodeURIComponent(id)+'/channels').catch(()=>({channels:[]}));
  const channels=(channelsResult.channels||[]).filter(ch=>ch.type==='text');
  body.innerHTML=card('Polls','Poll creation and voting inspired by Discord-Poll-Bot: multiple options, button voting, anonymous public results and poll management.','<div class="welcome-panel"><section class="welcome-message-section"><h3>Poll defaults</h3><p class="mention-help">These settings are used by SPIDEY BOT poll commands. Polls use buttons so members can vote without adding reactions.</p>'+check('pollEnabled','Enable polls',p.enabled!==false)+'<label class="field">Default poll channel<select id="pollChannel">'+optionList(channels,p.defaultChannelId||'','Use command channel')+'</select></label>'+check('pollAnonymous','Do not show who voted publicly',p.anonymous!==false)+check('pollMultiple','Allow members to select multiple options',p.allowMultipleVotes===true)+input('pollMaxOptions','Maximum options per poll (2–20)',Math.min(20,Math.max(2,Number(p.maxOptions)||20)),'number')+input('pollDuration','Default duration in minutes (0 = no expiry)',Math.max(0,Number(p.defaultDurationMinutes)||0),'number')+check('pollAdminDelete','Only admins can delete polls',p.adminDelete!==false)+'<p class="mention-help">Use <code>/fun poll</code> with a question and comma-separated options. Polls without an expiry stay open until deleted. Members can change their vote; when multi-vote is enabled, they can select multiple options.</p><div class="panel-actions"><button class="select" id="savePollSettings" type="button">Save poll settings</button></div></section></div>');
  document.getElementById('savePollSettings').onclick=async()=>{const maxOptions=Number(val('pollMaxOptions')),defaultDurationMinutes=Number(val('pollDuration'));if(!Number.isInteger(maxOptions)||maxOptions<2||maxOptions>20){alert('Maximum options must be between 2 and 20.');return;}if(!Number.isFinite(defaultDurationMinutes)||defaultDurationMinutes<0||defaultDurationMinutes>525600){alert('Duration must be between 0 and 525600 minutes.');return;}const next={...p,enabled:yes('pollEnabled'),defaultChannelId:val('pollChannel')||null,anonymous:yes('pollAnonymous'),allowMultipleVotes:yes('pollMultiple'),maxOptions,defaultDurationMinutes,adminDelete:yes('pollAdminDelete')};try{const result=await save(id,{polls:next});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Poll settings saved.');await renderPanel(id,f,await load(id));}catch(err){alert('Could not save poll settings: '+err.message);}};
  attachToggle(id,f,c);return;
 }
 if(k==='ticketing'){
  const t=c.tickets||{},questions=Array.isArray(t.questions)?t.questions:[];
  const [channelResult,roleResult]=await Promise.all([api('/api/guild/'+encodeURIComponent(id)+'/channels'),api('/api/guild/'+encodeURIComponent(id)+'/roles')]);
  const channels=channelResult.channels||[],roles=(roleResult.roles||[]).filter(x=>!x.managed);
  const textChannels=channels.filter(x=>x.type==='text');
  const categories=channels.filter(x=>x.type==='category');
  const channelSelect=(field,label,value,items,placeholder)=>'<label class="field">'+label+'<select id="'+field+'">'+optionList(items,value||'',placeholder)+'</select></label>';
  body.innerHTML=card('Ticketing','Configure a complete support workflow inspired by Open Ticket: ticket panels, private channels, staff access, claims, close/reopen controls, logs and transcripts.', 
   '<div class="welcome-panel">'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Core settings</h3><p>These settings control ticket creation and who can access each ticket.</p></div></div>'+
   check('ticketEnabled','Enable ticketing',t.enabled!==false)+
   channelSelect('ticketPanelChannel','Ticket panel channel',t.ticketChannelId,textChannels,'Choose panel channel')+
   channelSelect('ticketCategory','Open ticket category',t.categoryId,categories,'Choose category')+
   channelSelect('ticketSupportRole','Support staff role',t.supportRoleId,roles,'Choose support role')+
   channelSelect('ticketLogChannel','Ticket event log channel',t.logChannelId,textChannels,'Choose log channel')+
   channelSelect('ticketTranscriptChannel','Transcript delivery channel',t.transcriptChannelId||t.logChannelId,textChannels,'Choose transcript channel')+
   input('ticketPrefix','Ticket channel prefix',t.ticketPrefix||'ticket')+
   input('ticketMaxOpen','Maximum open tickets per member',t.maxTicketsPerUser??1,'number')+
   '</section>'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Panel appearance</h3><p>Customize the message members click to open a support ticket.</p></div></div>'+
   input('ticketPanelTitle','Panel title',t.panelTitle||'Need help? Open a ticket')+
   '<label class="field">Panel description<textarea id="ticketPanelDescription" rows="3" maxlength="3500">'+esc(t.panelDescription||'Select the button below to contact our support team.')+'</textarea></label>'+
   input('ticketButtonLabel','Open button label',t.buttonLabel||'Create Ticket')+
   input('ticketWelcome','First message inside the ticket',t.welcomeMessage||'Hello {user}, please describe your issue and a staff member will be with you shortly.')+
   '</section>'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Ticket questions</h3><p>Optional questions appear in a Discord modal before a ticket is created. Leave a field blank to skip it.</p></div></div>'+
   input('ticketQ1','Question 1',questions[0]||'What do you need help with?')+
   input('ticketQ2','Question 2 (optional)',questions[1]||'')+
   input('ticketQ3','Question 3 (optional)',questions[2]||'')+
   '</section>'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Ticket workflow</h3><p>Choose how tickets are handled after they are opened.</p></div></div>'+
   check('ticketUserClose','Allow ticket owners to close their tickets',t.allowUserClose!==false)+
   check('ticketClaim','Show staff claim button',t.claimEnabled!==false)+
   check('ticketReopen','Allow staff to reopen closed tickets',t.allowReopen!==false)+
   check('ticketTranscript','Save and deliver a transcript on close',t.transcriptsEnabled!==false)+
   input('ticketAutoClose','Auto-close inactive tickets after hours (0 = off)',t.autoCloseHours||0,'number')+
   '<p class="mention-help">The bot needs Manage Channels, View Channel, Send Messages, Read Message History and Manage Roles/permissions as appropriate. Its role must be high enough to apply the configured overwrites.</p>'+
   '</section>'+
   '<div class="panel-actions"><button class="select" id="saveTicketing" type="button">Save ticket settings</button><button class="select" id="publishTicketPanel" type="button">Publish / refresh panel</button></div></div>');
  document.getElementById('saveTicketing').onclick=async()=>{
   const next={...t,enabled:yes('ticketEnabled'),ticketChannelId:val('ticketPanelChannel')||null,categoryId:val('ticketCategory')||null,supportRoleId:val('ticketSupportRole')||null,logChannelId:val('ticketLogChannel')||null,transcriptChannelId:val('ticketTranscriptChannel')||null,ticketPrefix:(val('ticketPrefix').trim().toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,20)||'ticket'),maxTicketsPerUser:Math.max(1,Math.min(10,Number(val('ticketMaxOpen'))||1)),panelTitle:val('ticketPanelTitle').trim().slice(0,256)||'Need help? Open a ticket',panelDescription:val('ticketPanelDescription').trim().slice(0,3500),buttonLabel:val('ticketButtonLabel').trim().slice(0,80)||'Create Ticket',welcomeMessage:val('ticketWelcome').trim().slice(0,1800)||'Hello {user}, please describe your issue and a staff member will be with you shortly.',questions:[val('ticketQ1').trim(),val('ticketQ2').trim(),val('ticketQ3').trim()].filter(Boolean).slice(0,5),allowUserClose:yes('ticketUserClose'),claimEnabled:yes('ticketClaim'),allowReopen:yes('ticketReopen'),transcriptsEnabled:yes('ticketTranscript'),autoCloseHours:Math.max(0,Math.min(8760,Number(val('ticketAutoClose'))||0))};
   const result=await save(id,{tickets:next});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Ticket settings saved.');
  };
  document.getElementById('publishTicketPanel').onclick=async()=>{
   const next={...t,enabled:yes('ticketEnabled'),ticketChannelId:val('ticketPanelChannel')||null,categoryId:val('ticketCategory')||null,supportRoleId:val('ticketSupportRole')||null,logChannelId:val('ticketLogChannel')||null,transcriptChannelId:val('ticketTranscriptChannel')||null,ticketPrefix:(val('ticketPrefix').trim().toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,20)||'ticket'),maxTicketsPerUser:Math.max(1,Math.min(10,Number(val('ticketMaxOpen'))||1)),panelTitle:val('ticketPanelTitle').trim().slice(0,256)||'Need help? Open a ticket',panelDescription:val('ticketPanelDescription').trim().slice(0,3500),buttonLabel:val('ticketButtonLabel').trim().slice(0,80)||'Create Ticket',welcomeMessage:val('ticketWelcome').trim().slice(0,1800),questions:[val('ticketQ1').trim(),val('ticketQ2').trim(),val('ticketQ3').trim()].filter(Boolean).slice(0,5),allowUserClose:yes('ticketUserClose'),claimEnabled:yes('ticketClaim'),allowReopen:yes('ticketReopen'),transcriptsEnabled:yes('ticketTranscript'),autoCloseHours:Math.max(0,Math.min(8760,Number(val('ticketAutoClose'))||0))};
   const saved=await save(id,{tickets:next});if(saved?.success===false)throw new Error(saved.error||'Save failed');
   try{const result=await api('/api/features/spidey-suite/'+encodeURIComponent(id)+'/ticket-panel',{method:'POST',body:JSON.stringify({})});if(result?.success===false)throw new Error(result.error||'Could not publish panel');alert(result.message||'Ticket panel published.');}
   catch(err){alert('Settings were saved, but the panel could not be published yet. '+(err.message||String(err)));}
  };
  attachToggle(id,f,c);return;
 }
 if(k==='embeds'){return renderEmbedsPanel(id,f,c);}
 if(k==='commands'){return renderCommands(id,f,c);}
 if(k==='system'){return renderSystem(id,f,c);}
 if(k==='giveaways'){baseFeaturePanel(id,f,c,input('channel','Default giveaway channel ID',c.giveaways?.channelId||'')+input('duration','Default duration (minutes)',c.giveaways?.duration||60,'number')+input('winners','Default winners',c.giveaways?.winners||1,'number')+input('message','Default prize',c.giveaways?.prize||''));return;}
 if(k==='music'){baseFeaturePanel(id,f,c,check('enabled','Enable music',c.music?.enabled!==false)+input('role','DJ role ID',c.music?.djRoleId||'')+input('channel','Default music channel ID',c.music?.channelId||''));return;}
 if(k==='gating'){baseFeaturePanel(id,f,c,input('role','Gated role ID',c.roles?.gating||'')+check('enabled','Require gated role',c.gating?.enabled!==false));return;}
 const fields=input('channel',(k==='nftStats'||k==='nftQueries'||k==='nftSales')?'Collection ID':(k==='cryptoStats'||k==='cryptoQueries')?'Asset':'Network / channel ID',c.channels?.[k]||'')+input('message','Configuration / identifier',c.messages?.[k]||'');
 baseFeaturePanel(id,f,c,fields);
  if(k!=='overview'&&k!=='premium'&&typeof commandStrip==='function'){const existing=body.querySelector('.panel-command-strip');if(existing)existing.remove();body.insertAdjacentHTML('beforeend',commandStrip(k));}
 } catch(renderError) { console.error('Panel render failed:',f?.[0]||id,renderError); body.innerHTML='<section class="welcome-message-section"><h3>'+esc(f[1])+'</h3><p class="mention-help">This panel could not load. '+esc(renderError.message||'Unknown error')+'</p></section>'; }
}
async function renderEmbedsPanel(id,f,c){
 const saved=Array.isArray(c.embedTemplates)?c.embedTemplates:[];
 const embedTierRaw=String(c.tier||'free').toLowerCase();
 const embedTier=embedTierRaw!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':embedTierRaw;
 const embedPaid=embedTier==='premium'||embedTier==='pro';
 const embedLimit=embedTier==='pro'?30:embedTier==='premium'?5:2;
 let fields=[];
 let selectedTemplate=-1;
 const text=(v)=>String(v||'').trim();
 const colorValue=v=>/^#[0-9a-f]{6}$/i.test(v||'')?v:'#5865f2';
 const templateOptions='<option value="">Start a new embed</option>'+saved.slice(0,embedLimit).map((t,i)=>'<option value="'+i+'">'+esc(t.name||t.title||('Embed '+(i+1)))+'</option>').join('');
 const channelsResult=await api('/api/guild/'+encodeURIComponent(id)+'/channels').catch(()=>({channels:[]}));
 const channels=(channelsResult.channels||[]).filter(ch=>ch.type==='text');
 const publishChannelOptions='<option value="">Choose a channel to publish to</option>'+channels.map(ch=>'<option value="'+esc(ch.id)+'">#'+esc(ch.name)+'</option>').join('');
 const fieldHtml=(field,i)=>'<div class="embed-builder-field" data-embed-field="'+i+'"><div class="embed-builder-field-head"><strong>Field '+(i+1)+'</strong><button type="button" class="rr-remove" data-remove-embed-field="'+i+'">Remove</button></div><label class="field">Field name<input data-field-name="'+i+'" maxlength="256" value="'+esc(field.name||'')+'" placeholder="Field name"></label><label class="field">Field value<textarea data-field-value="'+i+'" rows="2" maxlength="1024" placeholder="Field value">'+esc(field.value||'')+'</textarea></label><label class="check"><span>Display inline</span><input data-field-inline="'+i+'" type="checkbox" '+(field.inline?'checked':'')+'></label></div>';
 body.innerHTML=card('Embed Builder','Create rich Discord embeds inspired by Embed Generator. Build a preview, save reusable templates per server, and return to edit them later.',
 '<div class="welcome-panel embed-builder-panel">'+
 '<style>.embed-builder-panel #embedDescription{display:block;width:100%;min-height:270px;height:270px;resize:vertical;line-height:1.55}.embed-builder-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:14px}.embed-builder-card{border:1px solid var(--border);border-radius:14px;padding:16px;background:var(--surface2);min-width:0}.embed-builder-fields{display:grid;gap:10px}.embed-builder-field{border:1px solid var(--border);border-radius:10px;padding:12px}.embed-builder-field-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.embed-preview{border-left:4px solid #5865f2;background:var(--surface);border-radius:8px;padding:14px;min-height:180px;overflow-wrap:anywhere}.embed-preview-title{font-weight:800;font-size:16px;margin-bottom:8px}.embed-preview-desc{white-space:pre-wrap;font-size:13px;line-height:1.5}.embed-preview-footer{font-size:11px;color:var(--muted);margin-top:12px}.embed-preview img{display:block;max-width:100%;max-height:240px;object-fit:contain;border-radius:8px;margin-top:12px}.embed-preview-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.embed-preview-field strong{display:block;font-size:12px;margin-bottom:4px}.embed-preview-field span{font-size:12px;white-space:pre-wrap}.embed-preview-author{font-size:12px;font-weight:700;margin-bottom:8px}.embed-builder-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.embed-builder-actions button{flex:1;min-width:125px}.embed-builder-note{font-size:11px;color:var(--muted);line-height:1.5;margin-top:8px}@media(max-width:760px){.embed-builder-layout{grid-template-columns:1fr}.embed-preview-fields{grid-template-columns:1fr}}</style>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Embed message statistics</h3><p>Counts for this Discord server. Created counts successful new templates; sent counts successful Discord publishes.</p></div><button class="select" id="refreshEmbedStats" type="button">Refresh counts</button></div><div class="overview-feature-grid" id="embedStatsCards"><article class="overview-feature-card"><strong>Templates created</strong><div class="panel-title" id="embedTemplatesCreated">—</div></article><article class="overview-feature-card"><strong>Currently saved</strong><div class="panel-title" id="embedTemplatesSaved">—</div></article><article class="overview-feature-card"><strong>Embeds sent</strong><div class="panel-title" id="embedEmbedsSent">—</div></article></div></section>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Saved templates</h3><p>'+saved.length+' of '+embedLimit+' templates used on the '+esc(embedTier.toUpperCase())+' plan. '+(embedPaid?'Embed colour, image URLs and footer are unlocked.':'Embed colour, image URLs and footer are locked to Premium and Pro.')+'</p></div></div><label class="field">Template<select id="embedTemplateSelect">'+templateOptions+'</select></label><div class="embed-builder-actions"><button class="select" id="newEmbedTemplate" type="button">New embed</button><button class="select" id="deleteEmbedTemplate" type="button">Delete selected</button></div></section>'+
 '<div class="embed-builder-layout"><section class="embed-builder-card"><h3>Build your embed</h3><p class="embed-builder-note">Discord embed limits apply: title 256 characters, description 4,096, up to 25 fields, field names 256 and values 1,024 characters.</p>'+
 '<label class="field">Publish to channel<select id="embedPublishChannel">'+publishChannelOptions+'</select></label>'+
 '<label class="field">Template name<input id="embedTemplateName" maxlength="80" placeholder="e.g. Server announcement"></label>'+
 '<label class="field">Title<input id="embedTitle" maxlength="256" placeholder="Embed title"></label>'+
 '<label class="field">Title URL<input id="embedUrl" type="url" placeholder="https://example.com"></label>'+
 '<label class="field">Description<textarea id="embedDescription" rows="9" maxlength="4096" placeholder="Write your embed message..."></textarea></label>'+
 '<div class="embed-two-col"><label class="field">Embed colour<input id="embedColor" type="color" value="#5865f2"></label><label class="field">Author<input id="embedAuthor" maxlength="256" placeholder="Author name"></label></div>'+
 '<label class="field">Footer<input id="embedFooter" maxlength="2048" placeholder="Footer text"></label>'+
 '<label class="field">Thumbnail URL<input id="embedThumbnail" type="url" placeholder="https://..."></label>'+
 '<label class="field">Large image URL<input id="embedImage" type="url" placeholder="https://..."></label>'+
 '<label class="check"><span>Show timestamp</span><input id="embedTimestamp" type="checkbox"></label>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Embed fields</h3><p>Add up to 25 name/value fields.</p></div><button class="select" id="addEmbedField" type="button">Add field</button></div><div class="embed-builder-fields" id="embedFieldsContainer"></div></section>'+
 '<div class="embed-builder-actions"><button class="select" id="saveEmbedTemplate" type="button">Save template</button><button class="select" id="copyEmbedJson" type="button">Copy embed JSON</button><button class="select" id="publishEmbed" type="button">Publish to Discord</button></div></section>'+
 '<section class="embed-builder-card"><h3>Live preview</h3><p class="embed-builder-note">Preview updates while you edit. Final appearance may vary slightly in Discord.</p><div id="embedLivePreview" class="embed-preview"><div class="embed-preview-desc">Your embed preview will appear here.</div></div><div class="embed-builder-actions"><button class="select" id="refreshEmbedPreview" type="button">Refresh preview</button></div><p class="embed-builder-note">This panel currently saves reusable embed templates in the selected server’s dashboard configuration. It does not send a Discord message until a publishing action is connected.</p></section></div></div>');
 const getFields=()=>Array.from(document.querySelectorAll('[data-field-name]')).map((el)=>{const i=el.dataset.fieldName;return {name:val('embedFieldName'+i)||el.value,value:document.querySelector('[data-field-value="'+i+'"]')?.value||'',inline:!!document.querySelector('[data-field-inline="'+i+'"]')?.checked};});
 async function refreshEmbedStats(){try{const stats=await api('/api/guild/'+encodeURIComponent(id)+'/embeds/stats');document.getElementById('embedTemplatesCreated').textContent=String(stats.templatesCreated||0);document.getElementById('embedTemplatesSaved').textContent=String(stats.savedTemplates||0);document.getElementById('embedEmbedsSent').textContent=String(stats.embedsSent||0);}catch(err){console.warn('[dashboard] embed stats unavailable',err);}}
 document.getElementById('refreshEmbedStats').onclick=refreshEmbedStats;
 refreshEmbedStats();
 function renderFields(){const root=document.getElementById('embedFieldsContainer');if(!root)return;root.innerHTML=fields.map(fieldHtml).join('')||'<p class="embed-builder-note">No fields added yet.</p>';root.querySelectorAll('[data-remove-embed-field]').forEach(btn=>btn.onclick=()=>{fields.splice(Number(btn.dataset.removeEmbedField),1);renderFields();renderPreview();});root.querySelectorAll('input,textarea').forEach(el=>el.addEventListener('input',renderPreview));}
 function current(){return {name:text(val('embedTemplateName'))||text(val('embedTitle'))||'Untitled embed',title:text(val('embedTitle')),url:text(val('embedUrl')),description:val('embedDescription'),color:colorValue(val('embedColor')),author:text(val('embedAuthor')),footer:text(val('embedFooter')),thumbnail:text(val('embedThumbnail')),image:text(val('embedImage')),timestamp:yes('embedTimestamp'),fields:Array.from(document.querySelectorAll('[data-field-name]')).map(el=>({name:text(el.value),value:text(document.querySelector('[data-field-value="'+el.dataset.fieldName+'"]')?.value),inline:!!document.querySelector('[data-field-inline="'+el.dataset.fieldName+'"]')?.checked})).filter(x=>x.name||x.value).slice(0,25)};}
 function loadTemplate(t){const x=t||{};document.getElementById('embedTemplateName').value=x.name||'';document.getElementById('embedTitle').value=x.title||'';document.getElementById('embedUrl').value=x.url||'';document.getElementById('embedDescription').value=x.description||'';document.getElementById('embedColor').value=colorValue(x.color);document.getElementById('embedAuthor').value=x.author||'';document.getElementById('embedFooter').value=x.footer||'';document.getElementById('embedThumbnail').value=x.thumbnail||'';document.getElementById('embedImage').value=x.image||'';document.getElementById('embedTimestamp').checked=!!x.timestamp;fields=Array.isArray(x.fields)?x.fields.map(y=>({...y})):[];renderFields();renderPreview();}
 function renderPreview(){const x=current(),root=document.getElementById('embedLivePreview');if(!root)return;root.style.borderLeftColor=x.color;let html='';if(x.author)html+='<div class="embed-preview-author">'+esc(x.author)+'</div>';if(x.title)html+='<div class="embed-preview-title">'+(x.url?'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">':'')+esc(x.title)+(x.url?'</a>':'')+'</div>';if(x.description)html+='<div class="embed-preview-desc">'+esc(x.description)+'</div>';if(x.fields.length)html+='<div class="embed-preview-fields">'+x.fields.map(f=>'<div class="embed-preview-field" style="'+(f.inline?'':'grid-column:1/-1')+'"><strong>'+esc(f.name||' ')+'</strong><span>'+esc(f.value||' ')+'</span></div>').join('')+'</div>';if(x.image&&/^https?:\/\//i.test(x.image))html+='<img src="'+esc(x.image)+'" alt="Embed image preview" onerror="this.style.display=\'none\'">';if(x.thumbnail&&/^https?:\/\//i.test(x.thumbnail))html+='<img src="'+esc(x.thumbnail)+'" alt="Embed thumbnail preview" style="max-width:96px;max-height:96px" onerror="this.style.display=\'none\'">';if(x.footer||x.timestamp)html+='<div class="embed-preview-footer">'+esc(x.footer)+(x.timestamp?' · '+new Date().toLocaleString():'')+'</div>';root.innerHTML=html||'<div class="embed-preview-desc">Your embed preview will appear here.</div>'; }
 function refreshTemplateOptions(){const sel=document.getElementById('embedTemplateSelect');sel.innerHTML='<option value="">Start a new embed</option>'+saved.map((t,i)=>'<option value="'+i+'">'+esc(t.name||t.title||('Embed '+(i+1)))+'</option>').join('');sel.value=selectedTemplate>=0?String(selectedTemplate):'';}
 document.getElementById('embedTemplateSelect').onchange=()=>{selectedTemplate=val('embedTemplateSelect')===''?-1:Number(val('embedTemplateSelect'));loadTemplate(selectedTemplate>=0?saved[selectedTemplate]:null);};
 document.getElementById('newEmbedTemplate').onclick=()=>{selectedTemplate=-1;refreshTemplateOptions();loadTemplate(null);};
 document.getElementById('deleteEmbedTemplate').onclick=async()=>{if(selectedTemplate<0||!saved[selectedTemplate]){alert('Select a saved template first.');return;}if(!confirm('Delete this embed template?'))return;saved.splice(selectedTemplate,1);selectedTemplate=-1;await save(id,{embedTemplates:saved});refreshTemplateOptions();loadTemplate(null);alert('Embed template deleted.');};
 document.getElementById('addEmbedField').onclick=()=>{if(fields.length>=25){alert('Discord allows up to 25 fields per embed.');return;}fields.push({name:'',value:'',inline:false});renderFields();renderPreview();};
 ['embedTemplateName','embedTitle','embedUrl','embedDescription','embedColor','embedAuthor','embedFooter','embedThumbnail','embedImage','embedTimestamp'].forEach(key=>document.getElementById(key).addEventListener('input',renderPreview));
 document.getElementById('refreshEmbedPreview').onclick=renderPreview;
 document.getElementById('publishEmbed').onclick=async()=>{const channelId=val('embedPublishChannel');const x=current();if(!channelId){alert('Choose a channel to publish the embed to.');return;}if(!x.title&&!x.description&&!x.fields.length&&!x.image&&!x.thumbnail&&!x.author&&!x.footer){alert('Add at least a title, description, field, image or footer before publishing.');return;}const isHttpUrl=value=>!value||value.startsWith('http://')||value.startsWith('https://');if(!isHttpUrl(x.url)||!isHttpUrl(x.image)||!isHttpUrl(x.thumbnail)){alert('URLs must start with http:// or https://.');return;}const btn=document.getElementById('publishEmbed');btn.disabled=true;const oldLabel=btn.textContent;btn.textContent='Publishing…';try{const result=await api('/api/guild/'+encodeURIComponent(id)+'/embeds/send',{method:'POST',body:JSON.stringify({channelId,embed:x})});if(result?.success===false)throw new Error(result.error||'Publish failed');await refreshEmbedStats();alert('Embed published to #'+(result.channelName||'the selected channel')+'.');}catch(err){alert('Could not publish embed: '+(err.message||String(err)));}finally{btn.disabled=false;btn.textContent=oldLabel;}};
 document.getElementById('copyEmbedJson').onclick=()=>{const x=current();const payload={title:x.title||undefined,url:x.url||undefined,description:x.description||undefined,color:x.color,author:x.author?{name:x.author}:undefined,footer:x.footer?{text:x.footer}:undefined,thumbnail:x.thumbnail?{url:x.thumbnail}:undefined,image:x.image?{url:x.image}:undefined,timestamp:x.timestamp?new Date().toISOString():undefined,fields:x.fields.length?x.fields:undefined};const json=JSON.stringify(payload,null,2);if(navigator.clipboard?.writeText)navigator.clipboard.writeText(json).then(()=>alert('Embed JSON copied.')).catch(()=>prompt('Copy embed JSON:',json));else prompt('Copy embed JSON:',json);};
 if(!embedPaid){['embedColor','embedImage','embedThumbnail','embedFooter'].forEach(key=>{const el=document.getElementById(key);if(el){el.disabled=true;el.title='Premium or Pro required';el.style.opacity='.55';}});}
 document.getElementById('saveEmbedTemplate').onclick=async()=>{const x=current();if(!embedPaid){x.color='#5865f2';x.image='';x.thumbnail='';x.footer='';}if(selectedTemplate<0&&saved.length>=embedLimit){alert('This server has reached its '+embedLimit+' saved embed message limit for the '+embedTier.toUpperCase()+' plan.');return;}if(!x.title&&!x.description&&!x.fields.length&&!x.image&&!x.thumbnail&&!x.author&&!x.footer){alert('Add at least a title, description, field, image or footer before saving.');return;}if(x.description.length>4096||x.fields.some(field=>field.name.length>256||field.value.length>1024)){alert('One or more fields exceed Discord embed limits.');return;}if(x.url&&!/^https?:\/\//i.test(x.url)||x.image&&!/^https?:\/\//i.test(x.image)||x.thumbnail&&!/^https?:\/\//i.test(x.thumbnail)){alert('URLs must start with http:// or https://.');return;}const isNewTemplate=selectedTemplate<0;if(selectedTemplate>=0)saved[selectedTemplate]=x;else{saved.push(x);selectedTemplate=saved.length-1;}try{const result=await save(id,{embedTemplates:saved});if(result?.success===false)throw new Error(result.error||'Save failed');if(isNewTemplate){await api('/api/guild/'+encodeURIComponent(id)+'/embeds/template-created',{method:'POST',body:JSON.stringify({})}).catch(err=>console.warn('[dashboard] could not record created template',err));}refreshTemplateOptions();await refreshEmbedStats();alert('Embed template saved for this server.');}catch(err){alert('Could not save embed template: '+(err.message||String(err)));}};
 loadTemplate(null);
}
async function renderCommands(id,f,c){
 const commandTierRaw=String(c.tier||'free').toLowerCase();
 const commandTier=commandTierRaw!=='free'&&c.tierEndDate&&Number(c.tierEndDate)<=Date.now()?'free':commandTierRaw;
 const paidCommandTier=commandTier==='premium'||commandTier==='pro';
 const lockedCommandNames=new Set(['poll','deletepoll']);
 const groups={Information:['avatar','userinfo','serverinfo','roleinfo','botinfo','membercount','permissions','profile','rank','stats'],Economy:['daily','beg','deposit','withdraw','inventory','shop','buy','give','rob','crime','pet'],Fun:['poll','deletepoll','calculator','ascii','advice','dadjoke','wouldyourrather','hack','relationship'],Moderation:['purge','softban','unban','clearwarnings','slowmode','lock','unlock','nickname','role','announce','say','thread'],AutoMod:['automod','automodwords','automodlinks','automodspam'],Configuration:['auditlog','setprefix','sticky','unsticky','counting','welcome','goodbye','autorole','verify','commandtoggle'],Levels:['levelrewards','setlevelreward','resetxp','addxp','setxp','removexp'],Invites:['invitesstats','invitesleaderboard','invitesadd','invitesremove','invitesreset'],Tickets:['ticket'],Administration:['blacklist','unblacklist','reloadconfig','debug','guildlist','botstats']};
 const commandPaths={avatar:'/info avatar',userinfo:'/info userinfo',serverinfo:'/info serverinfo',roleinfo:'/info roleinfo',botinfo:'/info botinfo',membercount:'/info membercount',permissions:'/info permissions',profile:'/info profile',rank:'/info rank',stats:'/stats',daily:'/economy daily',beg:'/economy beg',deposit:'/economy deposit',withdraw:'/economy withdraw',inventory:'/economy inventory',shop:'/economy shop',buy:'/economy buy',give:'/economy give',rob:'/economy rob',crime:'/economy crime',pet:'/economy pet',poll:'/fun poll',deletepoll:'/fun deletepoll',calculator:'/fun calculator',ascii:'/fun ascii',advice:'/fun advice',dadjoke:'/fun dadjoke',wouldyourrather:'/fun wouldyourrather',hack:'/fun hack',relationship:'/fun relationship',purge:'/mod purge',softban:'/mod softban',unban:'/mod unban',clearwarnings:'/mod clearwarnings',slowmode:'/mod slowmode',lock:'/mod lock',unlock:'/mod unlock',nickname:'/mod nickname',role:'/mod role',announce:'/mod announce',say:'/mod say',thread:'/mod thread',automod:'/automod toggle',automodwords:'/automod words',automodlinks:'/automod links',automodspam:'/automod spam',auditlog:'/config auditlog',setprefix:'/config prefix',sticky:'/config sticky',unsticky:'/config unsticky',counting:'/config counting',welcome:'/welcome + /config welcome',goodbye:'/goodbye + /config goodbye',autorole:'/config autorole',verify:'/config verify',commandtoggle:'/config toggle',levelrewards:'/levels rewards',setlevelreward:'/levels setreward',resetxp:'/levels reset',addxp:'/levels addxp',setxp:'/levels setxp',removexp:'/levels removexp',invitesstats:'/invites stats',invitesleaderboard:'/invites leaderboard',invitesadd:'/invites add',invitesremove:'/invites remove',invitesreset:'/invites reset',ticket:'/ticket (panel, create, close, claim, reopen, delete, stats)',blacklist:'/system blacklist',unblacklist:'/system unblacklist',reloadconfig:'/system reload',debug:'/system debug',guildlist:'/system guilds',botstats:'/system stats'};
 let html=switcher(id,f,c)+'<div class="command-access-note">'+(paidCommandTier?'Premium/Pro: switches are editable.':'Free: command status is view-only. Premium or Pro unlocks command on/off controls.')+'</div><div class="command-grid">';
 Object.entries(groups).forEach(([group,names])=>names.forEach(name=>{const enabled=c.commandToggles?.[name]!==false;const locked=lockedCommandNames.has(name)&&!paidCommandTier;html+='<label class="command-item"><span>'+esc(group)+' · '+esc(commandPaths[name]||('/'+name))+(locked?' · 🔒 Premium/Pro':'')+'</span><input class="command-switch" type="checkbox" role="switch" aria-label="'+esc(name)+' command '+(enabled?'enabled':'disabled')+'" id="cmd_'+esc(name)+'" '+(enabled?'checked':'')+' '+(!paidCommandTier||locked?'disabled title="'+(locked?'Premium or Pro required':'Free plan can view command status only')+'"':'')+'></label>';}));
 html+='</div><div class="panel-actions">'+button('saveCommands','Save command settings')+'</div>';
 body.innerHTML=card(f[1],f[2],html);
 const saveCommandsButton=document.getElementById('saveCommands');if(!paidCommandTier){saveCommandsButton.disabled=true;saveCommandsButton.title='Premium or Pro is required to change command settings.';saveCommandsButton.textContent='View only · Premium/Pro required';}else{saveCommandsButton.onclick=async()=>{const patch={...(c.commandToggles||{})};Object.values(groups).flat().forEach(n=>{patch[n]=yes('cmd_'+n);});try{const result=await save(id,{commandToggles:patch});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Command settings saved.');await renderCommands(id,f,await load(id));}catch(err){alert('Could not save command settings: '+(err.message||String(err)));}};}
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
 const groups=FEATURES.map(([name,items])=>({name,items:items.filter(f=>f[0]!=='premium')})).filter(group=>group.items.length);
  const tier=effectiveTier(c),fullyLocked=new Set(['music','polls','emojis']);
  let counterOverview={tier:effectiveTier(c),limit:5,counters:[]};try{counterOverview=await api('/api/dashboard/stat-channel-counters?guildId='+encodeURIComponent(id));}catch(err){console.warn('[dashboard] overview counters unavailable',err);}
  const configuredCounters=Array.isArray(counterOverview.counters)?counterOverview.counters.length:0;
  const counterLimit=Number(counterOverview.limit||({free:5,premium:10,pro:20}[String(counterOverview.tier||effectiveTier(c)).toLowerCase()]||5));
  root.innerHTML='<div class="panel-head"><div><div class="eyebrow">Control centre</div><div class="panel-title">Panels</div><div class="panel-sub">Switch each panel on or off for this Discord server. Premium and Pro requirements are labelled on each panel; locked panels stay disabled until this server is upgraded.</div></div></div>'+
  '<section class="overview-feature-group overview-statistics-group"><div class="overview-feature-grid"><article class="overview-feature-card is-essential is-on overview-statistics-feature"><div class="overview-feature-top"><div class="overview-feature-icon">'+icon('chart-line')+'</div><div class="overview-feature-copy"><strong>Live statistics channels</strong><span>Configured counters for this server</span><span class="plan-card-detail">'+configuredCounters+' / '+counterLimit+' configured counters · '+esc(String(counterOverview.tier||effectiveTier(c)).toUpperCase())+' plan</span><span class="plan-card-detail">Free: 5 · Premium: 10 · Pro: 20</span></div></div><div class="overview-feature-bottom"><span class="overview-feature-status">'+configuredCounters+' / '+counterLimit+' COUNTERS</span><button type="button" class="select" data-open-statistics>Manage counters</button></div></article></div></section>'+
  groups.map(group=>'<section class="overview-feature-group '+(group.name==='Essentials'?'overview-feature-group-essentials':'')+'"><h2>'+esc(group.name)+'</h2><div class="overview-feature-grid">'+group.items.map(f=>{const on=enabled(c,f),meta=PANEL_TIER_BADGES[f[0]],locked=fullyLocked.has(f[0])&&tier==='free';return '<article class="overview-feature-card '+(group.name==='Essentials'?'is-essential ':'')+(on?'is-on':'is-off')+(locked?' is-plan-locked':'')+'"><div class="overview-feature-top"><div class="overview-feature-icon">'+icon(f[3])+'</div><div class="overview-feature-copy"><strong>'+esc(f[1])+'</strong>'+(meta?'<span class="plan-requirement-badge '+(meta.kind==='locked'?'plan-requirement-locked':'')+'">'+esc(meta.label)+'</span>':'')+'<span>'+esc(f[2])+'</span>'+(meta?'<span class="plan-card-detail">'+esc(meta.note)+'</span>':'')+'</div></div><div class="overview-feature-bottom"><span class="overview-feature-status">'+(locked?'LOCKED · PREMIUM/PRO':on?'ON':'OFF')+'</span><button type="button" class="overview-toggle '+(on?'on':'')+'" '+(locked?'disabled title="Premium or Pro required"':'')+' role="switch" aria-checked="'+on+'" aria-label="'+(on?'Disable ':'Enable ')+esc(f[1])+'" '+(!locked?'data-panel-toggle="'+esc(f[0])+'"':'')+'></button>'+(locked?'<button type="button" class="plan-upgrade-link" data-upgrade-plan>View plans</button>':'')+'</div></article>';}).join('')+'</div></section>').join('');
  root.querySelectorAll('[data-upgrade-plan]').forEach(btn=>btn.addEventListener('click',()=>select('premium')));
 root.querySelectorAll('[data-open-statistics]').forEach(btn=>btn.addEventListener('click',()=>select('statistics')));
 root.querySelectorAll('[data-panel-toggle]').forEach(btn=>btn.addEventListener('click',async()=>{
   const key=btn.dataset.panelToggle;
   const f=feature(key);
   if(!f||btn.disabled)return;
   const next=!enabled(c,f);
   btn.disabled=true;
   try{
     await setFeatureEnabled(id,key,next);
     c.plugins={...(c.plugins||{}),[key]:next};
     await buildNavigation();
     await renderOverview();
   }catch(err){
     btn.disabled=false;
     alert('Could not '+(next?'enable ':'disable ')+f[1]+'. '+(err.message||String(err)));
   }
 }));
}
const sidebarGroupExpanded=new Map();
function sidebarGroupKey(name){return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function addSidebarGroup(name,items,groupConfig){
 const key=sidebarGroupKey(name);
 const heading=document.createElement('button');
 heading.type='button';
 heading.className='nav-title nav-group-toggle nav-title-'+key;
 heading.dataset.navGroup=key;
 heading.setAttribute('aria-controls','sidebar-group-'+key);
 if(!sidebarGroupExpanded.has(key))sidebarGroupExpanded.set(key,true);
 const groupNav=document.createElement('nav');
 groupNav.className='nav nav-group-items';
 groupNav.id='sidebar-group-'+key;
 const renderHeading=()=>{
   const expanded=sidebarGroupExpanded.get(key)!==false;
   heading.setAttribute('aria-expanded',String(expanded));
   heading.innerHTML='<span class="nav-group-label">'+esc(name)+'</span><span class="nav-group-chevron" aria-hidden="true">'+(expanded?'▾':'▸')+'</span>';
   groupNav.classList.toggle('is-collapsed',!expanded);
   groupNav.inert=!expanded;
   groupNav.setAttribute('aria-hidden',String(!expanded));
 };
 heading.onclick=()=>{
   sidebarGroupExpanded.set(key,!(sidebarGroupExpanded.get(key)!==false));
   renderHeading();
 };
 items.forEach(item=>{
   const b=document.createElement('button');
   b.type='button';
   if(item.section){
     b.dataset.section=item.section;
     b.innerHTML='<span class="icon">'+icon(item.icon||'')+'</span>'+esc(item.label);
     b.onclick=item.onClick;
   }else{
     const f=item.feature;
     const on=enabled(groupConfig,f);
     b.dataset.section=f[0];
     b.classList.toggle('feature-disabled',!on);
      const tier=effectiveTier(groupConfig),meta=PANEL_TIER_BADGES[f[0]],locked=meta?.kind==='locked'&&tier==='free';
      b.classList.toggle('feature-plan-locked',!!locked);
      b.innerHTML='<span class="icon">'+icon(f[3])+'</span>'+esc(f[1])+((meta?.kind==='locked')?'<span class="sidebar-tier-badge is-locked">'+esc(meta.label)+'</span>':'');
      b.onclick=()=>{if(locked){alert(f[1]+' requires Premium or Pro. Open the Premium panel to view plans.');select('premium');return;}if(!enabled(groupConfig,f)){alert(f[1]+' is switched off. Turn it on from Overview → Panels first.');return;}select(f[0]);};
   }
   groupNav.appendChild(b);
 });
 navigation.appendChild(heading);
 navigation.appendChild(groupNav);
 renderHeading();
}
async function buildNavigation(){
 if(!navigation)return;
 const id=guildId();let c={plugins:{}};
 if(id){try{c=await load(id);}catch(err){console.warn('[dashboard] feature config',err);}}
 navigation.innerHTML='';
 addSidebarGroup('Main',[
   {section:'overview',label:'Overview',icon:'house',onClick:()=>select('overview')},
   {section:'statistics',label:'Statistics',icon:'chart-line',onClick:()=>select('statistics')},
   {section:'premium',label:'Premium / Pro',icon:'crown',onClick:()=>select('premium')}
 ],c);
 FEATURES.forEach(group=>{
   const visible=group[1].filter(f=>f[0]!=='premium');
   if(!visible.length)return;
   addSidebarGroup(group[0],visible.map(f=>({feature:f})),c);
 });
}
async function renderStatistics(id){
  overview.hidden=true;workspace.hidden=false;
  title.textContent='Statistics';
  description.textContent='Live server membership, moderation roles and tracked community growth.';
  body.innerHTML=card('Loading statistics','Fetching current server statistics…','');
  const data=await api('/api/dashboard/server-statistics?guildId='+encodeURIComponent(id));
  const metrics=[
    ['Members',data.memberCount,'Current server membership'],
    ['Messages sent',data.messages,'Human messages tracked since rollout'],
    ['Moderators',data.moderators,'Members with moderation permissions'],
    ['Administrators',data.administrators,'Members with Administrator permission']
  ];
  const metricCards=metrics.map(([label,value,meta])=>'<div class="card stat statistics-essential-card"><div class="stat-top"><span>'+esc(label)+'</span><div class="stat-icon"></div></div><div class="stat-value">'+Number(value||0).toLocaleString()+'</div><div class="stat-meta">'+esc(meta)+'</div></div>').join('');
  const joins=Array.isArray(data.joinsThisMonth)?data.joinsThisMonth:[];
  const labels=Array.isArray(data.joinLabels)?data.joinLabels:[];
  const max=Math.max(1,...joins);
  const bars=joins.map((count,index)=>{
    const height=Math.max(3,Math.round((Number(count||0)/max)*100));
    const day=Number(labels[index]||index+1);
    const showLabel=day===1||day%5===0||day===joins.length;
    return '<div title="'+esc('Day '+day+': '+count+' joined')+'" style="flex:1;min-width:3px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:150px;gap:5px"><div style="width:100%;height:'+height+'%;min-height:3px;border-radius:5px 5px 2px 2px;background:linear-gradient(180deg,var(--petrol),var(--purple));opacity:'+(Number(count)>0?'1':'.28')+'"></div><span style="font-size:9px;color:var(--muted);height:12px">'+(showLabel?day:'')+'</span></div>';
  }).join('');
  body.innerHTML='<div class="stats">'+metricCards+'</div>'+
    '<div class="card panel section statistics-essential-card"><div class="panel-head"><div><div class="panel-title">People who joined this month</div><div class="panel-sub">Daily joins recorded by SPIDEY BOT</div></div></div>'+
    '<div style="display:flex;align-items:flex-end;gap:4px;min-height:180px;padding:12px 4px 0;border-bottom:1px solid var(--border)">'+bars+'</div>'+
    '<div style="font-size:11px;color:var(--muted);margin-top:12px">Day of month · '+joins.reduce((sum,n)=>sum+Number(n||0),0)+' tracked joins this month</div></div>'+
    '<div class="card panel section statistics-essential-card"><div class="panel-head"><div><div class="panel-title">Server Statistics</div><div class="panel-sub">Live membership, online, channel and role counters.</div></div></div>'+
    '<div class="activity"><div class="activity-row"><div class="activity-icon">↗</div><div class="activity-main"><strong>Message tracking</strong><span>'+Number(data.messages||0).toLocaleString()+' human messages recorded since statistics tracking was deployed.</span></div></div>'+
    '<div class="activity-row"><div class="activity-icon">＋</div><div class="activity-main"><strong>Member growth</strong><span>Daily joins are recorded from deployment onwards. Older join history is not invented.</span></div></div>'+
    '<div class="activity-row"><div class="activity-icon">♙</div><div class="activity-main"><strong>Role counts</strong><span>Moderator and administrator totals are calculated from members available to the bot and their Discord permissions.</span></div></div></div></div>';

  const counterData = await api('/api/dashboard/stat-channel-counters?guildId='+encodeURIComponent(id));
  const metricOptions = [
    ['members','Total members'],['humans','Human members'],['bots','Bot accounts'],
    ['channels','Server channels'],['online','Online members (cached presence)'],['roleMembers','Members with a selected role']
  ];
  const channelOptions = (counterData.channels||[]).map(ch=>'<option value="'+esc(ch.id)+'">'+esc(ch.name)+' · '+esc(ch.id)+'</option>').join('');
  const roleOptions = (counterData.roles||[]).map(role=>'<option value="'+esc(role.id)+'">'+esc(role.name)+'</option>').join('');
  const counterRows = (counterData.counters||[]).map(counter=>'<div class="activity-row" style="align-items:center"><div class="activity-main"><strong>'+esc(counter.label||({members:'Members',humans:'People',bots:'Bots',channels:'Channels',online:'Online',roleMembers:'Role members'}[counter.metric]||counter.metric))+': '+esc(counter.channelName)+'</strong><span>'+esc(counter.metric==='roleMembers'?'Role: '+(counter.roleName||counter.roleId):metricOptions.find(item=>item[0]===counter.metric)?.[1]||counter.metric)+' · updates every 5 minutes</span></div><button type="button" class="select" data-remove-stat-counter="'+esc(counter.id)+'">Remove</button></div>').join('');
  body.insertAdjacentHTML('beforeend',
    '<div class="card panel section statistics-essential-card"><div class="panel-head"><div><div class="panel-title">Live statistics channels</div><div class="panel-sub">Configure channels that SPIDEY BOT renames automatically with live server counts. This is an original dashboard integration, not a copied bot.</div></div></div>'+
    '<p class="muted">Choose a text or voice channel and the value it should display. SPIDEY BOT needs Manage Channels permission. Your '+esc(String(counterData.tier||'free').toUpperCase())+' plan allows '+Number(counterData.limit||5)+' configured counters per server.</p>'+
    '<div class="panel-section"><div class="stat-counter-form">'+
    '<label class="field">Channel setup<select id="statCounterMode"><option value="existing">Choose an existing channel</option><option value="create">Create a channel automatically</option></select></label>'+
    '<label class="field" id="statCounterExistingField">Existing channel<select id="statCounterChannel">'+(channelOptions||'<option value="">No renameable channels found</option>')+'</select></label>'+
    '<label class="field">Statistic<select id="statCounterMetric">'+metricOptions.map(item=>'<option value="'+item[0]+'">'+item[1]+'</option>').join('')+'</select></label>'+
    '<label class="field" id="statCounterRoleField" hidden>Role to count<select id="statCounterRole">'+roleOptions+'</select></label>'+
    '<label class="field">Channel name label (optional)<input id="statCounterLabel" maxlength="45" placeholder="e.g. 👥 Members"></label>'+
    '</div><p class="muted" id="statCounterCreateHelp" hidden>A new voice channel will be created automatically. For role counters, the selected role name will be used as the channel label.</p><div class="panel-actions stat-counter-actions"><button type="button" class="select" id="addStatCounter" '+((!channelOptions)&&(counterData.counters||[]).length>=Number(counterData.limit||5)?'disabled':'')+'>Add live counter</button></div></div>'+
    '<div class="panel-section"><h3>Configured counters ('+(counterData.counters||[]).length+'/'+Number(counterData.limit||5)+')</h3><div class="activity">'+(counterRows||'<p class="muted">No live counters configured yet.</p>')+'</div></div></div>');
  const metricSelect=document.getElementById('statCounterMetric');
  const roleField=document.getElementById('statCounterRoleField');
  const modeSelect=document.getElementById('statCounterMode');
  const existingField=document.getElementById('statCounterExistingField');
  const createHelp=document.getElementById('statCounterCreateHelp');
  const labelInput=document.getElementById('statCounterLabel');
  const addButton=document.getElementById('addStatCounter');
  function updateCounterForm(){
    const creating=modeSelect?.value==='create';
    if(existingField){
      existingField.hidden=false;
      const existingChannelSelect=document.getElementById('statCounterChannel');
      if(existingChannelSelect) existingChannelSelect.disabled=creating;
      existingField.style.opacity=creating?'0.55':'1';
      existingField.style.transition='opacity 160ms ease';
    }
    if(createHelp) createHelp.hidden=!creating;
    if(roleField) roleField.hidden=metricSelect?.value!=='roleMembers';
    if(addButton){addButton.textContent=creating?'Create channel and add counter':'Add live counter';addButton.disabled=(!creating&&!channelOptions)||(counterData.counters||[]).length>=Number(counterData.limit||5);}
    if(creating&&metricSelect?.value==='roleMembers'&&labelInput&&!labelInput.value.trim()){
      const selectedRole=document.getElementById('statCounterRole')?.selectedOptions?.[0]?.textContent||'';
      labelInput.placeholder=selectedRole?'e.g. '+selectedRole:'e.g. Moderators';
    }
  }
  modeSelect?.addEventListener('change',updateCounterForm);
  metricSelect?.addEventListener('change',updateCounterForm);
  document.getElementById('statCounterRole')?.addEventListener('change',updateCounterForm);
  updateCounterForm();
  addButton?.addEventListener('click',async()=>{
    const button=addButton;
    const creating=modeSelect?.value==='create';
    const roleId=document.getElementById('statCounterRole')?.value||null;
    const selectedRole=document.getElementById('statCounterRole')?.selectedOptions?.[0]?.textContent||'';
    const typedLabel=labelInput?.value?.trim()||'';
    const payload={guildId:id,channelId:creating?undefined:document.getElementById('statCounterChannel')?.value,createChannel:creating,metric:metricSelect?.value,label:creating&&metricSelect?.value==='roleMembers'?selectedRole:typedLabel,roleId};
    if(payload.metric==='roleMembers'&&!payload.roleId){alert('Choose the role this counter should count.');return;}
    if(creating&&payload.metric==='roleMembers'&&!selectedRole){alert('Choose the role to use for the new channel name.');return;}
    button.disabled=true;button.textContent=creating?'Creating channel…':'Adding…';
    try{await api('/api/dashboard/stat-channel-counters',{method:'POST',body:JSON.stringify(payload)});await renderStatistics(id);}
    catch(error){alert('Could not add live counter: '+(error.message||String(error)));button.disabled=false;button.textContent=creating?'Create channel and add counter':'Add live counter';}
  });
  body.querySelectorAll('[data-remove-stat-counter]').forEach(button=>button.addEventListener('click',async()=>{
    button.disabled=true;
    try{await api('/api/dashboard/stat-channel-counters',{method:'POST',body:JSON.stringify({guildId:id,action:'remove',counterId:button.dataset.removeStatCounter})});await renderStatistics(id);}
    catch(error){alert('Could not remove live counter: '+(error.message||String(error)));button.disabled=false;}
  }));

}
async function select(section){
 document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
 if(section==='overview'){workspace.hidden=true;overview.hidden=false;renderOverview();return;}
 const id=guildId();
 if(!id){overview.hidden=true;workspace.hidden=false;body.innerHTML=card('Server selection required','No guild ID is available. Return to server selection and choose the server again.','');return;}
 if(section==='statistics'){
   try{await renderStatistics(id);}catch(err){console.error('[dashboard] statistics failed',err);overview.hidden=true;workspace.hidden=false;title.textContent='Statistics';description.textContent='Server statistics';body.innerHTML=card('Statistics unavailable','Could not load server statistics.','<div class="activity-row"><div class="activity-main"><strong>Error</strong><span>'+esc(err.message||String(err))+'</span></div></div>');}
   return;
 }
 const f=feature(section);
 if(!f){overview.hidden=true;workspace.hidden=false;body.innerHTML=card('Panel unavailable','This section is not registered.','');return;}
 try{
   const c=await load(id);
   overview.hidden=true;workspace.hidden=false;
   title.textContent=f[1];description.textContent=f[2];body.innerHTML=card('Loading',f[2],'');
   const tier=String(c.tier||'free').toLowerCase();
   const tierActive=tier==='free'||!c.tierEndDate||Number(c.tierEndDate)>Date.now();
   const activeTier=tierActive?tier:'free';
   const lockedPanels={polls:'Premium or Pro',emojis:'Premium or Pro',music:'Premium or Pro'};
   if(lockedPanels[section]&&activeTier==='free'){
     const colour=activeTier==='pro'?'gold':'purple';
     body.innerHTML=card(f[1]+' is locked',lockedPanels[section]+' is required to use this panel on this server.',
       '<div class="plan-lock-card '+colour+'"><div class="plan-lock-icon">🔒</div><h3>Unlock '+esc(f[1])+'</h3><p>Upgrade this server to Premium or Pro. Plan access is applied per server and also enforced by SPIDEY BOT’s Discord commands.</p><button type="button" class="primary" id="planUpgradeBtn">View plans</button></div>');
     const btn=document.getElementById('planUpgradeBtn');if(btn)btn.addEventListener('click',()=>select('premium'));
     return;
   }
   await renderPanel(id,f,c);
   const panelMeta=PANEL_TIER_BADGES[section];
   if(panelMeta){const notice=document.createElement('div');notice.className='plan-tier-notice '+(panelMeta.kind==='locked'?'is-locked':'');notice.innerHTML='<span class="plan-requirement-badge '+(panelMeta.kind==='locked'?'plan-requirement-locked':'')+'">'+esc(panelMeta.label)+'</span><span>'+esc(panelMeta.note)+'</span>';body.prepend(notice);}
 }catch(err){
   console.error('[dashboard] panel failed',section,err);
   body.innerHTML=card('Panel failed to load','The feature could not be rendered.', '<div class="activity-row"><div class="activity-main"><strong>Error</strong><span>'+esc(err.message||String(err))+'</span></div></div>');
 }
}
addStyles();
installSidebarHeadingGlow();
window.spideyDashboard={select,guildId,FEATURES};
// The Owner Console broadcasts plan changes to other dashboard tabs on this origin.
// Reload the selected server's authoritative plan and rerender the active panel immediately.
window.addEventListener('storage',async event=>{
 if(event.key!=='spidey-plan-updated'||!event.newValue)return;
 let update;try{update=JSON.parse(event.newValue)}catch(_){return;}
 const id=guildId();
 if(!id||String(update.guildId)!==String(id))return;
 const active=document.querySelector('[data-section].active')?.dataset.section||'overview';
 await buildNavigation();
 await select(active);
});
async function handlePayPalReturn(){
 const params=new URLSearchParams(window.location.search);
 if(params.get('paypalCancelled')==='1'){
  window.history.replaceState({},'',window.location.pathname+'?guildId='+encodeURIComponent(guildId()));
  alert('PayPal checkout was cancelled. Your plan has not changed.');
  return;
 }
 if(params.get('paypalReturn')!=='1')return;
 const orderId=params.get('token');
 const serverId=guildId();
 if(!orderId||!serverId){
  alert('PayPal returned without an order or server ID. No plan change was made.');
  return;
 }
 try{
  const response=await fetch('/api/paypal/capture-order',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({orderId,guildId:serverId})});
  const result=await response.json();
  if(!response.ok||!result.success)throw new Error(result.error||'PayPal could not verify the payment.');
  window.history.replaceState({},'',window.location.pathname+'?guildId='+encodeURIComponent(serverId));
  await buildNavigation();
  await select('premium');
  const until=result.tierEndDate?new Date(Number(result.tierEndDate)).toLocaleDateString():null;
  alert('Payment verified. '+String(result.tier||'premium').toUpperCase()+' is now active for this server'+(until?' until '+until:'')+'.');
 }catch(error){
  alert('We could not finish activating this purchase: '+(error.message||String(error))+'. Your payment will not grant a plan until PayPal verification succeeds.');
 }
}
buildNavigation().then(async()=>{await select('overview');await handlePayPalReturn();});
