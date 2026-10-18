const express=require('express');
const {requireFeatureAuth}=require('../../routes/feature-auth.cjs');
const svc=require('./spidey-suite.service.cjs');
const customSlashRuntime=require('../custom-commands/custom-slash-runtime.cjs');
const subscriptionManager=require('../../../services/subscription.manager.js');
const {getGuildConfig}=require('../../config/config-manager.cjs');
const router=express.Router();

router.use(requireFeatureAuth);

function getGuild(req){
  return String(req.params.guildId||req.query.guildId||req.featureGuildId||req.session.selectedGuildId||'').trim();
}
function sendConfig(res,id){
  if(!id)return res.status(400).json({success:false,error:'Missing guildId'});
  const config=svc.get(id);
  const guildMeta=getGuildConfig(id)||{};
  const policy=subscriptionManager.getGuildPlanPolicy(id);
  // Always send the server's authoritative subscription alongside its dashboard settings.
  // The plan lives on the guild record, not inside the spideySuite settings blob.
  config.tier=policy.tier;
  config.tierEndDate=guildMeta.tierEndDate||null;
  config.tierDurationMonths=guildMeta.tierDurationMonths||0;
  config.planPolicy=Object.fromEntries(Object.entries(policy).map(([key,value])=>[key,value===Infinity?null:value]));
  return res.json({success:true,config,xp:svc.topXp(id),money:svc.topMoney(id)});
}

router.get('/',(req,res)=>sendConfig(res,getGuild(req)));
router.get('/:guildId',(req,res)=>sendConfig(res,getGuild(req)));

async function saveGuildSettings(req,res){
  const id=getGuild(req);
  if(!id)return res.status(400).json({success:false,error:'Missing guildId'});
  const patch={...(req.body||{})};
  const policy=subscriptionManager.getGuildPlanPolicy(id);
  const current=svc.get(id);
  const rejectLimit=(label,limit)=>res.status(403).json({success:false,error:'This server has reached its '+limit+' '+label+' limit for the '+policy.tier.toUpperCase()+' plan.',upgradeRequired:true,limit,currentTier:policy.tier});
  // Subscription fields are owned by the Owner Console / payment verification only.
  delete patch.tier;delete patch.tierEndDate;delete patch.tierDurationMonths;delete patch.planPolicy;
  if(patch.plugins&&typeof patch.plugins==='object'&&!Array.isArray(patch.plugins)){
    for(const feature of ['music','polls','emojis']) if(!subscriptionManager.isPlanFeatureAllowed(id,feature)) patch.plugins[feature]=false;
  }
  if(Object.prototype.hasOwnProperty.call(patch,'polls')&&!policy.polls&&JSON.stringify(patch.polls)!==JSON.stringify(current.polls)){
    return res.status(403).json({success:false,error:'Polls require Premium or Pro for this server.',upgradeRequired:true,currentTier:policy.tier});
  }
  if(Object.prototype.hasOwnProperty.call(patch,'customCommands')){
    const currentItems=Array.isArray(current.customCommands?.items)?current.customCommands.items:[];
    const nextItems=Array.isArray(patch.customCommands?.items)?patch.customCommands.items:[];
    if(nextItems.length>policy.customCommands&&nextItems.length>currentItems.length)return rejectLimit('custom commands',policy.customCommands);
  }
  if(Object.prototype.hasOwnProperty.call(patch,'embedTemplates')){
    const currentTemplates=Array.isArray(current.embedTemplates)?current.embedTemplates:[];
    const nextTemplates=Array.isArray(patch.embedTemplates)?patch.embedTemplates:[];
    if(nextTemplates.length>policy.embedMessages&&nextTemplates.length>currentTemplates.length)return rejectLimit('saved embed messages',policy.embedMessages);
    if(!policy.embedStyling){
      patch.embedTemplates=nextTemplates.map(template=>({...template,color:'#5865f2',image:'',thumbnail:'',footer:''}));
    }
  }
  if(Object.prototype.hasOwnProperty.call(patch,'customCommands')){
    const current=svc.get(id).customCommands||{};
    const previousItems=Array.isArray(current.items)?current.items:[];
    const nextItems=Array.isArray(patch.customCommands?.items)?patch.customCommands.items:[];
    try{
      await customSlashRuntime.syncGuildCustomSlashCommands(req.botClient,id,previousItems,nextItems);
    }catch(err){
      return res.status(400).json({success:false,error:'Could not register custom slash commands: '+(err.message||String(err))});
    }
  }
  return res.json({success:true,config:svc.save(id,patch)});
}
router.put('/',saveGuildSettings);
router.put('/:guildId',saveGuildSettings);

router.post('/:guildId/toggle',(req,res)=>{
  const id=getGuild(req);
  if(!id)return res.status(400).json({success:false,error:'Missing guildId'});
  if(!req.body?.command)return res.status(400).json({success:false,error:'command is required'});
  return res.json({success:true,toggles:svc.toggle(id,req.body.command,req.body.enabled!==false)});
});


router.post('/:guildId/ticket-panel', async (req,res)=>{
  const id=getGuild(req);
  if(!id)return res.status(400).json({success:false,error:'Missing guildId'});
  const selected=(req.session.guilds||[]).find(g=>g.id===id);
  if(!selected)return res.status(403).json({success:false,error:'No access to this server'});
  let permissions=0n;
  try{permissions=BigInt(selected.permissions||0);}catch(_){}
  if((permissions & 8n)===0n)return res.status(403).json({success:false,error:'Administrator permission is required to publish a ticket panel'});
  const client=req.botClient;
  const guild=client?.guilds?.cache?.get(id);
  if(!guild)return res.status(404).json({success:false,error:'Bot is not connected to this server'});
  try{
    const tickets=require('../tickets/ticketing.runtime.cjs');
    const channel=await tickets.publish(guild);
    return res.json({success:true,message:'Ticket panel published in #'+channel.name+'.',channelId:channel.id});
  }catch(err){
    return res.status(400).json({success:false,error:err.message||'Could not publish ticket panel'});
  }
});
module.exports=router;
