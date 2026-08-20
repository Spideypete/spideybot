const express = require('express');
const router = express.Router();
const giveawaysService = require('./giveaways.service.cjs');

function auth(req, res, next) {
  if (!req.session?.authenticated) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

router.get('/:guildId', auth, (req, res) => {
  const { guildId } = req.params;
  const active = giveawaysService.getActive(guildId);
  const ended = giveawaysService.getEnded(guildId);
  res.json({ active, ended });
});

router.post('/:guildId', auth, express.json(), (req, res) => {
  const { guildId } = req.params;
  const giveaway = giveawaysService.create(guildId, req.body || {});
  res.json({ success: true, giveaway });
});

router.post('/:guildId/:id/end', auth, express.json(), (req, res) => {
  const { guildId, id } = req.params;
  const giveaway = giveawaysService.endGiveaway(guildId, id);

  if (!giveaway) {
    return res.status(404).json({ success: false, error: 'Giveaway not found' });
  }

  res.json({ success: true, giveaway });
});

router.post('/:guildId/:id/reroll', auth, express.json(), (req, res) => {
  const { guildId, id } = req.params;
  const giveaway = giveawaysService.reroll(guildId, id);

  if (!giveaway) {
    return res.status(404).json({ success: false, error: 'Giveaway not found' });
  }

  res.json({ success: true, giveaway });
});

router.delete('/:guildId/:id', auth, (req, res) => {
  const { guildId, id } = req.params;
  const deleted = giveawaysService.deleteGiveaway(guildId, id);

  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Giveaway not found' });
  }

  res.json({ success: true });
});

module.exports = router;
