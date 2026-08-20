// src/features/server-guard/server-guard.routes.cjs
// Server Guard API routes for dashboard integration

const express = require('express');
const router = express.Router();
const { getServerGuardConfig, setServerGuardConfig, toggleFeature, isFeatureEnabled, getWhitelist, addToWhitelist, removeFromWhitelist, isWhitelisted } = require('./server-guard.service.cjs');

function getGuildIdFromReq(req) {
  return req.params.guildId || req.query.guildId || req.body.guildId;
}

function checkAuth(req, res) {
  if (!req.session || !req.session.authenticated) {
    return false;
  }
  return true;
}

router.get('/:guildId', (req, res) => {
  if (!checkAuth(req, res)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  try {
    const guildId = getGuildIdFromReq(req);
    if (!guildId) {
      return res.status(400).json({ success: false, error: 'Missing guildId' });
    }
    
    const config = getServerGuardConfig(guildId);
    res.json({ success: true, data: config });
  } catch (err) {
    console.error('Server guard config fetch error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch server guard config' });
  }
});

router.post('/:guildId', (req, res) => {
  if (!checkAuth(req, res)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  try {
    const guildId = getGuildIdFromReq(req);
    if (!guildId) {
      return res.status(400).json({ success: false, error: 'Missing guildId' });
    }
    
    const { config } = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing config object' });
    }
    
    const updated = setServerGuardConfig(guildId, config);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Server guard config save error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save server guard config' });
  }
});

router.post('/:guildId/whitelist', (req, res) => {
  if (!checkAuth(req, res)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  try {
    const guildId = getGuildIdFromReq(req);
    if (!guildId) {
      return res.status(400).json({ success: false, error: 'Missing guildId' });
    }
    
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }
    
    const whitelist = addToWhitelist(guildId, String(userId));
    res.json({ success: true, data: whitelist });
  } catch (err) {
    console.error('Whitelist add error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to add to whitelist' });
  }
});

router.delete('/:guildId/whitelist/:userId', (req, res) => {
  if (!checkAuth(req, res)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  try {
    const guildId = getGuildIdFromReq(req);
    if (!guildId) {
      return res.status(400).json({ success: false, error: 'Missing guildId' });
    }
    
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }
    
    const whitelist = removeFromWhitelist(guildId, String(userId));
    res.json({ success: true, data: whitelist });
  } catch (err) {
    console.error('Whitelist remove error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to remove from whitelist' });
  }
});

router.get('/:guildId/status', (req, res) => {
  if (!checkAuth(req, res)) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  
  try {
    const guildId = getGuildIdFromReq(req);
    if (!guildId) {
      return res.status(400).json({ success: false, error: 'Missing guildId' });
    }
    
    const config = getServerGuardConfig(guildId);
    const whitelist = getWhitelist(guildId);
    
    const features = [
      'raidProtection',
      'antiSpam',
      'linkScanning',
      'antiNuke',
      'joinGate',
      'rateLimiting',
      'profanityFilter'
    ];
    
    const featureStatus = features.map(feature => ({
      feature,
      enabled: isFeatureEnabled(guildId, feature)
    }));
    
    res.json({
      success: true,
      data: {
        config,
        whitelist,
        featureStatus,
        timestamp: Date.now()
      }
    });
  } catch (err) {
    console.error('Server guard status error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch security status' });
  }
});

module.exports = router;
