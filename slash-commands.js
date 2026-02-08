// slash-commands.js - Individual Slash Commands
const { SlashCommandBuilder } = require('discord.js');

// Define slash commands matching existing text commands
const slashCommands = [
  // ===================== ROLE MANAGEMENT =====================
  new SlashCommandBuilder()
    .setName('add-role')
    .setDescription('Add role to category')
    .addStringOption(option =>
      option.setName('category').setDescription('Category name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_name').setDescription('Role name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_id').setDescription('Role ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('remove-role')
    .setDescription('Remove role from category')
    .addStringOption(option =>
      option.setName('category').setDescription('Category name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_name').setDescription('Role name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('add-game-role')
    .setDescription('Add game role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Game role name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_id').setDescription('Role ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('remove-game-role')
    .setDescription('Remove game role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Game role name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('add-watchparty-role')
    .setDescription('Add watch party role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Watch party role name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_id').setDescription('Role ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('remove-watchparty-role')
    .setDescription('Remove watch party role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Watch party role name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('add-platform-role')
    .setDescription('Add platform role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Platform role name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_id').setDescription('Role ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('remove-platform-role')
    .setDescription('Remove platform role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Platform role name').setRequired(true)),

  // ===================== STREAMER MONITORING =====================
  new SlashCommandBuilder()
    .setName('add-twitch-user')
    .setDescription('Monitor Twitch user')
    .addStringOption(option =>
      option.setName('username').setDescription('Twitch username').setRequired(true)),

  new SlashCommandBuilder()
    .setName('remove-twitch-user')
    .setDescription('Remove Twitch user from monitoring')
    .addStringOption(option =>
      option.setName('username').setDescription('Twitch username').setRequired(true).setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('add-tiktok-user')
    .setDescription('Monitor TikTok user')
    .addStringOption(option =>
      option.setName('username').setDescription('TikTok username').setRequired(true)),

  new SlashCommandBuilder()
    .setName('remove-tiktok-user')
    .setDescription('Remove TikTok user from monitoring')
    .addStringOption(option =>
      option.setName('username').setDescription('TikTok username').setRequired(true).setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('add-kick-user')
    .setDescription('Monitor Kick user')
    .addStringOption(option =>
      option.setName('username').setDescription('Kick username').setRequired(true)),

  new SlashCommandBuilder()
    .setName('remove-kick-user')
    .setDescription('Remove Kick user from monitoring')
    .addStringOption(option =>
      option.setName('username').setDescription('Kick username').setRequired(true).setAutocomplete(true)),

  // ===================== CUSTOM COMMANDS =====================
  new SlashCommandBuilder()
    .setName('add-custom-command')
    .setDescription('Add a custom command')
    .addStringOption(option =>
      option.setName('command_name').setDescription('Command name (without /)').setRequired(true))
    .addStringOption(option =>
      option.setName('response').setDescription('Command response').setRequired(true)),

  new SlashCommandBuilder()
    .setName('remove-custom-command')
    .setDescription('Remove a custom command')
    .addStringOption(option =>
      option.setName('command_name').setDescription('Command name').setRequired(true).setAutocomplete(true)),

  // ===================== CONFIGURATION =====================
  new SlashCommandBuilder()
    .setName('config-welcome-channel')
    .setDescription('Set welcome channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Welcome channel').setRequired(true)),

  new SlashCommandBuilder()
    .setName('config-modlog')
    .setDescription('Set moderation log channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Mod log channel').setRequired(true)),

  new SlashCommandBuilder()
    .setName('config-twitch-channel')
    .setDescription('Set Twitch notification channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Twitch channel').setRequired(true)),

  new SlashCommandBuilder()
    .setName('config-tiktok-channel')
    .setDescription('Set TikTok notification channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('TikTok channel').setRequired(true)),

  new SlashCommandBuilder()
    .setName('config-kick-channel')
    .setDescription('Set Kick notification channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Kick channel').setRequired(true)),

  // ===================== ECONOMY =====================
  new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('Add money to a user (admin)')
    .addUserOption(option =>
      option.setName('user').setDescription('User to give money to').setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount to add').setRequired(true)),

  // ===================== SETUP =====================
  new SlashCommandBuilder()
    .setName('setup-category')
    .setDescription('Setup role category selector')
    .addStringOption(option =>
      option.setName('category').setDescription('Category name').setRequired(true)),

  // ===================== UTILITY =====================
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show available commands'),
];

module.exports = { slashCommands };
