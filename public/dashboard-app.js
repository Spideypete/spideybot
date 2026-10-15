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
 if(!document.getElementById('welcome-panel-styles')){const ws=document.createElement('style');ws.id='welcome-panel-styles';ws.textContent=".welcome-panel{display:grid;gap:14px}.welcome-section-disabled{opacity:.48}.welcome-section-disabled .welcome-section-heading{opacity:1}.rr-entry{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid var(--border);border-radius:10px;margin-top:8px}.rr-entry p{font-size:11px;color:var(--muted);margin-top:4px}.rr-remove{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:8px;padding:7px 10px;cursor:pointer}.rr-mapping{margin-top:16px;border-top:1px solid var(--border);padding-top:14px}.rr-mapping h4{font-size:12px;margin-bottom:8px}.rr-mapping-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.rr-options{display:grid;gap:8px;margin-top:12px}.welcome-message-section{border:1px solid var(--border);border-radius:14px;padding:16px;background:var(--surface2)}.welcome-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}.welcome-section-heading h3{font-size:13px;font-weight:850}.welcome-section-heading p,.command-help p{font-size:11px;color:var(--muted);margin-top:4px}.welcome-section-heading .check{border:0;padding:0;gap:10px}.welcome-message-section .field{margin:10px 0}.welcome-message-section .field input,.welcome-message-section .field textarea,.welcome-message-section .field select,.mention-tools select{display:block;width:100%;margin-top:5px;min-height:40px;border:1px solid var(--border);border-radius:10px;padding:9px 10px;background:var(--surface);color:var(--text);font:inherit;font-size:12px}.welcome-message-section .field textarea{resize:vertical;line-height:1.5}.welcome-message-section [hidden]{display:none!important}.word-counter{display:block;text-align:right;color:var(--muted);font-size:10px;margin-top:4px}.word-counter.over-limit{color:#d97706}.mention-tools{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;align-items:center;margin:0 0 12px}.mention-tools>span,.mention-help{grid-column:1/-1;font-size:10px;color:var(--muted)}.mention-tools button{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:9px;padding:0 11px;min-height:38px;font-size:11px;font-weight:750;cursor:pointer}.mention-tools select{margin:0}.mention-help{line-height:1.5}.embed-two-col{display:grid;grid-template-columns:140px minmax(0,1fr);gap:12px}.command-help{border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--surface)}.welcome-panel .panel-actions{margin-top:4px}@media(max-width:620px){.mention-tools{grid-template-columns:1fr}.mention-tools button{min-height:38px}.embed-two-col{grid-template-columns:1fr}.welcome-section-heading{flex-direction:column}}";document.head.appendChild(ws);}

 if(document.getElementById('integrated-dashboard-styles'))return;
 const s=document.createElement('style');s.id='integrated-dashboard-styles';
 s.textContent='.field{display:block;font-size:11px;font-weight:750;color:var(--muted);margin:10px 0}.field input{display:block;width:100%;margin-top:5px;min-height:40px;border:1px solid var(--border);border-radius:10px;padding:9px 10px;background:var(--surface);color:var(--text)}.check{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid var(--border);font-size:12px;font-weight:700}.check input{width:18px;height:18px}.panel-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.command-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.command-item{padding:12px;border:1px solid var(--border);border-radius:11px;background:var(--surface-2)}.feature-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;padding:12px 14px;border:1px solid var(--border);border-radius:13px;background:var(--surface-2)}.feature-toggle>span{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.7px}.feature-toggle button{position:relative;width:48px;height:26px;border:0;border-radius:999px;background:#9ca3b8;padding:0;transition:background .12s ease,box-shadow .12s ease;cursor:pointer}.feature-toggle button:before{content:\"\";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .12s ease}.feature-toggle button.on{background:var(--petrol);box-shadow:0 0 0 3px color-mix(in srgb,var(--petrol) 16%,transparent)}.feature-toggle button.on:before{transform:translateX(22px)}.feature-toggle button:disabled{opacity:.7;cursor:wait}.overview-feature-group{margin-top:18px}.overview-feature-group h2{font-size:16px;font-weight:800;margin-bottom:10px}.overview-feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.overview-feature-card{padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--surface);transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}.overview-feature-card:hover{transform:translateY(-1px);box-shadow:var(--shadow)}.overview-feature-top{display:flex;align-items:flex-start;gap:11px}.overview-feature-icon{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;background:var(--accent-soft);color:var(--purple)}.dark .overview-feature-icon{background:var(--accent-soft);color:var(--purple)}.overview-feature-copy{min-width:0;flex:1}.overview-feature-copy strong{display:block;font-size:12px}.overview-feature-copy span{display:block;font-size:10px;color:var(--muted);margin-top:3px;line-height:1.45}.overview-feature-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:14px}.overview-feature-status{font-size:10px;font-weight:800;color:var(--muted)}.overview-feature-card.is-on .overview-feature-status{color:var(--petrol)}.overview-feature-card.is-off{opacity:.82}.overview-toggle{position:relative;width:42px;height:23px;border:0;border-radius:999px;background:#9ca3b8;cursor:pointer;transition:background .12s ease}.overview-toggle:before{content:\"\";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;transition:transform .12s ease}.overview-toggle.on{background:var(--petrol)}.overview-toggle.on:before{transform:translateX(19px)}.overview-toggle:disabled{opacity:.7;cursor:wait}.nav button.feature-disabled{opacity:.48}.nav button.feature-disabled:after{content:\"OFF\";margin-left:auto;font-size:8px;font-weight:800;letter-spacing:.5px;padding:3px 6px;border-radius:999px;background:var(--surface-2);color:var(--muted)}@media(max-width:900px){.overview-feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.command-grid{grid-template-columns:1fr}.overview-feature-grid{grid-template-columns:1fr}}';
 document.head.appendChild(s);
}
function switcher(id,f,c){
 const on=enabled(c,f);
 return '<div class="feature-toggle"><span>'+esc(on?'Enabled':'Disabled')+'</span><button type="button" class="'+(on?'on':'')+'" data-feature-toggle="'+f[0]+'"></button></div>';
}
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
function attachToggle(id,f,c){
 const el=document.querySelector('[data-feature-toggle]');
 if(!el)return;
 el.addEventListener('click',async e=>{
   const current=await load(id).catch(()=>c);
   const next=!enabled(current,f);
   e.currentTarget.disabled=true;
   try{
     await save(id,{plugins:{[f[0]]:next}});
     refreshToggleUI(f,next);
     c.plugins={...(c.plugins||{}),[f[0]]:next};
   }catch(err){
     e.currentTarget.disabled=false;
     alert(err.message);
   }
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
 return '<section class="welcome-message-section" id="'+prefix+'Content"><div class="welcome-section-heading"><div><h3>'+esc(label)+'</h3><p>Sent '+(prefix==='welcome'?'when a member joins':'when a member leaves')+'.</p></div>'+check(prefix+'Enabled','Enable '+label.toLowerCase(),enabled)+'</div>'+
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
 const welcomeType=sm.welcomeType||(sm.welcomeEmbed?'embed':'text');
 const goodbyeType=sm.goodbyeType||(sm.goodbyeEmbed?'embed':'text');
 const bodyHtml=messageSection('welcome','Welcome message',sm.enableWelcome??sm.welcomeEnabled??false,sm.welcomeChannel||'',welcomeType,sm.welcomeMessage??'Welcome {user} to {server}! 🎉',sm.welcomeEmbed,channels,roles)+
 messageSection('goodbye','Goodbye message',sm.enableGoodbye??sm.goodbyeEnabled??false,sm.goodbyeChannel||'',goodbyeType,sm.goodbyeMessage??'{user} has left {server}. 👋',sm.goodbyeEmbed,channels,roles)+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Automatic welcome role</h3><p>Give every new member this role automatically.</p></div>'+check('autoroleEnabled','Enable automatic role',!!(sm.autoroleEnabled??sm.enableAutorole??c.autorole?.enabled))+'</div><label class="field">Role to assign<select id="autoroleRole">'+optionList(roles,sm.autoroleRole||sm.autoroleRoleId||c.autorole?.roleId||'','Choose a role')+'</select></label><p class="mention-help">SPIDEY BOT needs Manage Roles, and its highest role must be above the selected role.</p></section>'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Admin commands</h3><p>Administrative configuration only. These settings do not change who can run the commands.</p></div></div>'+input('prefix','Prefix (admin use)',c.prefix||'!')+'<div class="command-help"><strong>Existing Discord commands</strong><p>Use your configured welcome/goodbye commands in Discord. In message text, {user} tags the member; inserted channel and role mentions remain clickable.</p></div></section>'+
 '<div class="panel-actions"><button class="select" id="saveWelcomeSettings" type="button">Save welcome & goodbye settings</button></div>';
 body.innerHTML=card('Welcome & Goodbye','Configure join and leave messages, mentions, embeds and automatic roles.',switcher(id,f,c)+'<div class="welcome-panel">'+bodyHtml+'</div>');
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
 const updateMessageSectionState=key=>{const enabled=yes(key+'Enabled');const section=document.getElementById(key+'Content');if(!section)return;section.querySelectorAll('input,select,textarea,button').forEach(el=>{if(el.id!==key+'Enabled')el.disabled=!enabled;});section.classList.toggle('welcome-section-disabled',!enabled);};
 ['welcome','goodbye'].forEach(key=>{
  const toggle=document.getElementById(key+'Enabled');
  toggle.addEventListener('change',async()=>{
   const enabled=toggle.checked;
   updateMessageSectionState(key);
   toggle.disabled=true;
   try{
    await api('/api/config/server-messages?guildId='+encodeURIComponent(id),{
     method:'POST',
     body:JSON.stringify({[key+'Enabled']:enabled,[key==='welcome'?'enableWelcome':'enableGoodbye']:enabled})
    });
   }catch(err){
    toggle.checked=!enabled;
    updateMessageSectionState(key);
    alert('Could not '+(enabled?'enable ':'disable ')+key+': '+(err.message||String(err)));
   }finally{toggle.disabled=false;}
  });
  updateMessageSectionState(key);
 });
 document.getElementById('saveWelcomeSettings').onclick=async()=>{
  const messages={welcome:val('welcomeType')==='embed'?'':val('welcomeText'),goodbye:val('goodbyeType')==='embed'?'':val('goodbyeText')};
  const embeds={welcome:val('welcomeType')==='embed'?makeEmbed('welcome'):null,goodbye:val('goodbyeType')==='embed'?makeEmbed('goodbye'):null};
  if(wordCount(val('welcomeText'))>500||wordCount(val('goodbyeText'))>500||wordCount(val('welcomeDescription'))>500||wordCount(val('goodbyeDescription'))>500){alert('Each message or embed description must be 500 words or fewer.');return;}
  const settings={
   welcomeEnabled:yes('welcomeEnabled'),welcomeChannel:val('welcomeChannel')||null,welcomeMessage:messages.welcome,welcomeEmbed:embeds.welcome,welcomeType:val('welcomeType'),
   goodbyeEnabled:yes('goodbyeEnabled'),goodbyeChannel:val('goodbyeChannel')||null,goodbyeMessage:messages.goodbye,goodbyeEmbed:embeds.goodbye,goodbyeType:val('goodbyeType'),
   autoroleEnabled:yes('autoroleEnabled'),autoroleRole:val('autoroleRole')||null
  };
  for(const key of ['welcome','goodbye']){
   if(settings[key+'Enabled']&&!settings[key+'Channel']){alert('Choose a channel for the '+key+' message or disable it.');return;}
   if(!settings[key+'Enabled'])continue;
   if(settings[key+'Type']==='text'&&!String(settings[key+'Message']||'').trim()){alert('Enter the '+key+' message or disable it.');return;}
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
 const entries=Array.isArray(rr.entries)?rr.entries:[];
 const entryRows=entries.map((e,i)=>'<div class="rr-entry"><div><strong>'+esc(e.emoji||'😀')+' → '+esc(e.roleName||roles.find(r=>r.id===e.roleId)?.name||'Role')+'</strong><p>#'+esc(e.channelName||channels.find(ch=>ch.id===e.channelId)?.name||'channel')+' · Message '+esc(e.messageId||'')+'</p></div><button type="button" class="rr-remove" data-remove-rr="'+i+'">Remove</button></div>').join('');
 const channelOptions=optionList(channels,'','Choose a text channel');
 const roleOptions=optionList(roles,'','Choose a role');
 const enabledNow=rr.enabled!==false;
 body.innerHTML=card('Reaction Roles','Create custom text/embed messages and map emoji reactions to server roles. Settings apply only to the selected server.',switcher(id,f,c)+
 '<div class="welcome-panel reaction-roles-panel">'+
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Reaction roles status</h3><p>Disable to pause the feature; configuration stays saved.</p></div>'+check('rrEnabled','Enable Reaction Roles',enabledNow)+'</div></section>'+
 '<div id="rrConfigContent" '+(enabledNow?'':'hidden')+'>'+
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
 '<section class="welcome-message-section"><div class="welcome-section-heading"><div><h3>Existing reaction roles</h3><p>Manage role mappings already configured for this server.</p></div></div>'+(entryRows||'<p class="mention-help">No reaction roles have been created yet.</p>')+'</section></div></div>');
 const toggleContent=()=>{document.getElementById('rrConfigContent').hidden=!yes('rrEnabled');};
 const rrToggle=document.getElementById('rrEnabled');
 rrToggle.addEventListener('change',async()=>{
  const enabled=rrToggle.checked;
  toggleContent();
  rrToggle.disabled=true;
  try{
   const result=await api('/api/bot-config/react-roles/settings?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({enabled})});
   if(result.success!==true)throw new Error(result.error||result.message||'The server did not confirm the setting');
   if(result.config&&result.config.enabled!==enabled)throw new Error('The server returned a different enabled state');
  }catch(e){
   rrToggle.checked=!enabled;
   toggleContent();
   alert('Could not '+(enabled?'enable':'disable')+' Reaction Roles: '+(e.message||String(e)));
  }finally{rrToggle.disabled=false;}
 });
 document.getElementById('rrMessageAction').addEventListener('change',()=>{const existing=val('rrMessageAction')==='existing';document.getElementById('rrCreateMessage').hidden=existing;document.getElementById('rrExistingMessage').hidden=!existing;});
 document.getElementById('rrType').addEventListener('change',()=>{const embed=val('rrType')==='embed';document.getElementById('rrTextPanel').hidden=embed;document.getElementById('rrEmbedPanel').hidden=!embed;});
 document.querySelectorAll('[data-rr-insert]').forEach(btn=>btn.addEventListener('click',()=>{const type=btn.dataset.rrInsert;const target=document.getElementById('rrMessageText');let value='';if(type==='user'&&/^\\d{17,20}$/.test(val('rrMentionUser').trim()))value='<@'+val('rrMentionUser').trim()+'>';if(type==='user'&&!value){alert('Enter a valid Discord user ID first.');return;}if(type==='channel'&&val('rrMentionChannel'))value='<#'+val('rrMentionChannel')+'>';if(type==='role'&&val('rrMentionRole'))value='<@&'+val('rrMentionRole')+'>';if(!value)return;const start=target.selectionStart??target.value.length,end=target.selectionEnd??start;target.value=target.value.slice(0,start)+value+target.value.slice(end);target.focus();target.selectionStart=target.selectionEnd=start+value.length;}));
 document.getElementById('rrResolveIds').addEventListener('click',()=>{const channelIds=new Set(channels.map(x=>String(x.id))),roleIds=new Set(roles.map(x=>String(x.id)));const el=document.getElementById('rrMessageText');el.value=el.value.replace(/\b\d{17,20}\b/g,raw=>channelIds.has(raw)?'<#'+raw+'>':roleIds.has(raw)?'<@&'+raw+'>':raw);});
 const saveSettings=async()=>api('/api/bot-config/react-roles/settings?guildId='+encodeURIComponent(id),{method:'POST',body:JSON.stringify({allowMultiple:yes('rrAllowMultiple'),removeOnUnreact:yes('rrRemoveOnUnreact'),dmConfirm:yes('rrDmConfirm'),enabled:yes('rrEnabled'),language:val('rrLanguage')||'en',updateNotifications:yes('rrUpdateNotifications'),errorReporting:yes('rrErrorReporting'),notificationChannelId:val('rrNotificationChannel')||null})});
 document.getElementById('rrSaveSettings').onclick=async()=>{try{await saveSettings();alert('Reaction role settings saved.');}catch(e){alert('Could not save settings: '+e.message);}};
 document.getElementById('rrCreateSave').onclick=async()=>{
  if(!yes('rrEnabled')){alert('Enable Reaction Roles first.');return;}
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
   try{
     await save(id,{plugins:{[key]:next}});
     c.plugins={...(c.plugins||{}),[key]:next};
     document.querySelectorAll('[data-section="'+key+'"]').forEach(b=>b.classList.toggle('feature-disabled',!next));
   }
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
