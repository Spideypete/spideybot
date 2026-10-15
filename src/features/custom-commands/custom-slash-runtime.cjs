'use strict';

const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { testifyCommands } = require('../testify-suite/testify-suite.commands.cjs');
const svc = require('../testify-suite/testify-suite.service.cjs');

const NAME_PATTERN = /^[a-z0-9-]{1,32}$/;
const RESERVED_NAMES = new Set(testifyCommands.map(command => String(command.name).toLowerCase()));

function normalizeGuildCommand(command) {
  const clean = {
    name: command.name,
    description: command.description,
    type: command.type || 1,
    options: command.options || []
  };
  for (const key of ['default_member_permissions', 'dm_permission', 'nsfw', 'contexts', 'integration_types']) {
    if (command[key] !== undefined) clean[key] = command[key];
  }
  return clean;
}

async function syncGuildCustomSlashCommands(client, guildId, previousItems, nextItems, token = process.env.TOKEN) {
  if (!client?.isReady?.() || !client.user?.id) throw new Error('Bot is not ready to register commands yet.');
  if (!token) throw new Error('Discord bot token is unavailable.');
  if (!Array.isArray(nextItems)) throw new Error('Custom command items must be an array.');
  if (nextItems.length > 25) throw new Error('A server can have at most 25 custom commands from this panel.');

  const rest = new REST({ version: '10' }).setToken(token);
  const globalCommands = await rest.get(Routes.applicationCommands(client.user.id));
  const reserved = new Set(RESERVED_NAMES);
  for (const command of globalCommands) reserved.add(String(command.name).toLowerCase());

  const seen = new Set();
  for (const item of nextItems) {
    const name = String(item?.name || '').trim().toLowerCase();
    if (!NAME_PATTERN.test(name)) throw new Error('Custom command names must use 1–32 lowercase letters, numbers, or hyphens.');
    if (reserved.has(name)) throw new Error('/' + name + ' is already a registered bot command.');
    if (seen.has(name)) throw new Error('Duplicate custom command: /' + name);
    if (!String(item?.messageTemplate || '').trim()) throw new Error('Every custom command needs response text.');
    seen.add(name);
  }

  const route = Routes.applicationGuildCommands(client.user.id, guildId);
  const existing = await rest.get(route);
  const previousNames = new Set((Array.isArray(previousItems) ? previousItems : []).map(item => String(item?.name || '').toLowerCase()));
  const retained = existing
    .filter(command => !previousNames.has(String(command.name).toLowerCase()) && !String(command.description || '').startsWith('Custom response command:'))
    .map(normalizeGuildCommand);
  const retainedNames = new Set(retained.map(command => String(command.name).toLowerCase()));

  for (const item of nextItems) {
    if (retainedNames.has(String(item.name).toLowerCase())) {
      throw new Error('/' + item.name + ' already exists as a server-specific command.');
    }
  }

  const custom = nextItems.map(item => new SlashCommandBuilder()
    .setName(String(item.name).toLowerCase())
    .setDescription(('Custom response command: ' + String(item.name)).slice(0, 100))
    .setDMPermission(false)
    .toJSON());

  if (retained.length + custom.length > 100) throw new Error('Discord allows at most 100 guild slash commands.');
  await rest.put(route, { body: [...retained, ...custom] });
}

async function handleCustomSlashCommand(interaction) {
  if (!interaction?.guildId || !interaction.isChatInputCommand?.()) return false;
  const config = svc.get(interaction.guildId);
  const custom = config.customCommands || {};
  const items = Array.isArray(custom.items) ? custom.items : [];
  const item = items.find(command => String(command?.name || '').toLowerCase() === interaction.commandName.toLowerCase());
  if (!item) return false;

  if (item.enabled === false) {
    await interaction.reply({ content: 'This custom command is currently disabled.', ephemeral: true });
    return true;
  }

  const useCounter = item.counterEnabled !== false;
  const count = Math.max(0, Number(item.count) || 0) + (useCounter ? 1 : 0);
  if (useCounter) {
    const updatedItems = items.map(command => command === item ? { ...command, count } : command);
    svc.save(interaction.guildId, { customCommands: { ...custom, items: updatedItems } });
  }

  const template = String(item.messageTemplate || '');
  let response = template
    .replace(/\{count\}/gi, String(count))
    .replace(/\{user\}/gi, '<@' + interaction.user.id + '>')
    .replace(/\{username\}/gi, interaction.user.username)
    .replace(/\{server\}/gi, interaction.guild?.name || 'this server');
  if (useCounter && !/\{count\}/i.test(template)) {
    response += (response ? '\n' : '') + String(item.counterLabel || 'Count') + ': ' + count;
  }
  if (!response.trim()) response = 'Custom command executed.';
  if (response.length > 2000) response = response.slice(0, 1997) + '...';

  await interaction.reply({
    content: response,
    allowedMentions: { users: [interaction.user.id], roles: [], repliedUser: false }
  });
  return true;
}

module.exports = { syncGuildCustomSlashCommands, handleCustomSlashCommand, NAME_PATTERN };
