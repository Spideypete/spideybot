const express=require('express');
const {requireFeatureAuth}=require('../../routes/feature-auth.cjs');
const svc=require('./testify-suite.service.cjs');
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

router.put('/',(req,res)=>{
  const id=getGuild(req);
  if(!id)return res.status(400).json({success:false,error:'Missing guildId'});
  return res.json({success:true,config:svc.save(id,req.body||{})});
});
router.put('/:guildId',(req,res)=>{
  const id=getGuild(req);
  if(!id)return res.status(400).json({success:false,error:'Missing guildId'});
  return res.json({success:true,config:svc.save(id,req.body||{})});
});

router.post('/:guildId/toggle',(req,res)=>{
  const id=getGuild(req);
  if(!id)return res.status(400).json({success:false,error:'Missing guildId'});
  if(!req.body?.command)return res.status(400).json({success:false,error:'command is required'});
  return res.json({success:true,toggles:svc.toggle(id,req.body.command,req.body.enabled!==false)});
});

module.exports=router;
