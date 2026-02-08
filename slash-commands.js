// slash-commands.js - Modern Discord Slash Commands with Autocomplete
const { SlashCommandBuilder } = require('discord.js');

// Define slash commands with proper options and autocomplete
const slashCommands = [
  // ADD command with autocomplete
  new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add various items to the bot')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('What do you want to add?')
        .setRequired(true)
        .addChoices(
          { name: 'Streamer (Twitch/Kick/TikTok)', value: 'streamer' },
          { name: 'Game Role', value: 'game-role' },
          { name: 'Custom Command', value: 'custom-command' },
          { name: 'Platform Role', value: 'platform-role' },
          { name: 'Watch Party Role', value: 'watchparty-role' },
          { name: 'Money (to user)', value: 'money' }
        )
    )
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Name/username of what you\'re adding')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel for notifications (for streamers)')
        .setRequired(false)
    ),

  // REMOVE command with autocomplete
  new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove various items from the bot')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('What do you want to remove?')
        .setRequired(true)
        .addChoices(
          { name: 'Streamer', value: 'streamer' },
          { name: 'Game Role', value: 'game-role' },
          { name: 'Custom Command', value: 'custom-command' },
          { name: 'Platform Role', value: 'platform-role' },
          { name: 'Watch Party Role', value: 'watchparty-role' }
        )
    )
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Name of what you\'re removing')
        .setRequired(true)
        .setAutocomplete(true) // Enable autocomplete for existing items
    ),

  // CONFIG command
  new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure bot settings')
    .addStringOption(option =>
      option
        .setName('setting')
        .setDescription('What do you want to configure?')
        .setRequired(true)
        .addChoices(
          { name: 'Welcome Channel', value: 'welcome-channel' },
          { name: 'Mod Log Channel', value: 'modlog-channel' },
          { name: 'Twitch Channel', value: 'twitch-channel' },
          { name: 'TikTok Channel', value: 'tiktok-channel' },
          { name: 'Kick Channel', value: 'kick-channel' },
          { name: 'Suggestions Channel', value: 'suggestions-channel' }
        )
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('The channel to configure')
        .setRequired(true)
    ),

  // SETUP command
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup role selectors and features')
    .addStringOption(option =>
      option
        .setName('feature')
        .setDescription('What do you want to setup?')
        .setRequired(true)
        .addChoices(
          { name: 'Gaming Roles Selector', value: 'roles' },
          { name: 'Watch Party Selector', value: 'watchparty' },
          { name: 'Platform Selector', value: 'platform' },
          { name: 'Level Roles (1-100)', value: 'level-roles' },
          { name: 'Ticket System', value: 'tickets' }
        )
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('Channel to post the selector in (for tickets)')
        .setRequired(false)
    ),

  // PLAY command for music
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play music in voice channel')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song name or YouTube URL')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  // KICK command
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for kick')
        .setRequired(false)
    ),

  // BAN command
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for ban')
        .setRequired(false)
    ),

  // WARN command
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for warning')
        .setRequired(true)
    ),

  // GIVEAWAY command
  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway')
    .addStringOption(option =>
      option
        .setName('prize')
        .setDescription('What are you giving away?')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Duration in minutes')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10080)
    )
    .addIntegerOption(option =>
      option
        .setName('winners')
        .setDescription('Number of winners')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(20)
    ),

  // LEVEL command
  new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check user level')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to check (leave blank for yourself)')
        .setRequired(false)
    ),

  // LEADERBOARD command
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show top users by level or messages')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Leaderboard type')
        .setRequired(false)
        .addChoices(
          { name: 'Levels', value: 'levels' },
          { name: 'Messages', value: 'messages' }
        )
    ),

  // HELP command
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands')
    .addStringOption(option =>
      option
        .setName('command')
        .setDescription('Get help for a specific command')
        .setRequired(false)
        .setAutocomplete(true)
    ),

  // PING command
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  // SUGGEST command
  new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion')
    .addStringOption(option =>
      option
        .setName('suggestion')
        .setDescription('Your suggestion')
        .setRequired(true)
    ),

  // TICKET command
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create a support ticket')
    .addStringOption(option =>
      option
        .setName('topic')
        .setDescription('What do you need help with?')
        .setRequired(false)
    )
];

module.exports = { slashCommands };
