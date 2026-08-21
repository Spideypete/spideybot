const { Events } = require('discord.js');
const { LoggingService } = require('./logging.service.cjs');

const service = new LoggingService();

async function handleMessageDelete(message) {
  if (!message.guild || message.author?.bot) return;
  await service.logMessageDelete(message.guild, message);
}

async function handleMessageUpdate(oldMessage, newMessage) {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  await service.logMessageEdit(newMessage.guild, oldMessage, newMessage);
}

async function handleMessageBulkDelete(messages) {
  if (!messages.size) return;
  const guild = messages.first()?.guild;
  if (!guild) return;
  await service.logBulkDelete(guild, messages);
}

function registerHandlers(client) {
  client.on(Events.MessageDelete, async (message) => {
    await handleMessageDelete(message);
  });

  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    await handleMessageUpdate(oldMessage, newMessage);
  });

  client.on(Events.MessageBulkDelete, async (messages) => {
    await handleMessageBulkDelete(messages);
  });
}

module.exports = {
  registerHandlers,
  handleMessageDelete,
  handleMessageUpdate,
  handleMessageBulkDelete
};
