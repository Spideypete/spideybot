const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../../config.json');

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
  return { guilds: {} };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getGuildConfig(guildId) {
  const config = loadConfig();
  if (!config.guilds[guildId]) {
    config.guilds[guildId] = {};
    saveConfig(config);
  }
  return config.guilds[guildId];
}

function getTickets(guildId) {
  const guildConfig = getGuildConfig(guildId);
  if (!guildConfig.tickets) {
    guildConfig.tickets = { settings: {}, tickets: {} };
  }
  return guildConfig.tickets;
}

function generateTicketId(guildId) {
  const tickets = getTickets(guildId);
  const existingIds = Object.keys(tickets.tickets || {}).map(id => parseInt(id.split('-')[1]) || 0);
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  return `TICKET-${String(maxId + 1).padStart(4, '0')}`;
}

function getConfig(guildId) {
  const tickets = getTickets(guildId);
  return tickets.settings || {};
}

function setConfig(guildId, config) {
  const tickets = getTickets(guildId);
  tickets.settings = { ...tickets.settings, ...config };
  const guildConfig = getGuildConfig(guildId);
  guildConfig.tickets = tickets;
  saveConfig(loadConfig());
}

function createTicket(guildId, userId, channelId) {
  const tickets = getTickets(guildId);
  const settings = tickets.settings || {};
  const maxTickets = settings.maxTicketsPerUser || 1;

  const userTickets = Object.values(tickets.tickets || {}).filter(
    t => t.userId === userId && t.status === 'open'
  );

  if (userTickets.length >= maxTickets) {
    return { success: false, error: `You can only have ${maxTickets} open ticket(s).` };
  }

  const ticketId = generateTicketId(guildId);
  const ticket = {
    id: ticketId,
    guildId,
    userId,
    channelId,
    status: 'open',
    claimedBy: null,
    createdAt: new Date().toISOString(),
    closedAt: null,
    transcript: null
  };

  tickets.tickets[ticketId] = ticket;
  const guildConfig = getGuildConfig(guildId);
  guildConfig.tickets = tickets;
  saveConfig(loadConfig());

  return { success: true, ticket };
}

function closeTicket(guildId, ticketId) {
  const tickets = getTickets(guildId);
  const ticket = tickets.tickets?.[ticketId];

  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  if (ticket.status === 'closed') {
    return { success: false, error: 'Ticket is already closed' };
  }

  ticket.status = 'closed';
  ticket.closedAt = new Date().toISOString();

  const guildConfig = getGuildConfig(guildId);
  guildConfig.tickets = tickets;
  saveConfig(loadConfig());

  return { success: true, ticket };
}

function claimTicket(guildId, ticketId, userId) {
  const tickets = getTickets(guildId);
  const ticket = tickets.tickets?.[ticketId];

  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  if (ticket.status !== 'open') {
    return { success: false, error: 'Ticket is not open' };
  }

  ticket.claimedBy = userId;

  const guildConfig = getGuildConfig(guildId);
  guildConfig.tickets = tickets;
  saveConfig(loadConfig());

  return { success: true, ticket };
}

function getOpenTickets(guildId) {
  const tickets = getTickets(guildId);
  return Object.values(tickets.tickets || {}).filter(t => t.status === 'open');
}

function getTicket(guildId, ticketId) {
  const tickets = getTickets(guildId);
  return tickets.tickets?.[ticketId] || null;
}

function deleteTicket(guildId, ticketId) {
  const tickets = getTickets(guildId);

  if (!tickets.tickets?.[ticketId]) {
    return { success: false, error: 'Ticket not found' };
  }

  delete tickets.tickets[ticketId];

  const guildConfig = getGuildConfig(guildId);
  guildConfig.tickets = tickets;
  saveConfig(loadConfig());

  return { success: true };
}

function getTicketTranscript(guildId, ticketId) {
  const ticket = getTicket(guildId, ticketId);
  if (!ticket) return null;
  return ticket.transcript;
}

function setTicketTranscript(guildId, ticketId, transcript) {
  const tickets = getTickets(guildId);
  const ticket = tickets.tickets?.[ticketId];

  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  ticket.transcript = transcript;

  const guildConfig = getGuildConfig(guildId);
  guildConfig.tickets = tickets;
  saveConfig(loadConfig());

  return { success: true };
}

module.exports = {
  getConfig,
  setConfig,
  createTicket,
  closeTicket,
  claimTicket,
  getOpenTickets,
  getTicket,
  deleteTicket,
  getTicketTranscript,
  setTicketTranscript,
  generateTicketId
};
