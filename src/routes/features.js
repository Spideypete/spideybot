const express=require('express');
const {requireFeatureAuth}=require('./feature-auth.cjs');
const testifySuiteRoutes=require('../features/testify-suite/testify-suite.routes.cjs');

function createFeaturesRouter(){
  const router=express.Router();
  router.use(requireFeatureAuth);
  router.use('/testify-suite',testifySuiteRoutes);
  return router;
}
module.exports={createFeaturesRouter};
