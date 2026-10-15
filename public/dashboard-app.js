const body=document.querySelector('#workspaceBody');
const workspace=document.querySelector('#featureWorkspace');
const overview=document.querySelector('#overview');
const title=document.querySelector('#workspaceTitle');
const description=document.querySelector('#workspaceDescription');
const navigation=document.querySelector('#navigation');

const FEATURES=[
  ['Essentials',[
    ['welcome','Welcome & Goodbye','Member greetings, welcome channels, messages and automatic roles.','chats-circle'],
    ['reactionRoles','Reaction Roles','Create self-assignable role mappings for your community.','hand-waving'],
    ['moderator','Moderation','Warnings, kicks, bans, channel controls and moderation history.','shield-check'],
    ['automod','AutoMod','Filter invites, links, spam, mentions, caps and blocked words.','shield-warning'],
    ['audit','Audit Log','Configure the channel used for important server activity.','list-checks'],
    ['levels','Levels','XP progression, level rewards and level-up announcements.','chart-line-up'],
    ['achievements','Achievements','Configure achievement milestones and reward behavior.','trophy']
  ]],
  ['Server Management',[
    ['customCommands','Custom Commands','Create, enable and disable custom commands.','terminal-window'],
    ['inviteTracker','Invite Tracker','Track referral activity and invite logging.','users-three'],
    ['ticketing','Ticketing','Configure support tickets, categories, staff roles and transcripts.','ticket'],
    ['emojis','Emojis','Configure server emoji management and utility controls.','smiley'],
    ['polls','Polls','Configure community poll behavior and defaults.','chart-bar'],
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
 if(!document.getElementById('welcome-panel-styles')){const ws=document.createElement('style');ws.id='welcome-panel-styles';ws.textContent=".audit-timeline{display:grid;gap:10px}.audit-entry{border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--surface)}.audit-entry-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.audit-entry-head span,.audit-entry small{font-size:11px;color:var(--muted)}.audit-entry p{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}.audit-entry small{display:block;overflow-wrap:anywhere}.welcome-panel{display:grid;gap:14px}.welcome-section-disabled{opacity:.48}.welcome-section-disabled .welcome-section-heading{opacity:1}.rr-entry{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--border);border-radius:10px;margin-top:8px}.rr-entry p{font-size:11px;color:var(--muted);margin-top:4px}.rr-remove{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:8px;padding:7px 10px;cursor:pointer}.rr-mapping{margin-top:16px;border-top:1px solid var(--border);padding-top:14px}.rr-mapping h4{font-size:12px;margin-bottom:8px}.rr-mapping-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mod-punishment-row{display:grid;grid-template-columns:100px minmax(100px,1fr) minmax(120px,1fr);gap:8px;align-items:center;padding:8px;margin-top:8px;border:1px solid var(--border);border-radius:10px}.mod-punishment-row input,.mod-punishment-row select{width:100%;min-width:0;min-height:38px;border:1px solid var(--border);border-radius:9px;padding:8px;background:var(--surface);color:var(--text);font:inherit;font-size:11px}@media(max-width:620px){.mod-punishment-row{grid-template-columns:1fr}}.rr-options{display:grid;gap:8px;margin-top:12px}.welcome-message-section{border:1px solid var(--border);border-radius:14px;padding:16px;background:var(--surface2)}.welcome-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}.welcome-section-heading h3{font-size:13px;font-weight:850}.welcome-section-heading p,.command-help p{font-size:11px;color:var(--muted);margin-top:4px}.welcome-section-heading .check{border:0;padding:0;gap:10px}.welcome-message-section .field{margin:10px 0}.welcome-message-section .field input,.welcome-message-section .field textarea,.welcome-message-section .field select,.mention-tools select{display:block;width:100%;margin-top:5px;min-height:40px;border:1px solid var(--border);border-radius:10px;padding:9px 10px;background:var(--surface);color:var(--text);font:inherit;font-size:12px}.welcome-message-section .field textarea{resize:vertical;line-height:1.5}.welcome-message-section [hidden]{display:none!important}.word-counter{display:block;text-align:right;color:var(--muted);font-size:10px;margin-top:4px}.word-counter.over-limit{color:#d97706}.mention-tools{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;margin:0 0 12px}.mention-tools>span,.mention-help{grid-column:1/-1;font-size:10px;color:var(--muted)}.mention-tools button{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:9px;padding:0 11px;min-height:38px;font-size:11px;font-weight:750;cursor:pointer}.mention-tools select{margin:0}.mention-help{line-height:1.5}.embed-two-col{display:grid;grid-template-columns:140px minmax(0,1fr);gap:12px}.command-help{border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--surface)}.welcome-panel .panel-actions{margin-top:4px}@media(max-width:620px){.mention-tools{grid-template-columns:1fr}.mention-tools button{min-height:38px}.embed-two-col{grid-template-columns:1fr}.welcome-section-heading{flex-direction:column}}";document.head.appendChild(ws);}

 if(document.getElementById('integrated-dashboard-styles'))return;
 const s=document.createElement('style');s.id='integrated-dashboard-styles';
 s.textContent='.field{display:block;font-size:11px;font-weight:750;color:var(--muted);margin:10px 0}.field input{display:block;width:100%;margin-top:5px;min-height:40px;border:1px solid var(--border);border-radius:10px;padding:9px 10px;background:var(--surface);color:var(--text)}.check{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--border);font-size:12px;font-weight:700}.check input{width:18px;height:18px}.panel-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.command-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.command-item{padding:12px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2)}.feature-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;padding:12px 14px;border:1px solid var(--border);border-radius:13px;background:var(--surface-2)}.feature-toggle>span{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.7px}.feature-toggle button{position:relative;width:48px;height:26px;border:0;border-radius:999px;background:#9ca3b8;padding:0;transition:background .12s ease,box-shadow .12s ease;cursor:pointer}.feature-toggle button:before{content:\"\";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .12s ease}.feature-toggle button.on{background:var(--petrol);box-shadow:0 0 0 3px color-mix(in srgb,var(--petrol) 16%,transparent)}.feature-toggle button.on:before{transform:translateX(22px)}.feature-toggle button:disabled{opacity:.7;cursor:wait}.overview-feature-group{margin-top:18px}.overview-feature-group h2{font-size:16px;font-weight:800;margin-bottom:10px}.overview-feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.overview-feature-card{padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--surface);transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}.overview-feature-card:hover{transform:translateY(-1px);box-shadow:var(--shadow)}.overview-feature-top{display:flex;align-items:flex-start;gap:11px}.overview-feature-icon{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;background:var(--accent-soft);color:var(--purple)}.dark .overview-feature-icon{background:var(--accent-soft);color:var(--purple)}.overview-feature-copy{min-width:0;flex:1}.overview-feature-copy strong{display:block;font-size:12px}.overview-feature-copy span{display:block;font-size:10px;color:var(--muted);margin-top:3px;line-height:1.45}.overview-feature-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:14px}.overview-feature-status{font-size:10px;font-weight:800;color:var(--muted)}.overview-feature-card.is-on .overview-feature-status{color:var(--petrol)}.overview-feature-card.is-off{opacity:.82}.overview-toggle{position:relative;width:42px;height:23px;border:0;border-radius:999px;background:#9ca3b8;cursor:pointer;transition:background .12s ease}.overview-toggle:before{content:\"\";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;transition:transform .12s ease}.overview-toggle.on{background:var(--petrol)}.overview-toggle.on:before{transform:translateX(19px)}.overview-toggle:disabled{opacity:.7;cursor:wait}.nav button.feature-disabled{opacity:.48}.nav button.feature-disabled:after{content:\"OFF\";margin-left:auto;font-size:8px;font-weight:800;letter-spacing:.5px;padding:3px 6px;border-radius:999px;background:var(--surface-2);color:var(--muted)}@media(max-width:900px){.overview-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.command-grid{grid-template-columns:1fr}.overview-feature-grid{grid-template-columns:1fr}}';
 document.head.appendChild(s);
}
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
function messageSection(prefix,label,enabled,channel,type,message,embed,channels,roles){
 return '<section class="welcome-message-section" id="'+prefix+'Content"><div class="welcome-section-heading"><div><h3>'+esc(label)+'</h3><p>Sent '+(prefix==='welcome'?'when a member joins':'when a member leaves')+'.</p></div></div>'+
 '<label class="field">'+esc(label)+' channel<select id="'+prefix+'Channel">'+optionList(channels,channel,'Choose a text channel')+'</select></label>'+
 '<label class="field">Message format<select id="'+prefix+'Type"><option value="text" '+((type||'text')==='text'?'selected':'')+'>Normal text</option><option value="embed" '+(type==='embed'?'selected':'')+'>Discord embed</option></select></label>'+
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
 const bodyHtml=messageSection('welcome','Welcome message',sm.enableWelcome??sm.welcomeEnabled??false,sm.welcomeChannel||'',welcomeType,sm.welcomeMessage??'Welcome {user} to {server}! 🎉',sm.welcomeEmbed,channels,roles)+
 messageSection('goodbye','Goodbye message',sm.enableGoodbye??sm.goodbyeEnabled??false,sm.goodbyeChannel||'',goodbyeType,sm.goodbyeMessage??'{user} has left {server}. 👋',sm.goodbyeEmbed,channels,roles)+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Automatic welcome role</h3><p>Give every new member this role automatically when a role is selected.</p></div></div><label class="field">Role to assign<select id="autoroleRole">'+optionList(roles,sm.autoroleRole||sm.autoroleRoleId||c.autorole?.roleId||'','Choose a role')+'</select></label><p class="mention-help">SPIDEY BOT needs Manage Roles, and its highest role must be above the selected role.</p></section>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Admin commands</h3><p>Administrative configuration only. These settings do not change who can run the commands.</p></div></div>'+input('prefix','Prefix (admin use)',c.prefix||'!')+'<div class="command-help"><strong>Existing Discord commands</strong><p>Use your configured welcome/goodbye commands in Discord. In message text, {user} tags the member; inserted channel and role mentions remain clickable.</p></div></section>'+
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
 document.querySelectorAll('[data-insert-user]').forEach(btn=>btn.addEventListener('click',()=>insertAtCursor(btn.dataset.insertUser,'{user}')));
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
   welcomeEnabled:true,enableWelcome:true,welcomeChannel:val('welcomeChannel')||null,welcomeMessage:messages.welcome,welcomeEmbed:embeds.welcome,welcomeType:val('welcomeType'),
   goodbyeEnabled:true,enableGoodbye:true,goodbyeChannel:val('goodbyeChannel')||null,goodbyeMessage:messages.goodbye,goodbyeEmbed:embeds.goodbye,goodbyeType:val('goodbyeType'),
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
 const [channelResult,roleResult,settingsResult]=await Promise.all([
  api('/api/guild/'+encodeURIComponent(id)+'/channels'),
  api('/api/guild/'+encodeURIComponent(id)+'/roles'),
  api('/api/bot-config/react-roles/settings?guildId='+encodeURIComponent(id))
 ]);
 const channels=(channelResult.channels||[]).filter(x=>x.type==='text');
 const roles=(roleResult.roles||[]).filter(x=>!x.managed);
 const rr=settingsResult.config||{};
 try{await api('/api/bot-config/react-roles/settings?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({enabled:true})});}catch(err){console.warn('[dashboard] could not enable reaction roles defaults',err);}
 const entries=Array.isArray(rr.entries)?rr.entries:[];
 const entryRows=entries.map((e,i)=>'<div class="rr-entry"><div><strong>'+esc(e.emoji||'😀')+' → '+esc(e.roleName||roles.find(r=>r.id===e.roleId)?.name||'Role')+'</strong><p>#'+esc(e.channelName||channels.find(ch=>ch.id===e.channelId)?.name||'channel')+' · Message '+esc(e.messageId||'')+'</p></div><button type="button" class="rr-remove" data-remove-rr="'+i+'">Remove</button></div>').join('');
 const channelOptions=optionList(channels,'','Choose a text channel');
 const roleOptions=optionList(roles,'','Choose a role');
 body.innerHTML=card('Reaction Roles','Create custom text/embed messages and map emoji reactions to server roles. Settings apply only to the selected server.',
 '<div class="welcome-panel reaction-roles-panel">'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Create reaction role</h3><p>Post a new message or attach a reaction role to a message that already exists.</p></div></div>'+
 '<label class="field">Message action<select id="rrMessageAction"><option value="create">Create a new message</option><option value="existing">Use an existing message</option></select></label>'+
 '<div id="rrCreateMessage">'+
 '<label class="field">Post in channel<select id="rrChannel">'+channelOptions+'</select></label>'+
 '<label class="field">Message format<select id="rrType"><option value="text">Normal text</option><option value="embed">Discord embed</option></select></label>'+
 '<div id="rrTextPanel">'+input('rrMessageText','Message text','React below to choose your roles.')+
 '<div class="mention-tools"><span>Insert a mention into the message</span><input id="rrMentionUser" type="text" placeholder="User ID to mention" aria-label="User ID to mention"><button type="button" data-rr-insert="user">Insert user mention</button><select id="rrMentionChannel">'+channelOptions+'</select><button type="button" data-rr-insert="channel">Insert channel mention</button><select id="rrMentionRole">'+roleOptions+'</select><button type="button" data-rr-insert="role">Insert role mention</button><button type="button" id="rrResolveIds">Resolve pasted channel/role IDs</button></div></div>'+
 '<div id="rrEmbedPanel" hidden>'+input('rrEmbedTitle','Embed title','Choose your roles')+'<label class="field">Embed description<textarea id="rrEmbedDescription" rows="4" maxlength="4000">React below to choose your roles.</textarea></label>'+input('rrEmbedColor','Embed color (hex)','5865F2')+input('rrEmbedFooter','Footer','SPIDEY BOT • Reaction Roles')+input('rrEmbedImage','Image URL','')+'</div>'+
 '</div>'+
 '<div id="rrExistingMessage" hidden><label class="field">Message channel<select id="rrExistingChannel">'+channelOptions+'</select></label>'+input('rrMessageId','Existing message ID','')+'<p class="mention-help">Paste the message ID from the selected server and channel. The bot must be able to view the channel and message.</p></div>'+
 '<div class="rr-mapping"><h4>Emoji → role mapping</h4><div class="rr-mapping-grid">'+input('rrEmoji','Emoji (Unicode or custom emoji)','🎮')+'<label class="field">Role to assign<select id="rrRole">'+roleOptions+'</select></label></div><p class="mention-help">When a member adds this reaction, the bot assigns the selected role. Removing the reaction removes the role.</p></div>'+
 '<div class="rr-options">'+check('rrAllowMultiple','Allow members to select multiple roles',rr.allowMultiple!==false)+check('rrRemoveOnUnreact','Remove role when reaction is removed',rr.removeOnUnreact!==false)+check('rrDmConfirm','Send a DM confirmation',!!(rr.dmConfirm||rr.dmConfirmations))+'</div>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Language and notifications</h3><p>Choose the language and whether the bot should send optional notices to a server channel.</p></div></div><label class="field">Panel language<select id="rrLanguage"><option value="en" '+((rr.language||'en')==='en'?'selected':'')+'>English</option><option value="es" '+(rr.language==='es'?'selected':'')+'>Español</option><option value="fr" '+(rr.language==='fr'?'selected':'')+'>Français</option><option value="de" '+(rr.language==='de'?'selected':'')+'>Deutsch</option><option value="pt" '+(rr.language==='pt'?'selected':'')+'>Português</option><option value="pl" '+(rr.language==='pl'?'selected':'')+'>Polski</option><option value="ru" '+(rr.language==='ru'?'selected':'')+'>Русский</option></select></label>'+check('rrUpdateNotifications','Enable update notifications',!!rr.updateNotifications)+check('rrErrorReporting','Enable error reporting',!!rr.errorReporting)+'<label class="field">Notification/error channel<select id="rrNotificationChannel">'+optionList(channels,rr.notificationChannelId||'','Choose a channel (optional)')+'</select></label><p class="mention-help">These preferences are stored per server. Notification delivery requires the bot to have permission to send messages in the selected channel.</p></section>'+
 '<div class="panel-actions"><button class="select" id="rrCreateSave" type="button">Save reaction role</button><button class="select" id="rrSaveSettings" type="button">Save settings only</button></div></section>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Existing reaction roles</h3><p>Manage role mappings already configured for this server.</p></div></div>'+(entryRows||'<p class="mention-help">No reaction roles have been created yet.</p>')+'</section></div>');
 // Reaction Roles is always enabled; configuration remains editable.
 document.getElementById('rrMessageAction').addEventListener('change',()=>{const existing=val('rrMessageAction')==='existing';document.getElementById('rrCreateMessage').hidden=existing;document.getElementById('rrExistingMessage').hidden=!existing;});
 document.getElementById('rrType').addEventListener('change',()=>{const embed=val('rrType')==='embed';document.getElementById('rrTextPanel').hidden=embed;document.getElementById('rrEmbedPanel').hidden=!embed;});
 document.querySelectorAll('[data-rr-insert]').forEach(btn=>btn.addEventListener('click',()=>{const type=btn.dataset.rrInsert;const target=document.getElementById('rrMessageText');let value='';if(type==='user'&&/^\\d{17,20}$/.test(val('rrMentionUser').trim()))value='<@'+val('rrMentionUser').trim()+'>';if(type==='user'&&!value){alert('Enter a valid Discord user ID first.');return;}if(type==='channel'&&val('rrMentionChannel'))value='<#'+val('rrMentionChannel')+'>';if(type==='role'&&val('rrMentionRole'))value='<@&'+val('rrMentionRole')+'>';if(!value)return;const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;target.value=target.value.slice(0,start)+value+target.value.slice(end);target.focus();target.selectionStart=target.selectionEnd=start+value.length;}));
 document.getElementById('rrResolveIds').addEventListener('click',()=>{const channelIds=new Set(channels.map(x=>String(x.id))),roleIds=new Set(roles.map(x=>String(x.id)));const el=document.getElementById('rrMessageText');el.value=el.value.replace(/\b\d{17,20}\b/g,raw=>channelIds.has(raw)?'<#'+raw+'>':roleIds.has(raw)?'<@&'+raw+'>':raw);});
 const saveSettings=async()=>api('/api/bot-config/react-roles/settings?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({allowMultiple:yes('rrAllowMultiple'),removeOnUnreact:yes('rrRemoveOnUnreact'),dmConfirm:yes('rrDmConfirm'),enabled:true,language:val('rrLanguage')||'en',updateNotifications:yes('rrUpdateNotifications'),errorReporting:yes('rrErrorReporting'),notificationChannelId:val('rrNotificationChannel')||null})});
 document.getElementById('rrSaveSettings').onclick=async()=>{try{await saveSettings();alert('Reaction role settings saved.');}catch(e){alert('Could not save settings: '+e.message);}};
 document.getElementById('rrCreateSave').onclick=async()=>{
  // Reaction Roles remains enabled; validate the mapping fields below.
  const action=val('rrMessageAction'),channelId=action==='existing'?val('rrExistingChannel'):val('rrChannel'),emoji=val('rrEmoji').trim(),roleId=val('rrRole');
  if(!channelId||!emoji||!roleId){alert('Choose a channel, emoji and role.');return;}
  try{
   let messageId=val('rrMessageId').trim();
   if(action==='create'){
    const type=val('rrType');
    const payload={channelId,type,content:type==='text'?val('rrMessageText'):undefined,title:val('rrEmbedTitle'),description:val('rrEmbedDescription'),color:val('rrEmbedColor'),footer:val('rrEmbedFooter'),image:val('rrEmbedImage')};
    const posted=await api('/api/bot-config/react-roles/post?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify(payload)});
    if(!posted.success)throw new Error(posted.error||posted.message||'Could not post message');
    messageId=posted.messageId;
   }
   const added=await api('/api/bot-config/react-roles/add?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({channelId,messageId,emoji,roleId})});
   if(!added.success)throw new Error(added.error||added.message||'Could not add reaction role');
   await saveSettings();
   alert('Reaction role created.');await renderReactionRolesPanel(id,f,await load(id));
  }catch(e){alert('Could not create reaction role: '+e.message);}
 };
 document.querySelectorAll('[data-remove-rr]').forEach(btn=>btn.addEventListener('click',async()=>{const index=Number(btn.dataset.removeRr);if(!confirm('Remove this reaction role mapping?'))return;try{const result=await api('/api/bot-config/react-roles/remove?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({index})});if(result.success===false)throw new Error(result.error||result.message);await renderReactionRolesPanel(id,f,await load(id));}catch(e){alert('Could not remove reaction role: '+e.message);}}));
 attachToggle(id,f,c);
}

async function renderPanel(id,f,c){
 const k=f[0];
 if(k==='welcome'){await renderWelcomePanel(id,f,c);return;}
 if(k==='reactionRoles'){await renderReactionRolesPanel(id,f,c);return;}
 if(k==='reminders'){
  const cfg=c.reminderSettings||{};
  body.innerHTML=card('Reminders','Inspired by RemindmeBot: configure reminder defaults, recurring reminders and timezone handling. Reminder scheduling and slash-command delivery must be supported by the bot runtime to take effect.',switcher(id,f,c)+
   '<div class="welcome-panel">'+
   '<section class="welcome-message-section"><h3>Reminder defaults</h3>'+check('reminderEnabled','Enable reminders',cfg.enabled!==false)+input('reminderTimezone','Server timezone (IANA)',cfg.timezone||'UTC')+input('reminderChannel','Default reminder channel ID (optional)',cfg.channelId||'')+input('reminderMax','Maximum active reminders per member',cfg.maxPerUser??25,'number')+'</section>'+
   '<section class="welcome-message-section"><h3>Reminder behavior</h3>'+check('reminderDm','Deliver personal reminders by direct message',cfg.dm!==false)+check('reminderRecurring','Allow recurring reminders',cfg.recurring!==false)+check('reminderMentions','Allow reminders to mention users and roles',cfg.allowMentions===true)+'<p class="mention-help">Reference features include one-time reminders, recurring intervals, reminders for other users or roles, and server timezone settings. Timezone must be a valid IANA name, such as Europe/London or Africa/Nairobi.</p></section>'+
   '<div class="panel-actions"><button class="select" id="saveReminderSettings" type="button">Save Reminders</button></div></div>');
  document.getElementById('saveReminderSettings').onclick=async()=>{const timezone=val('reminderTimezone').trim()||'UTC';if(!/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(timezone)){alert('Enter a valid IANA timezone, for example Africa/Nairobi.');return;}const max=Math.floor(Number(val('reminderMax'))||25);if(max<1||max>500){alert('Maximum active reminders must be between 1 and 500.');return;}const fresh=await load(id);const result=await save(id,{reminderSettings:{enabled:yes('reminderEnabled'),timezone,channelId:val('reminderChannel').trim()||null,maxPerUser:max,dm:yes('reminderDm'),recurring:yes('reminderRecurring'),allowMentions:yes('reminderMentions')}});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Reminder settings saved.');};
  attachToggle(id,f,c);return;
 }
 if(k==='birthdays'){
  const cfg=c.birthdaySettings||{};
  body.innerHTML=card('Birthdays','Inspired by BirthdayBot: customize birthday announcements, birthday roles, privacy-friendly messages, timezone and recurring custom events.',switcher(id,f,c)+
   '<div class="welcome-panel">'+
   '<section class="welcome-message-section"><h3>Birthday announcements</h3>'+check('birthdayEnabled','Enable birthday celebrations',cfg.enabled!==false)+input('birthdayChannel','Birthday announcement channel ID',cfg.channelId||'')+input('birthdayRole','Birthday role ID (optional)',cfg.roleId||'')+input('birthdayTimezone','Server timezone (IANA)',cfg.timezone||'UTC')+input('birthdayHour','Announcement hour (0–23)',cfg.hour??9,'number')+'</section>'+
   '<section class="welcome-message-section"><h3>Message and privacy</h3><label class="field">Birthday message<textarea id="birthdayMessage" rows="4" maxlength="1800" placeholder="Happy birthday, {user}! 🎂">'+esc(cfg.message||'Happy birthday, {user}! 🎂')+'</textarea></label>'+check('birthdayPing','Mention the birthday member',cfg.ping!==false)+check('birthdayAge','Allow age to be shown when available',cfg.showAge===true)+check('birthdayTimezoneUser','Use each member timezone when available',cfg.useMemberTimezone===true)+'<p class="mention-help">Supported message placeholder: {user}. Birthdays should not expose a member’s birth year unless the member has chosen to share it.</p></section>'+
   '<section class="welcome-message-section"><h3>Custom events</h3><p class="mention-help">Use one event per line in the format <code>Name | MM-DD | Message</code>. Leave the year out for an annual event, or use <code>YYYY-MM-DD</code> for a one-time event.</p><label class="field">Custom events<textarea id="birthdayEvents" rows="4" maxlength="8000" placeholder="Server anniversary | 04-12 | Happy server anniversary, {server}!">'+esc(cfg.customEventsText||'')+'</textarea></label></section>'+
   '<div class="panel-actions"><button class="select" id="saveBirthdaySettings" type="button">Save Birthdays</button></div></div>');
  document.getElementById('saveBirthdaySettings').onclick=async()=>{const timezone=val('birthdayTimezone').trim()||'UTC';if(!/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+.-]+)*$/.test(timezone)){alert('Enter a valid IANA timezone, for example Africa/Nairobi.');return;}const hour=Number(val('birthdayHour'));if(!Number.isInteger(hour)||hour<0||hour>23){alert('Announcement hour must be a whole number from 0 to 23.');return;}const fresh=await load(id);const result=await save(id,{birthdaySettings:{enabled:yes('birthdayEnabled'),channelId:val('birthdayChannel').trim()||null,roleId:val('birthdayRole').trim()||null,timezone,hour,message:val('birthdayMessage').trim().slice(0,1800)||'Happy birthday, {user}! 🎂',ping:yes('birthdayPing'),showAge:yes('birthdayAge'),useMemberTimezone:yes('birthdayTimezoneUser'),customEventsText:val('birthdayEvents').trim().slice(0,8000)}});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Birthday settings saved.');};
  attachToggle(id,f,c);return;
 }
 if(k==='moderator'){
  const modCfg=await api('/api/config/'+encodeURIComponent(id));
  body.innerHTML=card('Moderation','Vortex-inspired moderation setup: moderator access, action logs and strike punishments.', '<div class="welcome-panel moderation-panel">'+
   '<section class="welcome-message-section"><h3>Moderator access</h3><p class="mention-help">Assign a moderator role if you want role-based moderation access in addition to Discord permissions.</p>'+input('moderatorRole','Moderator role ID',modCfg.modRoleId||modCfg.moderatorRoleId||'')+'</section>'+
   '<section class="welcome-message-section"><h3>Moderation log</h3><p class="mention-help">Record staff actions, targets and reasons in a private channel.</p>'+input('moderationLogChannel','Moderation log channel ID',modCfg.modLogChannelId||modCfg.logging?.moderationLogging?.modLogChannel||'')+check('logWarns','Log warnings',modCfg.logging?.moderationLogging?.logWarns!==false)+check('logKicks','Log kicks',modCfg.logging?.moderationLogging?.logKicks!==false)+check('logBans','Log bans',modCfg.logging?.moderationLogging?.logBans!==false)+check('logMutes','Log mutes and unmutes',modCfg.logging?.moderationLogging?.logMutes!==false)+'</section>'+
   '<section class="welcome-message-section"><h3>Activity logging</h3><p class="mention-help">Optional message and member activity logs, based on Vortex’s separate log categories.</p>'+input('messageLogChannel','Message edit/delete log channel ID',modCfg.logging?.messageLogging?.channelId||modCfg.messageLogChannelId||'')+check('logMessageEdits','Log message edits',modCfg.logging?.messageLogging?.edits!==false)+check('logMessageDeletes','Log message deletions',modCfg.logging?.messageLogging?.deletes!==false)+input('serverLogChannel','Member join/leave log channel ID',modCfg.logging?.serverLogging?.channelId||modCfg.serverLogChannelId||'')+check('logJoins','Log member joins and leaves',modCfg.logging?.serverLogging?.memberJoins!==false)+input('voiceLogChannel','Voice activity log channel ID',modCfg.logging?.voiceLogging?.channelId||'')+check('logVoice','Log voice joins, leaves and moves',modCfg.logging?.voiceLogging?.enabled===true)+'</section>'+
   '<section class="welcome-message-section"><h3>Strike punishment ladder</h3><p class="mention-help">Configure escalation thresholds. Vortex supports None, Mute, Kick, Softban and Ban; timed mute/ban actions can have a duration.</p>'+
   [1,2,3,4,5].map(n=>'<div class="mod-punishment-row"><strong>'+n+' '+(n===1?'strike':'strikes')+'</strong><select id="punishmentAction'+n+'">'+['none','mute','kick','softban','ban'].map(v=>'<option value="'+v+'">'+v.charAt(0).toUpperCase()+v.slice(1)+'</option>').join('')+'</select><input id="punishmentTime'+n+'" placeholder="Duration (optional, e.g. 10m)"></div>').join('')+
   '</section><div class="panel-actions"><button class="select" id="saveModerationSettings" type="button">Save moderation settings</button></div></div>');
  const existingPunishments=modCfg.strikePunishments||modCfg.punishments||{};
  [1,2,3,4,5].forEach(n=>{const p=existingPunishments[n]||{};const action=document.getElementById('punishmentAction'+n);if(action)action.value=p.action||'none';const time=document.getElementById('punishmentTime'+n);if(time)time.value=p.time||'';});
  document.getElementById('saveModerationSettings').onclick=async()=>{
   const punishments={};[1,2,3,4,5].forEach(n=>punishments[n]={action:val('punishmentAction'+n)||'none',time:val('punishmentTime'+n).trim()||null});
   const logging={...(modCfg.logging||{}),moderationLogging:{...(modCfg.logging?.moderationLogging||{}),modLogChannel:val('moderationLogChannel')||null,logWarns:yes('logWarns'),logKicks:yes('logKicks'),logBans:yes('logBans'),logMutes:yes('logMutes')},messageLogging:{...(modCfg.logging?.messageLogging||{}),channelId:val('messageLogChannel')||null,edits:yes('logMessageEdits'),deletes:yes('logMessageDeletes')},serverLogging:{...(modCfg.logging?.serverLogging||{}),channelId:val('serverLogChannel')||null,memberJoins:yes('logJoins')},voiceLogging:{...(modCfg.logging?.voiceLogging||{}),channelId:val('voiceLogChannel')||null,enabled:yes('logVoice')}};
   const result=await api('/api/config/'+encodeURIComponent(id),{method:'POST',body:JSON.stringify({modRoleId:val('moderatorRole')||null,modLogChannelId:val('moderationLogChannel')||null,messageLogChannelId:val('messageLogChannel')||null,serverLogChannelId:val('serverLogChannel')||null,strikePunishments:punishments,punishments,logging})});
   if(result.success!==true)throw new Error(result.error||'Could not save moderation settings');
   alert('Moderation settings saved.');
  };
  return;
 }
 if(k==='audit'){
   const au=c.audit||{},events=Array.isArray(au.entries)?au.entries:[];
   const toggle=(key,label,checked)=>check(key,label,checked!==false);
   const logRows=events.slice(0,100).map(e=>'<article class="audit-entry"><div class="audit-entry-head"><strong>'+esc(e.title||e.type||'Server event')+'</strong><span>'+esc(e.time?new Date(e.time).toLocaleString():'Unknown time')+'</span></div><p>'+esc(e.description||'No additional details')+'</p><small>'+esc([e.actor?'Actor: '+e.actor:'',e.target?'Target: '+e.target:'',e.channel?'Channel: '+e.channel:''].filter(Boolean).join(' · '))+'</small></article>').join('');
   body.innerHTML=card('Audit Log','A searchable activity timeline plus controls for which server events SPIDEY BOT records.',
    '<div class="welcome-panel audit-panel">'+
    '<section class="welcome-message-section"><h3>Audit log delivery</h3><p class="mention-help">Send audit embeds to a staff-only Discord channel and keep a recent timeline visible here.</p>'+check('auditEnabled','Enable audit logging',au.enabled===true)+input('auditChannel','Audit log channel ID',au.channelId||'')+input('ignoreChannels','Ignored channel IDs (comma separated)',(au.ignoreChannelIds||[]).join(', '))+'</section>'+
    '<section class="welcome-message-section"><h3>Messages</h3>'+toggle('auditMessageDelete','Deleted messages',au.events?.messageDelete)+toggle('auditMessageEdit','Edited messages with before/after text',au.events?.messageUpdate)+toggle('auditBulkDelete','Bulk message deletion',au.events?.messageDeleteBulk)+'</section>'+
    '<section class="welcome-message-section"><h3>Members & moderation</h3>'+toggle('auditMemberJoin','Member joins',au.events?.memberJoin)+toggle('auditMemberLeave','Member leaves',au.events?.memberLeave)+toggle('auditMemberUpdate','Username, nickname and role changes',au.events?.memberUpdate)+toggle('auditBan','Bans and unbans',au.events?.bans)+toggle('auditVoice','Voice joins, leaves, moves and mute/deafen changes',au.events?.voice)+'</section>'+
    '<section class="welcome-message-section"><h3>Server structure</h3>'+toggle('auditChannels','Channel create, update and delete',au.events?.channels)+toggle('auditRoles','Role create, update and delete',au.events?.roles)+toggle('auditGuild','Server name and icon changes',au.events?.guild)+'</section>'+
    '<div class="panel-actions"><button class="select" id="saveAudit" type="button">Save audit settings</button><button class="select" id="refreshAudit" type="button">Refresh timeline</button><button class="select" id="exportAudit" type="button">Export JSON</button></div>'+
    '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Recent activity</h3><p class="mention-help">Up to 100 recent entries are displayed. Message content may be unavailable if Discord did not provide it to the bot.</p></div></div>'+input('auditSearch','Search recent activity','')+'<div class="audit-timeline">'+(logRows||'<p class="mention-help">No audit events recorded yet. Enable logging, save settings and ensure the bot has the required Discord intents and View Audit Log permission.</p>')+'</div></section></div>');
   document.getElementById('auditSearch').addEventListener('input',()=>{const q=val('auditSearch').toLowerCase();document.querySelectorAll('.audit-entry').forEach(row=>{row.style.display=row.textContent.toLowerCase().includes(q)?'':'none';});});
   document.getElementById('saveAudit').onclick=async()=>{
    const eventSettings={...(au.events||{}),messageDelete:yes('auditMessageDelete'),messageUpdate:yes('auditMessageEdit'),messageDeleteBulk:yes('auditBulkDelete'),memberJoin:yes('auditMemberJoin'),memberLeave:yes('auditMemberLeave'),memberUpdate:yes('auditMemberUpdate'),bans:yes('auditBan'),voice:yes('auditVoice'),channels:yes('auditChannels'),roles:yes('auditRoles'),guild:yes('auditGuild')};
    const ignoreChannelIds=val('ignoreChannels').split(',').map(x=>x.trim()).filter(Boolean);
    const result=await save(id,{audit:{...au,enabled:yes('auditEnabled'),channelId:val('auditChannel').trim()||null,ignoreChannelIds,events:eventSettings}});
    if(result.success===false)throw new Error(result.error||'Could not save audit settings');alert('Audit log settings saved.');
   };
   document.getElementById('refreshAudit').onclick=async()=>{try{const fresh=await load(id);await renderPanel(id,f,fresh);}catch(e){alert('Could not refresh audit timeline: '+e.message);}};
   document.getElementById('exportAudit').onclick=()=>{const blobText=JSON.stringify({guildId:id,exportedAt:new Date().toISOString(),entries:events},null,2);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([blobText],{type:'application/json'}));a.download='spideybot-audit-'+id+'.json';a.click();URL.revokeObjectURL(a.href);};
   return;
  }
  if(k==='automod'){
  const am=c.automod||{},rules=Array.isArray(am.customRules)?am.customRules:[];
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
    check('alertStaff','Send staff alert',am.alertStaff!==false)+input('logChannel','Private staff log channel ID',am.logChannelId||'')+
    '<p class="mention-help">Use a private channel where only moderators can view AutoMod alerts. The bot needs View Channel and Send Messages permissions.</p>')+
   '<div class="panel-actions"><button class="select" id="saveAutoMod" type="button">Save AutoMod settings</button></div></div>');
  document.getElementById('saveAutoMod').onclick=async()=>{
   const parseTerms=id=>val(id).split(/[\\n,]/).map(x=>x.trim()).filter(Boolean).slice(0,1000);
   const customRules=[1,2,3].map((n)=>({name:'Custom rule '+n,terms:parseTerms('rule'+n)}));
   const patch={automod:{...am,enabled:yes('enabled'),notifyUser:yes('notifyUser'),presetProfanity:yes('presetProfanity'),presetSlurs:yes('presetSlurs'),presetSexual:yes('presetSexual'),words:parseTerms('words'),customRules,
    antiSpam:yes('antiSpam'),maxMessages:Math.max(2,Math.min(30,Number(val('max'))||6)),windowMs:Math.max(1,Math.min(60,Number(val('window'))||8))*1000,
    antiInvite:yes('antiInvite'),antiLink:yes('antiLink'),blockedDomains:parseTerms('blockedDomains'),antiDuplicate:yes('antiDuplicate'),caps:yes('caps'),massMention:yes('massMention'),maxMentions:Math.max(1,Math.min(50,Number(val('maxMentions'))||5)),
    screenUsername:yes('screenUsername'),screenNickname:yes('screenNickname'),screenActionTimeout:yes('screenActionTimeout'),action:val('action'),
    timeoutMinutes:Math.max(1,Math.min(40320,Number(val('timeoutMinutes'))||10)),alertStaff:yes('alertStaff'),logChannelId:val('logChannel').trim()||null}};
   try{const result=await save(id,patch);if(result.success===false)throw new Error(result.error||'Save failed');alert('AutoMod settings saved.');}
   catch(err){alert('Could not save AutoMod settings: '+(err.message||String(err)));}
  };
  attachToggle(id,f,c);return;
 }
 if(k==='levels'){const currentLevels=c.levels||{},xpPerMessage=Math.max(1,Number(currentLevels.xpPerMessage)||15),xpPerLevel=Math.max(1,Number(currentLevels.xpPerLevel)||500),messagesNeeded=Math.ceil(xpPerLevel/xpPerMessage);body.innerHTML=card(f[1],f[2],switcher(id,f,c)+'<div class="panel-section"><h3>XP progression</h3>'+check('enabled','Enable leveling',currentLevels.enabled!==false)+input('xp','XP earned per eligible message',xpPerMessage,'number')+input('per','XP required per level',xpPerLevel,'number')+input('cooldown','XP cooldown per member (seconds)',currentLevels.xpCooldownSeconds??60,'number')+'<div id="xpEstimate" class="muted">At '+xpPerMessage+' XP per message, it takes about '+messagesNeeded+' eligible messages to earn '+xpPerLevel+' XP.</div></div><div class="panel-section"><h3>Level-up log channel</h3><p class="muted">When someone levels up, SPIDEY BOT posts their current XP, level and XP progress in this channel. It does not post every message.</p>'+check('announce','Enable level-up announcements',currentLevels.announce!==false)+input('channel','Level-up log channel ID',currentLevels.announceChannel||'')+'</div><div class="panel-section"><h3>Admin XP editing</h3><p class="muted">Server administrators can use <code>/levels addxp</code>, <code>/levels setxp</code>, <code>/levels removexp</code> and <code>/levels reset</code>. The member’s level is recalculated from their total XP.</p></div><div class="panel-actions">'+button('save','Save levels')+'</div>');const updateEstimate=()=>{const xp=Math.max(1,Number(val('xp'))||15),per=Math.max(1,Number(val('per'))||500),needed=Math.ceil(per/xp);const estimate=document.getElementById('xpEstimate');if(estimate)estimate.textContent='At '+xp+' XP per message, it takes about '+needed+' eligible messages to earn '+per+' XP.';};document.getElementById('xp').addEventListener('input',updateEstimate);document.getElementById('per').addEventListener('input',updateEstimate);document.getElementById('save').onclick=async()=>{const xp=Math.max(1,Math.min(10000,Number(val('xp'))||15)),per=Math.max(1,Math.min(1000000,Number(val('per'))||500)),cooldown=Math.max(0,Math.min(3600,Number(val('cooldown'))||0));const result=await save(id,{levels:{...currentLevels,enabled:yes('enabled'),xpPerMessage:xp,xpPerLevel:per,xpCooldownSeconds:cooldown,announce:yes('announce'),announceChannel:val('channel').trim()||null}});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Levels settings saved.');};attachToggle(id,f,c);return;}
 if(k==='achievements'){
  const a=c.achievements||{},messages=Array.isArray(a.messages)?a.messages:[],emojis=Array.isArray(a.emojis)?a.emojis:[];
  const [channelResult,roleResult]=await Promise.all([api('/api/guild/'+encodeURIComponent(id)+'/channels'),api('/api/guild/'+encodeURIComponent(id)+'/roles')]);
  const channels=(channelResult.channels||[]).filter(x=>x.type==='text'),roles=(roleResult.roles||[]).filter(x=>!x.managed);
  const thresholdRow=(prefix,label,entries,defaults)=>'<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>'+label+'</h3><p>Assign each role once the member reaches or exceeds the threshold.</p></div></div>'+[0,1].map(i=>'<div class="rr-mapping-grid">'+input(prefix+'Threshold'+i,'Threshold '+(i+1),entries[i]?.threshold??defaults[i],'number')+'<label class="field">Reward role<select id="'+prefix+'Role'+i+'">'+optionList(roles,entries[i]?.roleId||'','Choose a reward role')+'</select></label></div>').join('')+'</section>';
  body.innerHTML=card('Achievements & milestones','Track message and emoji milestones independently from XP. SQLite stores lifetime totals separately for each member and server.',
   '<div class="welcome-panel">'+check('achEnabled','Enable milestone tracking',a.enabled!==false)+thresholdRow('msg','Message milestones',messages,[10,100])+thresholdRow('emoji','Emoji milestones',emojis,[5,50])+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Milestone announcements</h3><p>Post a congratulatory message when a member earns a configured milestone role.</p></div></div><label class="field">Announcement channel<select id="achChannel">'+optionList(channels,a.announcementChannelId||'','Choose a text channel')+'</select></label>'+check('achAnnounce','Send milestone congratulations',a.announce!==false)+'</section>'+
   '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Member statistics</h3><p>Members can run <code>/stats</code> to view their total messages and emoji usage. Counts are not XP and are never reset by leveling changes.</p></div></div><p class="mention-help">Emoji tracking includes Unicode emoji and custom Discord emoji. The bot needs Manage Roles and its highest role must be above each reward role.</p></section><div class="panel-actions">'+button('saveAchievements','Save achievements')+'</div></div>');
  document.getElementById('saveAchievements').onclick=async()=>{
   const rows=prefix=>[0,1].map(i=>({threshold:Math.max(1,Math.min(100000000,Number(val(prefix+'Threshold'+i))||1)),roleId:val(prefix+'Role'+i)||null})).filter(x=>x.roleId);
   const result=await save(id,{achievements:{...a,enabled:yes('achEnabled'),messages:rows('msg'),emojis:rows('emoji'),announcementChannelId:val('achChannel')||null,announce:yes('achAnnounce')}});
   if(result?.success===false)throw new Error(result.error||'Save failed');alert('Achievement milestone settings saved.');
  };
  attachToggle(id,f,c);return;
 }
 if(k==='inviteTracker'){
  const it=c.inviteTracker||{},rewards=Array.isArray(it.rewards)?it.rewards:[];
  body.innerHTML=card('Invite Tracker','Track which members invite people, show invite totals and leaderboards, log joins and leaves, and optionally reward invite milestones. Based on the feature set of Invitron.', 
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
   input('itLogChannel','Invite log channel ID',it.logChannelId||'')+
   input('itReward1Count','First reward: invite threshold',rewards[0]?.threshold??5,'number')+
   input('itReward1Role','First reward: role ID',rewards[0]?.roleId||'')+
   input('itReward2Count','Second reward: invite threshold',rewards[1]?.threshold??10,'number')+
   input('itReward2Role','Second reward: role ID',rewards[1]?.roleId||'')+
   '<p class="mention-help">Feature reference: <a href="https://github.com/e-enes/invitron" target="_blank" rel="noopener noreferrer">Invitron</a>. Available commands: <code>/invites stats</code>, <code>/invites leaderboard</code>. Admins can also add, remove or reset invite counts. Fraud flags are heuristic warnings, not proof of abuse. Make sure the bot role is above any reward roles.</p>'+
   '<div class="panel-actions"><button class="select" id="saveInviteTracker" type="button">Save invite tracker</button></div></section></div>');
  document.getElementById('saveInviteTracker').onclick=async()=>{
   const rewards=[];
   for(const n of [1,2]){const threshold=Number(val('itReward'+n+'Count')),roleId=val('itReward'+n+'Role').trim();if(roleId&&Number.isInteger(threshold)&&threshold>0)rewards.push({threshold,roleId});}
   const minimumAccountAgeHours=Number(val('itMinimumAge')),rapidJoinThreshold=Number(val('itRapidThreshold')),rapidJoinWindowSeconds=Number(val('itRapidWindow'));if(!Number.isFinite(minimumAccountAgeHours)||minimumAccountAgeHours<0||minimumAccountAgeHours>8760||!Number.isInteger(rapidJoinThreshold)||rapidJoinThreshold<2||rapidJoinThreshold>100||!Number.isInteger(rapidJoinWindowSeconds)||rapidJoinWindowSeconds<10||rapidJoinWindowSeconds>3600){alert('Check fraud detection thresholds. Account age must be 0–8760 hours, join count 2–100 and window 10–3600 seconds.');return;}const next={...it,enabled:yes('itEnabled'),logJoins:yes('itLogJoins'),logLeaves:yes('itLogLeaves'),rewardRolesEnabled:yes('itRewardRoles'),fraudDetectionEnabled:yes('itFraudDetection'),minimumAccountAgeHours,rapidJoinThreshold,rapidJoinWindowSeconds,blockRewardsForFlagged:yes('itBlockFraudRewards'),logChannelId:val('itLogChannel').trim()||null,rewards};
   try{const result=await save(id,{inviteTracker:next});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Invite tracker settings saved.');await renderPanel(id,f,await load(id));}
   catch(err){alert('Could not save invite tracker settings: '+(err.message||String(err)));}
  };
  attachToggle(id,f,c);return;
 }
 if(k==='customCommands'){
  const cc=c.customCommands||{items:[]},items=Array.isArray(cc.items)?cc.items:[];
  const commandRows=items.map((x,index)=>'<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>/'+esc(x.name)+'</h3><p>'+(x.enabled===false?'Disabled':'Enabled')+' · Used '+Number(x.count||0)+' times</p></div><button type="button" class="rr-remove" data-remove-custom="'+index+'">Remove</button></div><label class="field">Response template<textarea data-custom-message="'+index+'" rows="3" maxlength="1800">'+esc(x.messageTemplate||'')+'</textarea></label><label class="field">Counter label<input data-custom-counter-label="'+index+'" maxlength="80" value="'+esc(x.counterLabel||'Count')+'"></label><label class="check"><span>Increment counter and show {count}</span><input data-custom-counter="'+index+'" type="checkbox" '+(x.counterEnabled===false?'':'checked')+'></label><label class="check"><span>Command enabled</span><input data-custom-enabled="'+index+'" type="checkbox" '+(x.enabled===false?'':'checked')+'></label><div class="panel-actions"><button class="select" type="button" data-save-custom="'+index+'">Save changes</button><button class="select" type="button" data-reset-custom="'+index+'">Reset counter</button></div></section>').join('');
  body.innerHTML=card('Custom Commands','Build real server slash commands such as /kill. Each use increments a saved counter and inserts it into your custom response text.',
   '<div class="welcome-panel"><section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Create a command</h3><p>Use letters, numbers and hyphens only. Discord command names are lowercase and cannot contain spaces.</p></div></div>'+
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
   if(items.length>=25){alert('Discord supports up to 25 custom commands in this panel. Remove one before adding another.');return;}
   const next={...cc,items:[...items,{name,messageTemplate,counterEnabled:yes('ccCounter'),counterLabel:val('ccCounterLabel').trim(),enabled:yes('ccEnabled'),count:0}]};
   try{const result=await save(id,{customCommands:next});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Custom command saved. Discord may take up to a minute to register /'+name+'.');await renderPanel(id,f,await load(id));}
   catch(err){alert('Could not save custom command: '+(err.message||String(err)));}
  };
  document.querySelectorAll('[data-save-custom]').forEach(btn=>btn.addEventListener('click',async()=>{const index=Number(btn.dataset.saveCustom),messageTemplate=document.querySelector('[data-custom-message="'+index+'"]')?.value.trim()||'';if(!messageTemplate){alert('Enter response text before saving.');return;}if(messageTemplate.length>1800){alert('Response text must be 1,800 characters or fewer.');return;}const nextItems=items.map((x,i)=>i===index?{...x,messageTemplate,counterLabel:document.querySelector('[data-custom-counter-label="'+index+'"]')?.value.trim()||'Count',counterEnabled:!!document.querySelector('[data-custom-counter="'+index+'"]')?.checked,enabled:!!document.querySelector('[data-custom-enabled="'+index+'"]')?.checked}:x);try{const result=await save(id,{customCommands:{...cc,items:nextItems}});if(result?.success===false)throw new Error(result.error||'Save failed');alert('Updated /'+nextItems[index].name+'.');await renderPanel(id,f,await load(id));}catch(err){alert('Could not update command: '+err.message);}}));
  document.querySelectorAll('[data-reset-custom]').forEach(btn=>btn.addEventListener('click',async()=>{const index=Number(btn.dataset.resetCustom);if(!confirm('Reset the saved counter for /'+items[index].name+' to zero?'))return;const nextItems=items.map((x,i)=>i===index?{...x,count:0}:x);try{const result=await save(id,{customCommands:{...cc,items:nextItems}});if(result?.success===false)throw new Error(result.error||'Save failed');await renderPanel(id,f,await load(id));}catch(err){alert('Could not reset counter: '+err.message);}}));
  document.querySelectorAll('[data-remove-custom]').forEach(btn=>btn.addEventListener('click',async()=>{const index=Number(btn.dataset.removeCustom);if(!confirm('Remove this custom slash command?'))return;const next={...cc,items:items.filter((_,i)=>i!==index)};try{const result=await save(id,{customCommands:next});if(result?.success===false)throw new Error(result.error||'Save failed');await renderPanel(id,f,await load(id));}catch(err){alert('Could not remove command: '+err.message);}}));
  attachToggle(id,f,c);return;
 }
 if(k==='economy'){body.innerHTML=card(f[1],f[2],switcher(id,f,c)+check('enabled','Enable economy',c.economy?.enabled!==false)+input('currency','Currency name',c.economy?.currency||'coins')+input('daily','Daily reward',c.economy?.daily||100,'number')+input('min','Work minimum',c.economy?.workMin||20,'number')+input('max','Work maximum',c.economy?.workMax||60,'number')+'<div class="panel-actions">'+button('save','Save economy')+'</div>');document.getElementById('save').onclick=async()=>{await save(id,{economy:{...(c.economy||{}),enabled:yes('enabled'),currency:val('currency')||'coins',daily:Number(val('daily'))||100,workMin:Number(val('min'))||20,workMax:Number(val('max'))||60}});alert('Economy saved.');};attachToggle(id,f,c);return;}
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
   try{const result=await api('/api/features/testify-suite/'+encodeURIComponent(id)+'/ticket-panel',{method:'POST',body:JSON.stringify({})});if(result?.success===false)throw new Error(result.error||'Could not publish panel');alert(result.message||'Ticket panel published.');}
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
}
async function renderEmbedsPanel(id,f,c){
 const saved=Array.isArray(c.embedTemplates)?c.embedTemplates:[];
 let fields=[];
 let selectedTemplate=-1;
 const text=(v)=>String(v||'').trim();
 const colorValue=v=>/^#[0-9a-f]{6}$/i.test(v||'')?v:'#5865f2';
 const templateOptions='<option value="">Start a new embed</option>'+saved.map((t,i)=>'<option value="'+i+'">'+esc(t.name||t.title||('Embed '+(i+1)))+'</option>').join('');
 const channelsResult=await api('/api/guild/'+encodeURIComponent(id)+'/channels').catch(()=>({channels:[]}));
 const channels=(channelsResult.channels||[]).filter(ch=>ch.type==='text');
 const publishChannelOptions='<option value="">Choose a channel to publish to</option>'+channels.map(ch=>'<option value="'+esc(ch.id)+'">#'+esc(ch.name)+'</option>').join('');
 const fieldHtml=(field,i)=>'<div class="embed-builder-field" data-embed-field="'+i+'"><div class="embed-builder-field-head"><strong>Field '+(i+1)+'</strong><button type="button" class="rr-remove" data-remove-embed-field="'+i+'">Remove</button></div><label class="field">Field name<input data-field-name="'+i+'" maxlength="256" value="'+esc(field.name||'')+'" placeholder="Field name"></label><label class="field">Field value<textarea data-field-value="'+i+'" rows="2" maxlength="1024" placeholder="Field value">'+esc(field.value||'')+'</textarea></label><label class="check"><span>Display inline</span><input data-field-inline="'+i+'" type="checkbox" '+(field.inline?'checked':'')+'></label></div>';
 body.innerHTML=card('Embed Builder','Create rich Discord embeds inspired by Embed Generator. Build a preview, save reusable templates per server, and return to edit them later.',
 '<div class="welcome-panel embed-builder-panel">'+
 '<style>.embed-builder-panel #embedDescription{display:block;width:100%;min-height:270px;height:270px;resize:vertical;line-height:1.55}.embed-builder-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);gap:14px}.embed-builder-card{border:1px solid var(--border);border-radius:14px;padding:16px;background:var(--surface2);min-width:0}.embed-builder-fields{display:grid;gap:10px}.embed-builder-field{border:1px solid var(--border);border-radius:10px;padding:12px}.embed-builder-field-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.embed-preview{border-left:4px solid #5865f2;background:var(--surface);border-radius:8px;padding:14px;min-height:180px;overflow-wrap:anywhere}.embed-preview-title{font-weight:800;font-size:16px;margin-bottom:8px}.embed-preview-desc{white-space:pre-wrap;font-size:13px;line-height:1.5}.embed-preview-footer{font-size:11px;color:var(--muted);margin-top:12px}.embed-preview img{display:block;max-width:100%;max-height:240px;object-fit:contain;border-radius:8px;margin-top:12px}.embed-preview-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.embed-preview-field strong{display:block;font-size:12px;margin-bottom:4px}.embed-preview-field span{font-size:12px;white-space:pre-wrap}.embed-preview-author{font-size:12px;font-weight:700;margin-bottom:8px}.embed-builder-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.embed-builder-actions button{flex:1;min-width:125px}.embed-builder-note{font-size:11px;color:var(--muted);line-height:1.5;margin-top:8px}@media(max-width:760px){.embed-builder-layout{grid-template-columns:1fr}.embed-preview-fields{grid-template-columns:1fr}}</style>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Saved templates</h3><p>Load a template to edit it, or create a new embed.</p></div></div><label class="field">Template<select id="embedTemplateSelect">'+templateOptions+'</select></label><div class="embed-builder-actions"><button class="select" id="newEmbedTemplate" type="button">New embed</button><button class="select" id="deleteEmbedTemplate" type="button">Delete selected</button></div></section>'+
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
 document.getElementById('publishEmbed').onclick=async()=>{const channelId=val('embedPublishChannel');const x=current();if(!channelId){alert('Choose a channel to publish the embed to.');return;}if(!x.title&&!x.description&&!x.fields.length&&!x.image&&!x.thumbnail&&!x.author&&!x.footer){alert('Add at least a title, description, field, image or footer before publishing.');return;}const isHttpUrl=value=>!value||value.startsWith('http://')||value.startsWith('https://');if(!isHttpUrl(x.url)||!isHttpUrl(x.image)||!isHttpUrl(x.thumbnail)){alert('URLs must start with http:// or https://.');return;}const btn=document.getElementById('publishEmbed');btn.disabled=true;const oldLabel=btn.textContent;btn.textContent='Publishing…';try{const result=await api('/api/guild/'+encodeURIComponent(id)+'/embeds/send',{method:'POST',body:JSON.stringify({channelId,embed:x})});if(result?.success===false)throw new Error(result.error||'Publish failed');alert('Embed published to #'+(result.channelName||'the selected channel')+'.');}catch(err){alert('Could not publish embed: '+(err.message||String(err)));}finally{btn.disabled=false;btn.textContent=oldLabel;}};
 document.getElementById('copyEmbedJson').onclick=()=>{const x=current();const payload={title:x.title||undefined,url:x.url||undefined,description:x.description||undefined,color:x.color,author:x.author?{name:x.author}:undefined,footer:x.footer?{text:x.footer}:undefined,thumbnail:x.thumbnail?{url:x.thumbnail}:undefined,image:x.image?{url:x.image}:undefined,timestamp:x.timestamp?new Date().toISOString():undefined,fields:x.fields.length?x.fields:undefined};const json=JSON.stringify(payload,null,2);if(navigator.clipboard?.writeText)navigator.clipboard.writeText(json).then(()=>alert('Embed JSON copied.')).catch(()=>prompt('Copy embed JSON:',json));else prompt('Copy embed JSON:',json);};
 document.getElementById('saveEmbedTemplate').onclick=async()=>{const x=current();if(!x.title&&!x.description&&!x.fields.length&&!x.image&&!x.thumbnail&&!x.author&&!x.footer){alert('Add at least a title, description, field, image or footer before saving.');return;}if(x.description.length>4096||x.fields.some(field=>field.name.length>256||field.value.length>1024)){alert('One or more fields exceed Discord embed limits.');return;}if(x.url&&!/^https?:\/\//i.test(x.url)||x.image&&!/^https?:\/\//i.test(x.image)||x.thumbnail&&!/^https?:\/\//i.test(x.thumbnail)){alert('URLs must start with http:// or https://.');return;}if(selectedTemplate>=0)saved[selectedTemplate]=x;else{saved.push(x);selectedTemplate=saved.length-1;}try{const result=await save(id,{embedTemplates:saved});if(result?.success===false)throw new Error(result.error||'Save failed');refreshTemplateOptions();alert('Embed template saved for this server.');}catch(err){alert('Could not save embed template: '+(err.message||String(err)));}};
 loadTemplate(null);
}
async function renderCommands(id,f,c){
 const groups={Information:['avatar','userinfo','serverinfo','profile','rank','roleinfo','botinfo','membercount','permissions'],Economy:['daily','beg','deposit','withdraw','inventory','shop','buy','give','rob','crime','pet'],Fun:['poll','calculator','ascii','advice','dadjoke','wouldyourrather','hack','relationship'],Moderation:['purge','softban','unban','clearwarnings','slowmode','lock','unlock','nickname','role','announce','say','thread'],AutoMod:['automod','automodwords','automodlinks','automodspam'],Configuration:['auditlog','setprefix','sticky','unsticky','counting','welcome','autorole','verify','toggle','ticket'],Levels:['levelrewards','setlevelreward','resetxp'],Administration:['blacklist','unblacklist','reloadconfig','debug','guildlist','botstats']};
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
 root.innerHTML='<div class="panel-head"><div><div class="eyebrow">Essentials</div><div class="panel-title">All features available</div><div class="panel-sub">Feature switches have been removed. All dashboard features are available while we work on the configuration controls separately.</div></div></div>'+featureGroups().map(group=>'<div class="overview-feature-group"><h2>'+esc(group.name)+'</h2><div class="overview-feature-grid">'+group.items.map(f=>'<article class="overview-feature-card"><div class="overview-feature-top"><div class="overview-feature-icon">'+icon(f[3])+'</div><div class="overview-feature-copy"><strong>'+esc(f[1])+'</strong><span>'+esc(f[2])+'</span></div></div></article>').join('')+'</div></div>').join('');
}
async function buildNavigation(){
 if(!navigation)return;
 const id=guildId();let c={plugins:{}};
 if(id){try{c=await load(id);const allEnabled=Object.fromEntries(all().map(f=>[f[0],true]));await save(id,{plugins:allEnabled});c.plugins={...(c.plugins||{}),...allEnabled};}catch(err){console.warn('[dashboard] feature config',err);}}
 navigation.innerHTML='';
 const main=document.createElement('div');main.className='nav-title';main.textContent='Main';navigation.appendChild(main);
 const nav=document.createElement('nav');nav.className='nav';
 const overviewButton=document.createElement('button');overviewButton.type='button';overviewButton.dataset.section='overview';overviewButton.innerHTML='<span class="icon">'+icon('house')+'</span>Overview';overviewButton.onclick=()=>select('overview');nav.appendChild(overviewButton);navigation.appendChild(nav);
 FEATURES.forEach(group=>{
   const visible=group[1];
   if(!visible.length)return;
   const heading=document.createElement('div');heading.className='nav-title';heading.textContent=group[0];navigation.appendChild(heading);
   const groupNav=document.createElement('nav');groupNav.className='nav';
   visible.forEach(f=>{const b=document.createElement('button');b.type='button';b.dataset.section=f[0];b.innerHTML='<span class="icon">'+icon(f[3])+'</span>'+esc(f[1]);b.onclick=()=>select(f[0]);groupNav.appendChild(b);});
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
