import{box,apiFactory,mount,safeAlert}from'./panel-kit.js';
export async function loadFeature(body,gid,title,sub,renderFields,buildPatch){
 if(!gid)throw new Error('No server selected. Open this dashboard from a selected Discord server.');
 const api=apiFactory(gid),d=await api('/api/features/testify-suite/'+encodeURIComponent(gid)),c=d.config||{};
 mount({body,content:box(title,renderFields(d,c),{icon:'sliders-horizontal',sub})});
 const save=document.getElementById('save');
 if(save)save.onclick=async()=>{try{await api('/api/features/testify-suite/'+encodeURIComponent(gid),{method:'PUT',body:JSON.stringify(buildPatch(c,d))});await loadFeature(body,gid,title,sub,renderFields,buildPatch);alert('Changes saved.')}catch(e){safeAlert(e)}};
 return d;
}