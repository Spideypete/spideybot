const express = require('express');
const router = express.Router();
const ticketsService = require('./tickets.service.cjs');

function auth(req, res, next) {
  if (!req.session?.authenticated) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

router.get('/:guildId/config', auth, (req, res) => {
  const config = ticketsService.getConfig(req.params.guildId);
  const openTickets = ticketsService.getOpenTickets(req.params.guildId);
  res.json({ settings: config, activeTickets: openTickets });
});

router.post('/:guildId/config', auth, express.json(), (req, res) => {
  const { guildId } = req.params;
  const updates = req.body;

  if (!guildId) {
    return res.status(400).json({ success: false, error: 'No guildId provided' });
  }

  try {
    ticketsService.setConfig(guildId, updates);
    const config = ticketsService.getConfig(guildId);
    res.json({ success: true, settings: config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:guildId', auth, (req, res) => {
  const { guildId } = req.params;
  const config = ticketsService.getConfig(guildId);
  const allTickets = ticketsService.getTicket(guildId);

  const ticketsList = allTickets ? Object.values(allTickets) : [];
  const openTickets = ticketsList.filter(t => t.status === 'open');
  const closedTickets = ticketsList.filter(t => t.status === 'closed');

  res.json({
    tickets: ticketsList,
    openTickets,
    closedTickets,
    count: ticketsList.length
  });
});

router.post('/:guildId', auth, express.json(), async (req, res) => {
  const { guildId } = req.params;
  const { userId, channelId } = req.body;

  if (!guildId || !userId || !channelId) {
    return res.status(400).json({ success: false, error: 'Missing required fields: guildId, userId, channelId' });
  }

  try {
    const result = ticketsService.createTicket(guildId, userId, channelId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, ticket: result.ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:guildId/:ticketId/close', auth, express.json(), (req, res) => {
  const { guildId, ticketId } = req.params;

  try {
    const result = ticketsService.closeTicket(guildId, ticketId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, ticket: result.ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:guildId/:ticketId/claim', auth, express.json(), (req, res) => {
  const { guildId, ticketId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'Missing userId' });
  }

  try {
    const result = ticketsService.claimTicket(guildId, ticketId, userId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, ticket: result.ticket });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
