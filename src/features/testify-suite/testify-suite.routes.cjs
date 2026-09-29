const express=require('express');
const {requireFeatureAuth}=require('../../routes/feature-auth.cjs');
const svc=require('./testify-suite.service.cjs');
const router=express.Router();
router.use(requireFeatureAuth);
router.get('/:guildId',(req,res)=>{const id=req.params.guildId;res.json({success:true,config:svc.get(id),xp:svc.topXp(id),money:svc.topMoney(id)});});
router.put('/:guildId',(req,res)=>{const id=req.params.guildId;res.json({success:true,config:svc.save(id,req.body||{})});});
router.post('/:guildId/toggle',(req,res)=>{if(!req.body?.command)return res.status(400).json({error:'command is required'});res.json({success:true,toggles:svc.toggle(req.params.guildId,req.body.command,req.body.enabled!==false)});});
module.exports=router;
