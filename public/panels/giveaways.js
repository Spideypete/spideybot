import {box,field,button,val,apiFactory,mount,row,esc,safeAlert,on} from './panel-kit.js';
export async function render({body,gid}){
  const api=apiFactory(gid);
  const d=await api('/api/features/giveaways/'+gid);
  const active=d.active||[], ended=d.ended||[];
  mount({body,content:
    box('Create Giveaway',field('prize','Prize')+field('duration','Duration (minutes)','60','number')+field('winners','Number of winners','1','number')+button('create-giveaway','Start Giveaway'),{icon:'gift'})+
    box('Active Giveaways',active.length?active.map(g=>row(esc(g.prize||g.title||'Giveaway'),esc(g.id)+' · '+esc(g.winners||1)+' winners',button('end-'+esc(g.id),'End','secondary')+' '+button('del-'+esc(g.id),'Delete','danger'))).join(''):'No active giveaways.',{icon:'gift'})+
    box('Ended Giveaways',ended.length?ended.map(g=>row(esc(g.prize||g.title||'Giveaway'),esc(g.id),button('reroll-'+esc(g.id),'Reroll'))).join(''):'No ended giveaways.',{icon:'check-circle'})
  });
  on('create-giveaway',async()=>{try{await api('/api/features/giveaways/'+gid,{method:'POST',body:JSON.stringify({prize:val('prize'),duration:Number(val('duration'))*60000,winners:Number(val('winners'))||1})});await render({body,gid})}catch(e){safeAlert(e)}});
  active.forEach(g=>{
    on('end-'+g.id,async()=>{try{await api('/api/features/giveaways/'+gid+'/'+encodeURIComponent(g.id)+'/end',{method:'POST',body:'{}'});await render({body,gid})}catch(e){safeAlert(e)}});
    on('del-'+g.id,async()=>{try{if(confirm('Delete giveaway?')){await api('/api/features/giveaways/'+gid+'/'+encodeURIComponent(g.id),{method:'DELETE'});await render({body,gid})}}catch(e){safeAlert(e)}});
  });
  ended.forEach(g=>on('reroll-'+g.id,async()=>{try{await api('/api/features/giveaways/'+gid+'/'+encodeURIComponent(g.id)+'/reroll',{method:'POST',body:'{}'});await render({body,gid})}catch(e){safeAlert(e)}}));
}
