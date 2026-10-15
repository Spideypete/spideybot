const express=require('express');
const {requireFeatureAuth}=require('../../routes/feature-auth.cjs');
const svc=require('./testify-suite.service.cjs');
const customSlashRuntime=require('../custom-commands/custom-slash-runtime.cjs');
const router=express.Router();

router.use(requireFeatureAuth);

function getGuild(req){
  return String(req.params.guildId||req.query.guildId||req.featureGuildId||req.session.selectedGuildId||'').trim();
}
function sendConfig(res,id){
  if(!id)return res.status(400).json({success:false,error:'Missing guildId'});
  return res.json({success:true,config:svc.get(id),xp:svc.topXp(id),money:svc.topMoney(id)});
}

router.get('/',(req,res)=>sendConfig(res,getGuild(req)));
router.get('/:guildId',(req,res)=>sendConfig(res,getGuild(req)));

async function saveGuildSettings(req,res){
  const id=getGuild(req);
  if(!id)return res.status(400).json({success:false,error:'Missing guildId'});
  const patch=req.body||{};
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
