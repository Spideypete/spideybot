// slash-commands.js - Complete Slash Commands from COMMANDS_META
const { SlashCommandBuilder } = require('discord.js');

const slashCommands = [
  // ===================== MODERATION =====================
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Remove member from server')
    .addUserOption(option =>
      option.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for kick').setRequired(false)),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Permanently ban member')
    .addUserOption(option =>
      option.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for ban').setRequired(false)),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn member (tracked & logged)')
    .addUserOption(option =>
      option.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for warning').setRequired(true)),

  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout member')
    .addUserOption(option =>
      option.setName('user').setDescription('User to mute').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from member')
    .addUserOption(option =>
      option.setName('user').setDescription('User to unmute').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription("View member's warning history")
    .addUserOption(option =>
      option.setName('user').setDescription('User to check warnings for').setRequired(true)),

  // ===================== ROLES - CATEGORY =====================
  new SlashCommandBuilder()
    .setName('createcategory')
    .setDescription('Create a role category')
    .addStringOption(option =>
      option.setName('name').setDescription('Category name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('listroles')
    .setDescription('View all active role categories'),

  new SlashCommandBuilder()
    .setName('addrole')
    .setDescription('Add role to category')
    .addStringOption(option =>
      option.setName('category').setDescription('Category name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_name').setDescription('Role name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_id').setDescription('Role ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Remove role from category')
    .addStringOption(option =>
      option.setName('category').setDescription('Category name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_name').setDescription('Role name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setcategorybanner')
    .setDescription('Set category banner')
    .addStringOption(option =>
      option.setName('category').setDescription('Category name').setRequired(true))
    .addStringOption(option =>
      option.setName('url').setDescription('Banner image URL').setRequired(true)),

  new SlashCommandBuilder()
    .setName('setupcategory')
    .setDescription('Setup a new category message')
    .addStringOption(option =>
      option.setName('category').setDescription('Category name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('deletecategory')
    .setDescription('Delete a category')
    .addStringOption(option =>
      option.setName('category').setDescription('Category name').setRequired(true)),

  // ===================== ROLES - GAMING =====================
  new SlashCommandBuilder()
    .setName('addgamerole')
    .setDescription('Add game role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Game role name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_id').setDescription('Role ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removegamerole')
    .setDescription('Remove game role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Game role name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('addwatchpartyrole')
    .setDescription('Add watch party role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Watch party role name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_id').setDescription('Role ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removewatchpartyrole')
    .setDescription('Remove watch party role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Watch party role name').setRequired(true)),

  new SlashCommandBuilder()
    .setName('addplatformrole')
    .setDescription('Add platform role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Platform role name').setRequired(true))
    .addStringOption(option =>
      option.setName('role_id').setDescription('Role ID').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removeplatformrole')
    .setDescription('Remove platform role')
    .addStringOption(option =>
      option.setName('role_name').setDescription('Platform role name').setRequired(true)),

  // ===================== ROLES - SELECTORS =====================
  new SlashCommandBuilder()
    .setName('setuproles')
    .setDescription('Post gaming roles selector with buttons'),

  new SlashCommandBuilder()
    .setName('setupwatchparty')
    .setDescription('Post watch party role selector'),

  new SlashCommandBuilder()
    .setName('setupplatform')
    .setDescription('Post platform selector'),

  new SlashCommandBuilder()
    .setName('removeroles')
    .setDescription('Post role removal message'),

  new SlashCommandBuilder()
    .setName('setuplevelroles')
    .setDescription('Auto-create level roles'),

  // ===================== STREAMER MONITORING =====================
  new SlashCommandBuilder()
    .setName('addtwitchuser')
    .setDescription('Monitor Twitch user')
    .addStringOption(option =>
      option.setName('username').setDescription('Twitch username').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removetwitchuser')
    .setDescription('Remove Twitch user from monitoring')
    .addStringOption(option =>
      option.setName('username').setDescription('Twitch username').setRequired(true).setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('addtiktokuser')
    .setDescription('Monitor TikTok user')
    .addStringOption(option =>
      option.setName('username').setDescription('TikTok username').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removetiktokuser')
    .setDescription('Remove TikTok user from monitoring')
    .addStringOption(option =>
      option.setName('username').setDescription('TikTok username').setRequired(true).setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('addkickuser')
    .setDescription('Monitor Kick user')
    .addStringOption(option =>
      option.setName('username').setDescription('Kick username').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removekickuser')
    .setDescription('Remove Kick user from monitoring')
    .addStringOption(option =>
      option.setName('username').setDescription('Kick username').setRequired(true).setAutocomplete(true)),

  // ===================== CUSTOM COMMANDS =====================
  new SlashCommandBuilder()
    .setName('addcustomcommand')
    .setDescription('Add a custom command')
    .addStringOption(option =>
      option.setName('command_name').setDescription('Command name (without /)').setRequired(true))
    .addStringOption(option =>
      option.setName('response').setDescription('Command response').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removecustomcommand')
    .setDescription('Remove a custom command')
    .addStringOption(option =>
      option.setName('command_name').setDescription('Command name').setRequired(true).setAutocomplete(true)),

  new SlashCommandBuilder()
    .setName('addcmd')
    .setDescription('Add a custom command (alias)')
    .addStringOption(option =>
      option.setName('command_name').setDescription('Command name').setRequired(true))
    .addStringOption(option =>
      option.setName('response').setDescription('Command response').setRequired(true)),

  new SlashCommandBuilder()
    .setName('delcmd')
    .setDescription('Delete custom command (alias)')
    .addStringOption(option =>
      option.setName('command_name').setDescription('Command name').setRequired(true).setAutocomplete(true)),

  // ===================== CONFIGURATION - CHANNELS =====================
  new SlashCommandBuilder()
    .setName('configwelcomechannel')
    .setDescription('Set welcome channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Welcome channel').setRequired(true)),

  new SlashCommandBuilder()
    .setName('configmodlog')
    .setDescription('Set moderation log channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Mod log channel').setRequired(true)),

  new SlashCommandBuilder()
    .setName('configtwitchchannel')
    .setDescription('Set Twitch notification channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Twitch channel').setRequired(true)),

  new SlashCommandBuilder()
    .setName('configtiktokchannel')
    .setDescription('Set TikTok notification channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('TikTok channel').setRequired(true)),

  new SlashCommandBuilder()
    .setName('configkickchannel')
    .setDescription('Set Kick notification channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Kick channel').setRequired(true)),

  new SlashCommandBuilder()
    .setName('configsuggestions')
    .setDescription('Configure suggestions channel')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Suggestions channel').setRequired(true)),

  new SlashCommandBuilder()
    .setName('configleaderboard')
    .setDescription('Configure leaderboards')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Leaderboard channel').setRequired(true)),

  // ===================== CONFIGURATION - MESSAGES =====================
  new SlashCommandBuilder()
    .setName('configwelcomemessage')
    .setDescription('Set welcome message')
    .addStringOption(option =>
      option.setName('message').setDescription('Welcome message').setRequired(true)),

  new SlashCommandBuilder()
    .setName('configgoodbyemessage')
    .setDescription('Set goodbye message')
    .addStringOption(option =>
      option.setName('message').setDescription('Goodbye message').setRequired(true)),

  // ===================== ECONOMY =====================
  new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your coin balance'),

  new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Pay another user')
    .addUserOption(option =>
      option.setName('user').setDescription('User to pay').setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount to pay').setRequired(true)),

  new SlashCommandBuilder()
    .setName('addmoney')
    .setDescription('Add money to a user (admin)')
    .addUserOption(option =>
      option.setName('user').setDescription('User to give money to').setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount to add').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removemoney')
    .setDescription('Remove money from a user (admin)')
    .addUserOption(option =>
      option.setName('user').setDescription('User to remove money from').setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount to remove').setRequired(true)),

  new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work for coins (cooldown)'),

  new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('Send coins to other members')
    .addUserOption(option =>
      option.setName('user').setDescription('User to send coins to').setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount to transfer').setRequired(true)),

  // ===================== GAMES =====================
  new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play rock-paper-scissors')
    .addStringOption(option =>
      option.setName('choice').setDescription('Your choice').setRequired(true)
        .addChoices(
          { name: 'Rock', value: 'rock' },
          { name: 'Paper', value: 'paper' },
          { name: 'Scissors', value: 'scissors' }
        )),

  new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Magic 8-ball')
    .addStringOption(option =>
      option.setName('question').setDescription('Ask a question').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll a dice'),

  new SlashCommandBuilder()
    .setName('coin')
    .setDescription('Flip a coin'),

  new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Get a trivia question'),

  // ===================== MUSIC =====================
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Search and play music')
    .addStringOption(option =>
      option.setName('query').setDescription('Song name or URL').setRequired(true)),

  new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Randomize the queue'),

  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show music queue'),

  new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Toggle queue repeat'),

  new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Adjust playback volume')
    .addIntegerOption(option =>
      option.setName('level').setDescription('Volume level (0-200)').setRequired(true).setMinValue(0).setMaxValue(200)),

  new SlashCommandBuilder()
    .setName('back')
    .setDescription('Go to previous track'),

  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause playback'),

  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume playback'),

  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip current track'),

  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear queue'),

  // ===================== TICKETS =====================
  new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Setup ticket system')
    .addChannelOption(option =>
      option.setName('channel').setDescription('Channel for tickets').setRequired(true)),

  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create a support ticket')
    .addStringOption(option =>
      option.setName('topic').setDescription('What is your ticket about?').setRequired(true)),

  new SlashCommandBuilder()
    .setName('closeticket')
    .setDescription('Close an active ticket'),

  // ===================== GIVEAWAY =====================
  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Create a giveaway')
    .addStringOption(option =>
      option.setName('prize').setDescription('What are you giving away?').setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1))
    .addIntegerOption(option =>
      option.setName('winners').setDescription('Number of winners').setRequired(false).setMinValue(1)),

  new SlashCommandBuilder()
    .setName('startgiveaway')
    .setDescription('Start a giveaway')
    .addStringOption(option =>
      option.setName('prize').setDescription('Prize').setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration').setDescription('Duration (minutes)').setRequired(true)),

  // ===================== UTILITY =====================
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show full command list'),

  new SlashCommandBuilder()
    .setName('adminhelp')
    .setDescription('Show admin-only commands'),

  new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Send a suggestion')
    .addStringOption(option =>
      option.setName('suggestion').setDescription('Your suggestion').setRequired(true)),

  // ===================== FILTERS =====================
  new SlashCommandBuilder()
    .setName('filtertoggle')
    .setDescription('Toggle profanity filter'),

  new SlashCommandBuilder()
    .setName('linkfilter')
    .setDescription('Toggle link filter')
    .addStringOption(option =>
      option.setName('state').setDescription('Turn on or off').setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' }
        )),

  new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Change command prefix')
    .addStringOption(option =>
      option.setName('prefix').setDescription('New prefix').setRequired(true)),
];

module.exports = { slashCommands };
