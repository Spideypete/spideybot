const express = require('express');
const router = express.Router();
const levelsService = require('./levels.service.cjs');

function auth(req, res, next) {
  if (!req.session?.authenticated) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

router.get('/:guildId/config', auth, (req, res) => {
  const { guildId } = req.params;
  const config = levelsService.getConfig(guildId);
  res.json({ config });
});

router.post('/:guildId/config', auth, express.json(), (req, res) => {
  const { guildId } = req.params;
  const config = levelsService.setConfig(guildId, req.body || {});
  res.json({ success: true, config });
});

router.get('/:guildId/leaderboard', auth, (req, res) => {
  const { guildId } = req.params;
  const limit = parseInt(req.query.limit, 10) || 10;
  const leaderboard = levelsService.getLeaderboard(guildId, limit);
  res.json({ leaderboard });
});

router.get('/:guildId/member/:userId', auth, (req, res) => {
  const { guildId, userId } = req.params;
  const data = levelsService.getUserLevel(guildId, userId);
  res.json(data);
});

router.post('/:guildId/reset', auth, express.json(), (req, res) => {
  const { guildId } = req.params;
  levelsService.resetAllXp(guildId);
  res.json({ success: true });
});

module.exports = router;
