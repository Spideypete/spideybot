// Shared authorization middleware for dashboard feature APIs.
function requireFeatureAuth(req,res,next){
  if(!req.session?.authenticated)return res.status(401).json({success:false,error:'Not authenticated'});
  const pathIds=String(req.path||'').split('/').filter(Boolean).map(String);
  const numeric=pathIds.findLast?.(x=>/^\d{15,22}$/.test(x))||[...pathIds].reverse().find(x=>/^\d{15,22}$/.test(x));
  const guildId=req.params?.guildId||req.query?.guildId||req.featureGuildId||numeric||req.session.selectedGuildId;
  if(!guildId)return res.status(400).json({success:false,error:'Missing guildId'});
  const hasAccess=Array.isArray(req.session.guilds)&&req.session.guilds.some(g=>String(g.id)===String(guildId));
  if(!hasAccess)return res.status(403).json({success:false,error:'No administrator access to this server'});
  req.featureGuildId=String(guildId);next();
}
module.exports={requireFeatureAuth};