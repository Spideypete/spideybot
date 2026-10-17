const express=require('express');
const {requireFeatureAuth}=require('./feature-auth.cjs');
const spideySuiteRoutes=require('../features/spidey-suite/spidey-suite.routes.cjs');

function createFeaturesRouter(client){
  const router=express.Router();
  router.use(requireFeatureAuth);
  router.use((req,res,next)=>{req.botClient=client;next();});
  router.use('/spidey-suite',spideySuiteRoutes);
  return router;
}
module.exports={createFeaturesRouter};
