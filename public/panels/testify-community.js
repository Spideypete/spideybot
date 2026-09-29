import {apiFactory,box,field,area,toggle,button,grid,mount,on,val,checked,notice} from './panel-kit.js';
export async function render({body,gid}){
 const api=apiFactory(gid),d=await api('/api/features/testify-suite/'+gid),c=d.config||{},w=c.welcome||{},a=c.autorole||{},v=c.verification||{};
 mount({body,content:grid([
  box('Welcome & Join Messages',field('tcWelcomeChannel','Channel ID',w.channelId||'')+field('tcWelcomeMessage','Message',w.message||'Welcome {user} to {server}! We now have {membercount} members.')+toggle('tcWelcome','Enabled',!!w.enabled)+button('tcSaveWelcome','Save Welcome')),
  box('Autorole & Verification',field('tcAutoroleRole','Autorole role ID',a.roleId||'')+toggle('tcAutorole','Autorole enabled',!!a.enabled)+field('tcVerifyRole','Verification role ID',v.roleId||'')+button('tcSaveJoin','Save Join Controls')),
  box('Counting & Sticky',notice('Counting and sticky data are stored in the same guild configuration used by the Discord commands. Configure the live channel behaviour with the Config commands or extend this panel when those channel-specific controls are connected.'))
 ])});
 on('tcSaveWelcome',async()=>{await api('/api/features/testify-suite/'+gid,{method:'PUT',body:JSON.stringify({welcome:{...w,enabled:checked('tcWelcome'),channelId:val('tcWelcomeChannel'),message:val('tcWelcomeMessage')}})});alert('Welcome settings saved.');});
 on('tcSaveJoin',async()=>{await api('/api/features/testify-suite/'+gid,{method:'PUT',body:JSON.stringify({autorole:{...a,enabled:checked('tcAutorole'),roleId:val('tcAutoroleRole')},verification:{roleId:val('tcVerifyRole')}})});alert('Join controls saved.');});
}