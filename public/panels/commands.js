import {box,field,area,select,toggle,button,val,checked,apiFactory,mount,row,esc,safeAlert,on} from './panel-kit.js';
export async function render({body,gid}){
  const api=apiFactory(gid);
  const [custom,cats,builtin]=await Promise.all([api('/api/features/custom-commands/'+gid),api('/api/features/custom-commands/'+gid+'/categories'),fetch('/api/commands',{credentials:'include'}).then(r=>r.ok?r.json():{}).catch(()=>({}))]);
  const commands=Array.isArray(custom)?custom:(custom?.commands||[]);
  const builtins=Array.isArray(builtin)?builtin:(builtin?.commands||builtin||{});
  const opts=(Array.isArray(cats)?cats:[]).map(x=>({value:x,label:x}));
  mount({body,content:
    box('Custom Command Builder',field('name','Command Name')+area('response','Response')+field('description','Description')+field('aliases','Aliases (comma separated)')+field('cooldown','Cooldown (seconds)','0','number')+select('category','Category',opts.concat([{value:'general',label:'general'}]),'general')+field('allowed','Allowed Role IDs (comma separated)')+toggle('enabled','Enabled',true)+button('create-custom-command','Create Command'),{icon:'terminal-window'})+
    box('Your Custom Commands',commands.length?commands.map(c=>row('<i class="ph-bold ph-terminal"></i> /'+esc(c.name),esc(c.description||c.response||'No description'),button('toggle-'+esc(c.name),c.enabled?'Disable':'Enable',c.enabled?'secondary':'primary')+' '+button('delete-'+esc(c.name),'Delete','danger'))).join(''):'No custom commands yet.',{icon:'terminal-window'})+
    box('Built-in Command Catalog',Object.entries(builtins).map(([name,m])=>row('/'+esc(name),esc(typeof m==='string'?m:(m?.description||'')))).join('')||'Built-in command catalog unavailable.',{icon:'list-bullets'})
  });
  on('create-custom-command',async()=>{try{await api('/api/features/custom-commands/'+gid,{method:'POST',body:JSON.stringify({name:val('name').trim(),response:val('response'),description:val('description'),aliases:val('aliases').split(',').map(x=>x.trim()).filter(Boolean),cooldown:Number(val('cooldown'))||0,category:val('category'),allowedRoles:val('allowed').split(',').map(x=>x.trim()).filter(Boolean),enabled:checked('enabled')})});await render({body,gid})}catch(e){safeAlert(e)}});
  commands.forEach(c=>{on('toggle-'+c.name,async()=>{try{await api('/api/features/custom-commands/'+gid+'/'+encodeURIComponent(c.name)+'/toggle',{method:'POST'});await render({body,gid})}catch(e){safeAlert(e)}});on('delete-'+c.name,async()=>{try{if(confirm('Delete this custom command?')){await api('/api/features/custom-commands/'+gid+'/'+encodeURIComponent(c.name),{method:'DELETE'});await render({body,gid})}}catch(e){safeAlert(e)}})});
}
