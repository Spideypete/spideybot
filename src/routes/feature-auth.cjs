// Shared authorization middleware for dashboard feature APIs.
const axios=require('axios');

async function requireFeatureAuth(req,res,next){
  if(!req.session?.authenticated)return res.status(401).json({success:false,error:'Not authenticated'});
  const pathIds=String(req.path||'').split('/').filter(Boolean).map(String);
  const numeric=pathIds.findLast?.(x=>/^\d{15,22}$/.test(x))||[...pathIds].reverse().find(x=>/^\d{15,22}$/.test(x));
  const guildId=req.params?.guildId||req.query?.guildId||req.featureGuildId||numeric||req.session.selectedGuildId;
  if(!guildId)return res.status(400).json({success:false,error:'Missing guildId'});
  let hasAccess=Array.isArray(req.session.guilds)&&req.session.guilds.some(g=>String(g.id)===String(guildId));

  // Discord permissions can change after the OAuth session was created. Refresh
  // the admin-guild list once on a miss before rejecting a legitimate dashboard save.
  // This does not grant access based on bot membership: Discord must confirm the
  // signed-in user still has the Administrator permission for the selected guild.
  if(!hasAccess&&req.session.accessToken){
    try{
      const response=await axios.get('https://discord.com/api/users/@me/guilds?with_counts=true',{
        headers:{Authorization:'Bearer '+req.session.accessToken},
        timeout:8000
      });
      const administratorGuilds=(response.data||[]).filter(guild=>{
        try{return (BigInt(guild.permissions||0)&8n)===8n;}catch(_){return false;}
      });
      req.session.guilds=administratorGuilds;
      hasAccess=administratorGuilds.some(g=>String(g.id)===String(guildId));
      await new Promise(resolve=>req.session.save(()=>resolve()));
    }catch(error){
      console.warn('[feature-auth] Could not refresh Discord administrator guilds:',error.response?.status||error.message);
    }
  }

  if(!hasAccess)return res.status(403).json({success:false,error:'No access'});
  req.featureGuildId=String(guildId);next();
}
module.exports={requireFeatureAuth};