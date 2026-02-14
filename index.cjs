// index.cjs - SPIDEY BOT - Multi-Server Configurable Discord Bot

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");
const { slashCommands } = require("./slash-commands");
const { Player } = require("discord-player");
const { DefaultExtractors } = require("@discord-player/extractor");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const express = require("express");
const helmet = require('helmet');
const session = require("express-session");
const axios = require("axios");
const {
  RateLimiter,
  SecurityValidator,
  securityHeadersMiddleware,
  WebhookSignatureVerifier,
  SecurityAuditLogger,
  AntiSpamEngine,
  JoinGateSystem,
  BackupSystem
} = require("./security");

// ============== SETUP EXPRESS APP ==============
const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'spidey-bot-secret-dev',
  resave: true,
  saveUninitialized: true,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Inject version timestamp and cache-busting to ALL HTML pages
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Add cache-control headers and a lightweight version cookie for cache-busting
    const timestamp = Date.now();
    res.cookie('v', timestamp, { maxAge: 3600000, httpOnly: false });

    if (req.path.endsWith('.html') || req.path === '/' || req.path === '/commands' || req.path === '/security' || req.path === '/dashboard' || !req.path.includes('.')) {
      const originalSend = res.send;
      res.send = function (body) {
        if (typeof body === 'string' && body.includes('</head>')) {
          // Inject a small version meta + script for client-side cache awareness
          body = body.replace('</head>', `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta name="version-timestamp" content="${timestamp}">
    <script>window.PAGE_VERSION = "${timestamp}";</script>
    </head>`);
        }
        return originalSend.call(this, body);
      };
    }
    next();
});

app.set('trust proxy', true);

// ============== SECURITY MIDDLEWARE ==============
app.use(securityHeadersMiddleware);
const rateLimiter = new RateLimiter(500, 60000); // 500 requests per minute
app.use(rateLimiter.middleware());

// Serve static files from dist and public
app.use(express.static(distDir, {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));
app.use(express.static(publicDir, {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));
const auditLogger = new SecurityAuditLogger();
const antiSpam = new AntiSpamEngine();
const joinGate = new JoinGateSystem();
const backupSystem = new BackupSystem();

// ============== SERVER GUARD TRACKING MAPS ==============
const spamTracker = new Map();       // guildId:userId -> { timestamps: [], warned: bool }
const raidTracker = new Map();       // guildId -> { joins: [timestamp, ...] }
const nukeTracker = new Map();       // guildId:userId -> { actions: [timestamp, ...] }
const userRateLimit = new Map();     // guildId:userId -> { timestamps: [] }

// Known phishing / scam domains
const PHISH_DOMAINS = ['discord-nitro.gift','discordgift.site','steamcommunlty.com','dlscord.gift','dlscord-nitro.com','free-nitro.com','discord-airdrop.com','discordapp.gift','nitro-discord.com'];

function sendAuditLog(guild, guildConfig, title, description, color = 0x5865F2) {
  const al = guildConfig.auditLog;
  if (!al || al.enabled === false) return;
  const ch = al.channel ? guild.channels.cache.get(al.channel) : null;
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
  ch.send({ embeds: [embed] }).catch(() => {});
}

// ============== DISCORD OAUTH CONFIG ==============
const DISCORD_CLIENT_ID = process.env.CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "default_secret";
// Prefer explicit BASE_URL in env for Codespaces / production. Keep Render fallback.
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || null;
const BASE_REDIRECT_URI = (process.env.BASE_URL && process.env.BASE_URL.replace(/\/$/, '')) || (RENDER_EXTERNAL_URL ? RENDER_EXTERNAL_URL.replace(/\/$/, '') : 'https://zany-space-guacamole-v696776796573pvgv-5000.app.github.dev');

const REDIRECT_URI = process.env.FORCE_REDIRECT_URI || ((BASE_REDIRECT_URI === 'http://localhost:5000' && (process.env.NODE_ENV === 'production' || process.env.RENDER))
  ? 'https://spideybot-90sr.onrender.com/auth/discord/callback'
  : `${BASE_REDIRECT_URI}/auth/discord/callback`);

console.log(`🔐 OAuth Redirect URI: ${REDIRECT_URI}`);

// ============== CONFIG MANAGEMENT ==============
const configFile = path.join(__dirname, "config.json");

function logModAction(guild, action, mod, target, reason) {
  addActivity(guild.id, "🛡️", mod.username || mod.name, `${action} ${target}`);

  const config = loadConfig();
  const guildConfig = config.guilds[guild.id];
  if (!guildConfig) return;

  // Check dashboard logging toggles
  const modLogging = guildConfig.logging?.moderationLogging || {};
  const actionToggleMap = { WARN: 'logWarns', KICK: 'logKicks', BAN: 'logBans', MUTE: 'logMutes', UNMUTE: 'logMutes' };
  const toggleKey = actionToggleMap[action];
  if (toggleKey && modLogging[toggleKey] === false) return;

  // Use dashboard modLogChannel first, fall back to config modLogChannelId
  const channelId = modLogging.modLogChannel || guildConfig.modLogChannelId;
  if (!channelId) return;

  const modLogChannel = guild.channels.cache.get(channelId);
  if (modLogChannel) {
    const embed = new EmbedBuilder()
      .setColor(action === "WARN" ? 0xFFBD39 : action === "KICK" ? 0xFF6B6B : action === "BAN" ? 0xED4245 : 0x5865F2)
      .setTitle(`🛡️ ${action}`)
      .addFields(
        { name: "Moderator", value: mod.tag, inline: true },
        { name: "Target", value: target, inline: true },
        { name: "Reason", value: reason || "No reason" }
      )
      .setTimestamp();
    modLogChannel.send({ embeds: [embed] }).catch(() => {});
  }
}

function loadConfig() {
  if (fs.existsSync(configFile)) {
    return JSON.parse(fs.readFileSync(configFile, "utf8"));
  }
  return { guilds: {} };
}

function saveConfig(config) {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

function getGuildConfig(guildId) {
  const config = loadConfig();
  if (!config.guilds[guildId]) {
    config.guilds[guildId] = {
      welcomeChannelId: null,
      welcomeMessage: "Welcome to our server! 🎉",
      roleCategories: {},
      prefix: "/",
      modLogChannelId: null,
      twitchChannelId: null,
      twitchUsers: [],
      tiktokChannelId: null,
      tiktokUsers: [],
      kickChannelId: null,
      kickUsers: [],
      musicLoopMode: false,
      musicShuffle: false,
      musicVolume: 100,
      warnings: {},
      economy: {},
      levels: {},
      profanityFilterEnabled: true,
      suggestionsChannelId: null,
      giveaways: {},
      badWords: ["badword1", "badword2"],
      linkFilterEnabled: true,
      ticketsEnabled: false,
      ticketChannelId: null,
      customCommands: {},
      levelRoles: {}
    };
    saveConfig(config);
  }
  return config.guilds[guildId];
}

function getNumberedEmoji(num) {
  const emojis = ['⓵', '⓶', '⓷', '⓸', '⓹', '⓺', '⓻', '⓼', '⓽', '⓾'];
  if (num <= 10) return emojis[num - 1];
  if (num < 20) return String(num).split('').map(d => ['⓪','①','②','③','④','⑤','⑥','⑦','⑧','⑨'][d]).join('');
  return `${num}️⃣`;
}

function updateGuildConfig(guildId, updates) {
  const config = loadConfig();
  if (!config.guilds[guildId]) config.guilds[guildId] = {};
  config.guilds[guildId] = { ...config.guilds[guildId], ...updates };
  saveConfig(config);
}

function autoMigrateRoles(guildId, guild, guildConfig) {
  const categories = guildConfig.roleCategories || {};
  let hasChanges = false;

  Object.keys(categories).forEach(catName => {
    const catData = categories[catName];
    if (Array.isArray(catData)) {
      categories[catName] = { roles: catData, banner: null };
      hasChanges = true;
    }
  });

  if (hasChanges) {
    updateGuildConfig(guildId, { roleCategories: categories });
  }
}

// ============== ACTIVITY LOGGING ==============
function addActivity(guildId, icon, text, action) {
  const config = loadConfig();
  if (!config.guilds[guildId]) config.guilds[guildId] = {};
  if (!config.guilds[guildId].activities) config.guilds[guildId].activities = [];

  config.guilds[guildId].activities.unshift({
    icon,
    text,
    action,
    time: new Date().toLocaleString()
  });

  // Keep only latest 100 activities
  config.guilds[guildId].activities = config.guilds[guildId].activities.slice(0, 100);
  saveConfig(config);
}

// ============== CACHE SYSTEM ==============
const memberStatsCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedMemberStats(guildId) {
  const cached = memberStatsCache[guildId];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedMemberStats(guildId, data) {
  memberStatsCache[guildId] = { data, timestamp: Date.now() };
}

// ------------------------------------------------------------------
// Command metadata (shared): exposed to dashboard via /api/commands
// This lives at top-level so the dashboard can render even when bot
// isn't logged in or slash commands aren't registered yet.
const COMMANDS_META = {
  help: { category: 'info', description: 'Show full command list', usage: '/help' },
  adminhelp: { category: 'info', description: 'Show admin-only commands', usage: '/adminhelp', adminOnly: true },
  kick: { category: 'moderation', subsection: 'Core', description: 'Remove member from server', usage: '/kick @user [reason]' },
  ban: { category: 'moderation', subsection: 'Core', description: 'Permanently ban member', usage: '/ban @user [reason]' },
  warn: { category: 'moderation', subsection: 'Core', description: 'Warn member (tracked & logged)', usage: '/warn @user [reason]' },
  mute: { category: 'moderation', subsection: 'Core', description: 'Timeout member', usage: '/mute @user' },
  unmute: { category: 'moderation', subsection: 'Core', description: 'Remove timeout from member', usage: '/unmute @user' },
  warnings: { category: 'moderation', subsection: 'Core', description: "View member's warning history", usage: '/warnings @user' },

  balance: { category: 'economy', subsection: 'Currency', description: 'Check your coin balance', usage: '/balance' },
  pay: { category: 'economy', subsection: 'Currency', description: 'Pay another user', usage: '/pay @user [amount]' },
  addmoney: { category: 'economy', subsection: 'Currency', description: 'Add money to a user (admin)', usage: '/addmoney @user [amount]', adminOnly: true },
  removemoney: { category: 'economy', subsection: 'Currency', description: 'Remove money from a user (admin)', usage: '/removemoney @user [amount]', adminOnly: true },
  work: { category: 'economy', subsection: 'Currency', description: 'Work for coins (cooldown)', usage: '/work' },
  transfer: { category: 'economy', subsection: 'Currency', description: 'Send coins to other members', usage: '/transfer @user [amount]' },

  rps: { category: 'games', subsection: 'Game Commands', description: 'Play rock-paper-scissors', usage: '/rps [rock/paper/scissors]' },
  '8ball': { category: 'games', subsection: 'Game Commands', description: 'Magic 8-ball', usage: '/8ball' },
  dice: { category: 'games', subsection: 'Game Commands', description: 'Roll a dice', usage: '/dice' },
  coin: { category: 'games', subsection: 'Game Commands', description: 'Flip a coin', usage: '/coin' },
  trivia: { category: 'games', subsection: 'Game Commands', description: 'Get a trivia question', usage: '/trivia' },

  play: { category: 'music', subsection: 'Playback', description: 'Search and play music', usage: '/play [song or URL]' },
  shuffle: { category: 'music', subsection: 'Playback', description: 'Randomize the queue', usage: '/shuffle' },
  queue: { category: 'music', subsection: 'Playback', description: 'Show music queue', usage: '/queue' },
  loop: { category: 'music', subsection: 'Playback', description: 'Toggle queue repeat', usage: '/loop' },
  volume: { category: 'music', subsection: 'Playback', description: 'Adjust playback volume', usage: '/volume [0-200]' },
  back: { category: 'music', subsection: 'Button Controls', description: 'Go to previous track', usage: '/back' },
  pause: { category: 'music', subsection: 'Button Controls', description: 'Pause playback', usage: '/pause' },
  resume: { category: 'music', subsection: 'Button Controls', description: 'Resume playback', usage: '/resume' },
  skip: { category: 'music', subsection: 'Button Controls', description: 'Skip current track', usage: '/skip' },
  stop: { category: 'music', subsection: 'Button Controls', description: 'Stop playback and clear queue', usage: '/stop' },

  suggest: { category: 'info', description: 'Send a suggestion', usage: '/suggest [message]' },
  ticketsetup: { category: 'tickets', subsection: 'Setup', description: 'Setup ticket system', usage: '/ticketsetup #channel', adminOnly: true },
  ticket: { category: 'tickets', subsection: 'User', description: 'Create a support ticket', usage: '/ticket' },
  closeticket: { category: 'tickets', subsection: 'User', description: 'Close an active ticket', usage: '/closeticket', adminOnly: true },

  configmodlog: { category: 'config', subsection: 'Channels', description: 'Set moderation log channel', usage: '/configmodlog #channel' },
  configwelcomechannel: { category: 'config', subsection: 'Channels', description: 'Set welcome channel', usage: '/configwelcomechannel #channel' },
  configwelcomemessage: { category: 'config', subsection: 'Messages', description: 'Set welcome message', usage: '/configwelcomemessage [message]' },
  configgoodbyemessage: { category: 'config', subsection: 'Messages', description: 'Set goodbye message', usage: '/configgoodbyemessage [message]' },
  configlogging: { category: 'config', subsection: 'Features', description: 'Configure logging', usage: '/configlogging' },
  configleaderboard: { category: 'config', subsection: 'Features', description: 'Configure leaderboards', usage: '/configleaderboard #channel' },
  configxp: { category: 'config', subsection: 'Features', description: 'Configure XP settings', usage: '/configxp [xpPerMessage] [xpPerLevel]' },
  configsubscriptions: { category: 'config', subsection: 'Features', description: 'Configure subscriptions', usage: '/configsubscriptions' },
  configstatisticschannels: { category: 'config', subsection: 'Channels', description: 'Configure statistic channels', usage: '/configstatisticschannels #channel' },
  configserverguard: { category: 'config', subsection: 'Features', description: 'Server guard settings', usage: '/configserverguard' },
  configreactroles: { category: 'config', subsection: 'Features', description: 'Configure reaction roles', usage: '/configreactroles' },
  configrolecategories: { category: 'config', subsection: 'Features', description: 'Manage role categories', usage: '/configrolecategories [name]' },
  configsocialnotifs: { category: 'config', subsection: 'Features', description: 'Configure social notifications', usage: '/configsocialnotifs #channel' },
  configsuggestions: { category: 'config', subsection: 'Features', description: 'Configure suggestions channel', usage: '/configsuggestions #channel' },
  configkickchannel: { category: 'config', subsection: 'Channels', description: 'Set kick channel', usage: '/configkickchannel #channel' },
  configtiktokchannel: { category: 'config', subsection: 'Channels', description: 'Set TikTok alerts channel', usage: '/configtiktokchannel #channel' },
  configtwitchchannel: { category: 'config', subsection: 'Channels', description: 'Set Twitch alerts channel', usage: '/configtwitchchannel #channel' },

  createcategory: { category: 'roles', subsection: 'Category', description: 'Create a role category', usage: '/createcategory [name]' },
  listroles: { category: 'roles', subsection: 'Category', description: 'View all active role categories', usage: '/listroles' },
  addrole: { category: 'roles', subsection: 'Category', description: 'Add role to category', usage: '/addrole [category] [role name] [role ID]' },
  removerole: { category: 'roles', subsection: 'Category', description: 'Remove role from category', usage: '/removerole [category] [role name]' },
  setcategorybanner: { category: 'roles', subsection: 'Category', description: 'Set category banner', usage: '/setcategorybanner [category] [url]' },
  setupcategory: { category: 'roles', subsection: 'Category', description: 'Setup a new category message', usage: '/setupcategory [category]' },
  deletecategory: { category: 'roles', subsection: 'Category', description: 'Delete a category', usage: '/deletecategory [category]' },
  addgamerole: { category: 'roles', subsection: 'Gaming', description: 'Add game role', usage: '/addgamerole [role name] [role ID]' },
  removegamerole: { category: 'roles', subsection: 'Gaming', description: 'Remove game role', usage: '/removegamerole [role name]' },
  addwatchpartyrole: { category: 'roles', subsection: 'Gaming', description: 'Add watchparty role', usage: '/addwatchpartyrole [role name] [role ID]' },
  removewatchpartyrole: { category: 'roles', subsection: 'Gaming', description: 'Remove watchparty role', usage: '/removewatchpartyrole [role name]' },
  addplatformrole: { category: 'roles', subsection: 'Gaming', description: 'Add platform role', usage: '/addplatformrole [role name] [role ID]' },
  removeplatformrole: { category: 'roles', subsection: 'Gaming', description: 'Remove platform role', usage: '/removeplatformrole [role name]' },
  setuproles: { category: 'roles', subsection: 'Selectors', description: 'Post gaming roles selector with buttons', usage: '/setuproles' },
  setupwatchparty: { category: 'roles', subsection: 'Selectors', description: 'Post watch party role selector', usage: '/setupwatchparty' },
  setupplatform: { category: 'roles', subsection: 'Selectors', description: 'Post platform selector', usage: '/setupplatform' },
  removeroles: { category: 'roles', subsection: 'Selectors', description: 'Post role removal message', usage: '/removeroles' },
  setuplevelroles: { category: 'roles', subsection: 'Selectors', description: 'Auto-create level roles', usage: '/setuplevelroles' },

  addcustomcommand: { category: 'custom', subsection: 'Management', description: 'Add a custom command', usage: '/addcustomcommand [name] | [response]', adminOnly: true },
  addcmd: { category: 'custom', subsection: 'Management', description: 'Add a custom command (alias)', usage: '/addcmd [name] | [response]', adminOnly: true },
  removecustomcommand: { category: 'custom', subsection: 'Management', description: 'Remove custom command', usage: '/removecustomcommand [name]', adminOnly: true },
  delcmd: { category: 'custom', subsection: 'Management', description: 'Delete custom command (alias)', usage: '/delcmd [name]', adminOnly: true },

  giveaway: { category: 'giveaway', subsection: 'Core', description: 'Create a giveaway', usage: '/giveaway', adminOnly: true },
  startgiveaway: { category: 'giveaway', subsection: 'Core', description: 'Start a giveaway', usage: '/startgiveaway', adminOnly: true },
  filtertoggle: { category: 'config', subsection: 'Features', description: 'Toggle profanity filter', usage: '/filtertoggle' },
  linkfilter: { category: 'config', subsection: 'Features', description: 'Toggle link filter', usage: '/linkfilter [on/off]' },
  setprefix: { category: 'config', subsection: 'Features', description: 'Change command prefix', usage: '/setprefix [prefix]' },
  addkickuser: { category: 'social', subsection: 'Monitoring', description: 'Monitor Kick user', usage: '/addkickuser [username]', adminOnly: true },
  removekickuser: { category: 'social', subsection: 'Monitoring', description: 'Stop monitoring Kick user', usage: '/removekickuser [username]', adminOnly: true },
  addtiktokuser: { category: 'social', subsection: 'Monitoring', description: 'Monitor TikTok user', usage: '/addtiktokuser [username]', adminOnly: true },
  removetiktokuser: { category: 'social', subsection: 'Monitoring', description: 'Stop monitoring TikTok user', usage: '/removetiktokuser [username]', adminOnly: true },
  'addtwitchuser': { category: 'social', subsection: 'Monitoring', description: 'Monitor Twitch user', usage: '/addtwitchuser [username]', adminOnly: true },
  'removetwitchuser': { category: 'social', subsection: 'Monitoring', description: 'Stop monitoring Twitch user', usage: '/removetwitchuser [username]', adminOnly: true },
};

// expose metadata to dashboard regardless of bot login
app.get('/api/commands', (req, res) => {
  res.json(COMMANDS_META);
});
// ------------------------------------------------------------------

// ============== CLIENT SETUP ==============
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const token = process.env.TOKEN;

// ============== MUSIC PLAYER ==============
const player = new Player(client, {
  skipFFmpeg: false,
  enableLavalink: false,
  deafenOnJoin: true
});
player.extractors.loadMulti(DefaultExtractors);

player.on("trackStart", (queue, track) => {
  console.log(`🎵 Now playing: ${track.title}`);
});

player.on("error", (queue, error) => {
  console.error("Music player error:", error);
});

player.on("connectionError", (queue, error) => {
  console.error("Connection error:", error);
});

// ============== READY EVENT ==============
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  try {
    const { execSync } = require('child_process');
    const commit = execSync('git rev-parse --short HEAD').toString().trim();
    console.log(`🔁 Running commit: ${commit} (pid:${process.pid})`);
  } catch (err) {
    console.log('🔁 Running commit: unknown');
  }
  client.user.setActivity("🎵 Music & Roles", { type: "WATCHING" });
  player.on("error", (queue, error) => {
    console.error("Music player error:", error);
  });

  // Register ALL slash commands
  try {
    // Use shared COMMANDS_META defined at top-level
    await registerSlashCommands();
    console.log('🎯 Slash command registration completed');
  } catch (error) {
    console.error("Error registering commands:", error);
  }

  // Pre-fetch members for all guilds so dashboard stats work immediately
  console.log('📊 Pre-fetching members for all guilds...');
  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.members.fetch();
      console.log(`  ✅ Fetched ${guild.members.cache.size} members for ${guild.name}`);
    } catch (err) {
      console.warn(`  ⚠️ Failed to fetch members for ${guild.name}: ${err.message}`);
    }
  }
  console.log('📊 Member pre-fetch complete');

  // Auto-deploy to Render every 10 minutes
  console.log('🔍 Checking auto-deploy conditions...');
  console.log('  RENDER_API_KEY:', !!process.env.RENDER_API_KEY);
  console.log('  RENDER_SERVICE_ID:', !!process.env.RENDER_SERVICE_ID);
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  
  if (process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID && process.env.NODE_ENV !== 'production') {
    console.log('🔄 Auto-deploy to Render enabled (every 10 minutes)');
    
    setInterval(async () => {
      try {
        const https = require('https');
        const data = JSON.stringify({ clearCache: 'do_not_clear' });
        
        const options = {
          hostname: 'api.render.com',
          port: 443,
          path: `/v1/services/${process.env.RENDER_SERVICE_ID}/deploys`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': data.length
          }
        };
        
        const req = https.request(options, (res) => {
          if (res.statusCode === 202) {
            console.log('✅ Auto-deployed to Render successfully');
          } else {
            console.log(`⚠️ Render auto-deploy returned HTTP ${res.statusCode}`);
          }
        });
        
        req.on('error', (error) => {
          console.error('❌ Render auto-deploy failed:', error.message);
        });
        
        req.write(data);
        req.end();
      } catch (err) {
        console.error('❌ Auto-deploy error:', err.message);
      }
    }, 10 * 60 * 1000); // 10 minutes
  } else {
    console.log('⚠️ Auto-deploy NOT enabled - missing conditions');
  }
});

// Reusable function to register slash commands
async function registerSlashCommands() {
  if (!token) {
    console.warn('No Discord TOKEN provided — cannot register slash commands');
    return;
  }

  try {
    const rest = new REST({ version: '10' }).setToken(token);
    const commands = slashCommands.map(cmd => cmd.toJSON());
    const rawGuildIds = process.env.REGISTER_GUILD_IDS || process.env.GUILD_ID || '';
    const guildIds = rawGuildIds
      .split(',')
      .map(id => id.trim())
      .filter(Boolean);
    
    if (guildIds.length > 0) {
      console.log(`📝 Registering ${commands.length} slash commands to ${guildIds.length} guild(s)...`);
      console.log('⏳ Guild registration is usually near-instant...');

      const results = [];
      for (const guildId of guildIds) {
        const startTime = Date.now();
        const data = await rest.put(
          Routes.applicationGuildCommands(client.user.id, guildId),
          { body: commands }
        );
        const duration = Date.now() - startTime;
        const count = Array.isArray(data) ? data.length : commands.length;
        console.log(`✅ Registered ${count} commands for guild ${guildId} (took ${duration}ms)`);
        results.push({ guildId, count });
      }

      return { success: true, count: commands.length, guilds: results };
    }

    console.log(`📝 Registering ${commands.length} modern slash commands globally...`);
    console.log('⏳ Global registration can take up to 1 hour to appear everywhere.');

    // Register commands globally
    const startTime = Date.now();
    const data = await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    const duration = Date.now() - startTime;

    if (Array.isArray(data)) {
      console.log(`✅ Registered ${data.length} slash commands globally (took ${duration}ms)`);
      return { success: true, count: data.length };
    }

    console.log(`✅ Commands registered globally (took ${duration}ms)`);
    return { success: true, count: commands.length };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to register slash commands:', errMsg);
    return { success: false, error: errMsg };
  }
}

// ============== API ENDPOINTS FOR DASHBOARD ==============
app.get('/api/config', (req, res) => {
  const config = loadConfig();
  res.json({
    clientId: DISCORD_CLIENT_ID,
    botName: "SPIDEY BOT",
    guilds: config.guilds || {}
  });
});

app.post('/api/save-config', (req, res) => {
  const { guildId, updates } = req.body;
  if (!guildId || !updates) return res.status(400).json({ error: 'Missing guildId or updates' });
  
  const config = loadConfig();
  if (!config.guilds[guildId]) {
    config.guilds[guildId] = getGuildConfig(guildId);
  }
  
  config.guilds[guildId] = { ...config.guilds[guildId], ...updates };
  saveConfig(config);
  res.json({ success: true, config: config.guilds[guildId] });
});

app.get('/api/guilds', async (req, res) => {
  try {
    const guilds = client.guilds.cache.map(g => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      memberCount: g.memberCount
    }));
    res.json(guilds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});


// ============== WELCOME NEW MEMBERS ==============
client.on("guildMemberAdd", async (member) => {
  addActivity(member.guild.id, "👤", member.user.username, "joined the server");
  
  // Track new member joins
  const config = loadConfig();
  if (!config.guilds[member.guild.id]) config.guilds[member.guild.id] = {};
  if (!config.guilds[member.guild.id].memberEvents) config.guilds[member.guild.id].memberEvents = [];
  
  config.guilds[member.guild.id].memberEvents.unshift({
    type: "join",
    user: member.user.username,
    userId: member.user.id,
    timestamp: new Date().toLocaleString()
  });
  config.guilds[member.guild.id].memberEvents = config.guilds[member.guild.id].memberEvents.slice(0, 50);
  fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

  const guildConfig = getGuildConfig(member.guild.id);

  // ============== SERVER GUARD: RAID DETECTION ==============
  const rpConfig = guildConfig.raidProtection || {};
  if (rpConfig.enabled !== false) {
    const rKey = member.guild.id;
    const now = Date.now();
    if (!raidTracker.has(rKey)) raidTracker.set(rKey, { joins: [] });
    const rt = raidTracker.get(rKey);
    rt.joins.push(now);
    rt.joins = rt.joins.filter(t => now - t < 10000); // last 10 seconds
    const raidLimit = rpConfig.usersPerLimit || 10;

    if (rt.joins.length >= raidLimit) {
      sendAuditLog(member.guild, guildConfig, '🚨 RAID DETECTED', `**${rt.joins.length} joins in 10 seconds!**\nRaid threshold: ${raidLimit}\nLatest: ${member.user.tag}`, 0xED4245);

      if (rpConfig.banRaidUsers) {
        try {
          await member.ban({ reason: 'SpideyBot Raid Protection: mass join detected' });
          logModAction(member.guild, 'BAN', client.user, member.user.tag, 'Raid Protection: mass join');
        } catch (e) { console.error('Raid ban failed:', e.message); }
      }
      rt.joins = [];
    }
  }

  // ============== SERVER GUARD: JOIN GATE ==============
  const jgConfig = guildConfig.joinGate || {};
  if (jgConfig.enabled !== false) {
    const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
    const minAge = jgConfig.minAccountAge || 3;
    let kicked = false;
    let reason = '';

    // Account age check
    if (jgConfig.accountAgeCheck !== false && accountAgeDays < minAge) {
      kicked = true;
      reason = `Account too new (${Math.floor(accountAgeDays)} days old, minimum: ${minAge})`;
    }

    // Suspicious avatar check (no avatar)
    if (!kicked && jgConfig.suspiciousAvatars !== false && !member.user.avatar) {
      // Only flag very new accounts with no avatar
      if (accountAgeDays < 7) {
        kicked = true;
        reason = 'Suspicious: new account with no avatar';
      }
    }

    // Username analysis: contains invite links, mass numbers, or known spam patterns
    if (!kicked && jgConfig.usernameAnalysis !== false) {
      const uname = member.user.username.toLowerCase();
      if (uname.includes('discord.gg') || uname.includes('http') || /^[a-z]{1,2}\d{6,}$/.test(uname) || uname.includes('free nitro')) {
        kicked = true;
        reason = 'Suspicious username pattern: ' + member.user.username;
      }
    }

    if (kicked) {
      try {
        await member.send(`🚪 You were kicked from **${member.guild.name}** — ${reason}. Please contact an admin if this was a mistake.`).catch(() => {});
        await member.kick('SpideyBot Join Gate: ' + reason);
        logModAction(member.guild, 'KICK', client.user, member.user.tag, 'Join Gate: ' + reason);
        sendAuditLog(member.guild, guildConfig, '🚪 Join Gate KICK', `**User:** ${member.user.tag}\n**Reason:** ${reason}\n**Account Age:** ${Math.floor(accountAgeDays)} days`, 0xFF6B6B);
      } catch (e) { console.error('Join gate action failed:', e.message); }
      return; // Don't send welcome message to kicked user
    }
  }

  // Check if welcome messages are disabled via dashboard toggle
  if (guildConfig.welcomeMessages === false) return;
  
  const serverMessages = guildConfig.serverMessages || {};
  
  if (!serverMessages.enableWelcome || !guildConfig.welcomeChannelId) return;

  const welcomeChannel = member.guild.channels.cache.get(guildConfig.welcomeChannelId);
  if (welcomeChannel) {
    try {
      let message = serverMessages.welcomeMessage || "Welcome to our server! 🎉";
      message = message
        .replace(/{user}/g, member.toString())
        .replace(/{username}/g, member.user.username)
        .replace(/{displayname}/g, member.displayName)
        .replace(/{server}/g, member.guild.name)
        .replace(/{membercount}/g, member.guild.memberCount);

      await welcomeChannel.send(message);
      console.log(`✅ Welcome message sent to ${member.user.tag}`);
    } catch (error) {
      console.error(`❌ Failed to send welcome: ${error.message}`);
    }
  }
});

// ============== MEMBER LEAVES ==============
client.on("guildMemberRemove", async (member) => {
  addActivity(member.guild.id, "👋", member.user.username, "left the server");
  
  // Track member leaves
  const config = loadConfig();
  if (!config.guilds[member.guild.id]) config.guilds[member.guild.id] = {};
  if (!config.guilds[member.guild.id].memberEvents) config.guilds[member.guild.id].memberEvents = [];
  
  config.guilds[member.guild.id].memberEvents.unshift({
    type: "leave",
    user: member.user.username,
    userId: member.user.id,
    timestamp: new Date().toLocaleString()
  });
  config.guilds[member.guild.id].memberEvents = config.guilds[member.guild.id].memberEvents.slice(0, 50);
  fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

  // Send goodbye message if enabled
  const guildConfig = getGuildConfig(member.guild.id);
  const serverMessages = guildConfig.serverMessages || {};
  
  if (!serverMessages.enableGoodbye || !guildConfig.welcomeChannelId) return;

  const goodbyeChannel = member.guild.channels.cache.get(guildConfig.welcomeChannelId);
  if (goodbyeChannel) {
    try {
      let message = serverMessages.goodbyeMessage || "{user} has left the server.";
      message = message
        .replace(/{user}/g, member.user.username)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, member.guild.name);

      await goodbyeChannel.send(message);
      console.log(`✅ Goodbye message sent for ${member.user.tag}`);
    } catch (error) {
      console.error(`❌ Failed to send goodbye: ${error.message}`);
    }
  }
});

// ============== MEMBER UPDATES (BOOSTS, ROLES) ==============
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  // Check if member got a boost role
  const oldBoostRole = oldMember.roles.cache.some(r => r.name === "Server Booster" || r.name === "Nitro Booster");
  const newBoostRole = newMember.roles.cache.some(r => r.name === "Server Booster" || r.name === "Nitro Booster");
  
  if (!oldBoostRole && newBoostRole) {
    addActivity(newMember.guild.id, "💎", newMember.user.username, "boosted the server");
    
    // Track boosts
    const config = loadConfig();
    if (!config.guilds[newMember.guild.id]) config.guilds[newMember.guild.id] = {};
    if (!config.guilds[newMember.guild.id].memberEvents) config.guilds[newMember.guild.id].memberEvents = [];
    
    config.guilds[newMember.guild.id].memberEvents.unshift({
      type: "boost",
      user: newMember.user.username,
      userId: newMember.user.id,
      timestamp: new Date().toLocaleString()
    });
    config.guilds[newMember.guild.id].memberEvents = config.guilds[newMember.guild.id].memberEvents.slice(0, 50);
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
  }
});

// ============== ROLE EVENTS ==============
client.on("roleCreate", async (role) => {
  addActivity(role.guild.id, "🏷️", "Role created", `${role.name} - ${role.id}`);
});

client.on("roleDelete", async (role) => {
  addActivity(role.guild.id, "🗑️", "Role deleted", `${role.name} - ${role.id}`);
});

client.on("roleUpdate", async (oldRole, newRole) => {
  let changes = [];
  if (oldRole.name !== newRole.name) changes.push(`name: ${oldRole.name} → ${newRole.name}`);
  if (oldRole.color !== newRole.color) changes.push("color changed");
  if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push("permissions changed");
  
  if (changes.length > 0) {
    addActivity(newRole.guild.id, "✏️", "Role updated", `${newRole.name} - ${changes.join(", ")}`);
  }
});

// ============== CHANNEL EVENTS ==============
client.on("channelCreate", async (channel) => {
  if (channel.isDMBased()) return;
  addActivity(channel.guild.id, "📝", "Channel created", `#${channel.name} - ${channel.id}`);
});

client.on("channelDelete", async (channel) => {
  if (channel.isDMBased()) return;
  addActivity(channel.guild.id, "🗑️", "Channel deleted", `#${channel.name} - ${channel.id}`);

  // Anti-nuke: track channel deletions by audit log executor
  const guildConfig = getGuildConfig(channel.guild.id);
  const anConfig = guildConfig.antiNuke || {};
  if (anConfig.enabled !== false) {
    try {
      const auditLogs = await channel.guild.fetchAuditLogs({ type: 12, limit: 1 }); // CHANNEL_DELETE = 12
      const entry = auditLogs.entries.first();
      if (entry && entry.executor && !entry.executor.bot) {
        const key = `${channel.guild.id}:${entry.executor.id}`;
        const now = Date.now();
        if (!nukeTracker.has(key)) nukeTracker.set(key, { actions: [] });
        const nt = nukeTracker.get(key);
        nt.actions.push(now);
        nt.actions = nt.actions.filter(t => now - t < 30000);
        const maxActions = anConfig.maxActions || 10;

        if (nt.actions.length >= maxActions) {
          sendAuditLog(channel.guild, guildConfig, '🚨 ANTI-NUKE TRIGGERED', `**${entry.executor.tag}** performed ${nt.actions.length} destructive actions in 30s!\nAction: Channel deletion`, 0xED4245);
          if (anConfig.mode === 'lockdown') {
            try {
              const member = channel.guild.members.cache.get(entry.executor.id);
              if (member && member.manageable) {
                await member.roles.set([], 'SpideyBot Anti-Nuke: lockdown');
                await member.timeout(24 * 60 * 60 * 1000, 'Anti-Nuke: mass destructive actions');
              }
            } catch (e) { console.error('Anti-nuke lockdown failed:', e.message); }
          }
          nt.actions = [];
        }
      }
    } catch (e) { /* audit log fetch may fail without permissions */ }
  }
});

client.on("channelUpdate", async (oldChannel, newChannel) => {
  if (oldChannel.isDMBased()) return;
  let changes = [];
  if (oldChannel.name !== newChannel.name) changes.push(`name: ${oldChannel.name} → ${newChannel.name}`);
  if (oldChannel.topic !== newChannel.topic) changes.push("topic changed");
  if (oldChannel.type !== newChannel.type) changes.push("type changed");
  
  if (changes.length > 0) {
    addActivity(newChannel.guild.id, "✏️", "Channel updated", `#${newChannel.name} - ${changes.join(", ")}`);
  }
});

// ============== ANTI-NUKE: ROLE DELETE ==============
client.on("roleDelete", async (role) => {
  const guildConfig = getGuildConfig(role.guild.id);
  const anConfig = guildConfig.antiNuke || {};
  if (anConfig.enabled === false) return;
  try {
    const auditLogs = await role.guild.fetchAuditLogs({ type: 32, limit: 1 }); // ROLE_DELETE = 32
    const entry = auditLogs.entries.first();
    if (entry && entry.executor && !entry.executor.bot) {
      const key = `${role.guild.id}:${entry.executor.id}`;
      const now = Date.now();
      if (!nukeTracker.has(key)) nukeTracker.set(key, { actions: [] });
      const nt = nukeTracker.get(key);
      nt.actions.push(now);
      nt.actions = nt.actions.filter(t => now - t < 30000);
      const maxActions = anConfig.maxActions || 10;
      if (nt.actions.length >= maxActions) {
        sendAuditLog(role.guild, guildConfig, '🚨 ANTI-NUKE TRIGGERED', `**${entry.executor.tag}** deleted ${nt.actions.length} roles in 30s!`, 0xED4245);
        if (anConfig.mode === 'lockdown') {
          const member = role.guild.members.cache.get(entry.executor.id);
          if (member && member.manageable) {
            await member.roles.set([], 'Anti-Nuke: mass role deletion').catch(() => {});
            await member.timeout(24 * 60 * 60 * 1000, 'Anti-Nuke: mass role deletion').catch(() => {});
          }
        }
        nt.actions = [];
      }
    }
  } catch (e) { /* permissions may prevent audit log access */ }
});

// ============== ANTI-NUKE: MASS BAN DETECTION ==============
client.on("guildBanAdd", async (ban) => {
  addActivity(ban.guild.id, "🔨", ban.user.username, "was banned");
  const guildConfig = getGuildConfig(ban.guild.id);
  const anConfig = guildConfig.antiNuke || {};
  if (anConfig.enabled === false) return;
  try {
    const auditLogs = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 }); // MEMBER_BAN_ADD = 22
    const entry = auditLogs.entries.first();
    if (entry && entry.executor && !entry.executor.bot) {
      const key = `${ban.guild.id}:${entry.executor.id}`;
      const now = Date.now();
      if (!nukeTracker.has(key)) nukeTracker.set(key, { actions: [] });
      const nt = nukeTracker.get(key);
      nt.actions.push(now);
      nt.actions = nt.actions.filter(t => now - t < 30000);
      const maxActions = anConfig.maxActions || 10;
      if (nt.actions.length >= maxActions) {
        sendAuditLog(ban.guild, guildConfig, '🚨 ANTI-NUKE: MASS BAN', `**${entry.executor.tag}** banned ${nt.actions.length} users in 30s!`, 0xED4245);
        if (anConfig.mode === 'lockdown') {
          const member = ban.guild.members.cache.get(entry.executor.id);
          if (member && member.manageable) {
            await member.roles.set([], 'Anti-Nuke: mass banning').catch(() => {});
            await member.timeout(24 * 60 * 60 * 1000, 'Anti-Nuke: mass banning').catch(() => {});
          }
        }
        nt.actions = [];
      }
    }
  } catch (e) { /* permissions may prevent audit log access */ }
});

// ============== MESSAGE LOGGING ==============
client.on("messageDelete", async (message) => {
  if (!message.guild || message.author?.bot) return;
  const config = loadConfig();
  const logging = config.guilds?.[message.guild.id]?.logging?.messageLogging;
  if (!logging?.logDeleted || !logging?.logChannel) return;

  const logChannel = message.guild.channels.cache.get(logging.logChannel);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0xFF6B6B)
    .setTitle("🗑️ Message Deleted")
    .addFields(
      { name: "Author", value: message.author?.tag || "Unknown", inline: true },
      { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
      { name: "Content", value: (message.content || "*No text content*").substring(0, 1024) }
    )
    .setTimestamp();
  logChannel.send({ embeds: [embed] }).catch(() => {});
});

client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  const config = loadConfig();
  const logging = config.guilds?.[newMessage.guild.id]?.logging?.messageLogging;
  if (!logging?.logEdited || !logging?.logChannel) return;

  const logChannel = newMessage.guild.channels.cache.get(logging.logChannel);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0xFFBD39)
    .setTitle("✏️ Message Edited")
    .addFields(
      { name: "Author", value: newMessage.author?.tag || "Unknown", inline: true },
      { name: "Channel", value: `<#${newMessage.channel.id}>`, inline: true },
      { name: "Before", value: (oldMessage.content || "*empty*").substring(0, 1024) },
      { name: "After", value: (newMessage.content || "*empty*").substring(0, 1024) }
    )
    .setTimestamp();
  logChannel.send({ embeds: [embed] }).catch(() => {});
});

client.on("messageDeleteBulk", async (messages) => {
  const first = messages.first();
  if (!first?.guild) return;
  const config = loadConfig();
  const logging = config.guilds?.[first.guild.id]?.logging?.messageLogging;
  if (!logging?.logBulkDelete || !logging?.logChannel) return;

  const logChannel = first.guild.channels.cache.get(logging.logChannel);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle("🗑️ Bulk Message Delete")
    .addFields(
      { name: "Channel", value: `<#${first.channel.id}>`, inline: true },
      { name: "Messages Deleted", value: `${messages.size}`, inline: true }
    )
    .setTimestamp();
  logChannel.send({ embeds: [embed] }).catch(() => {});
});

// ============== REACTION ROLE HANDLERS ==============
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  // Partial handling — fetch full data if needed
  if (reaction.partial) { try { await reaction.fetch(); } catch (e) { return; } }
  if (reaction.message.partial) { try { await reaction.message.fetch(); } catch (e) { return; } }

  const guildId = reaction.message.guild?.id;
  if (!guildId) return;

  const config = loadConfig();
  const rr = config.guilds[guildId]?.reactRoles;
  if (!rr || !Array.isArray(rr.entries) || rr.entries.length === 0) return;

  const messageId = reaction.message.id;
  const emojiStr = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;

  // Find matching entry
  const entry = rr.entries.find(e => e.messageId === messageId && (e.emoji === emojiStr || e.emoji === reaction.emoji.name));
  if (!entry) return;

  try {
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);
    const role = guild.roles.cache.get(entry.roleId);
    if (!role) return;

    // If allowMultiple is false, check if user already has a reaction role from this message
    if (rr.allowMultiple === false) {
      const messageEntries = rr.entries.filter(e => e.messageId === messageId);
      for (const me of messageEntries) {
        if (me.roleId !== entry.roleId && member.roles.cache.has(me.roleId)) {
          const oldRole = guild.roles.cache.get(me.roleId);
          if (oldRole) await member.roles.remove(oldRole).catch(() => {});
          // Remove their reaction on the old emoji
          try {
            const oldReaction = reaction.message.reactions.cache.find(r => r.emoji.name === me.emoji || r.emoji.toString() === me.emoji);
            if (oldReaction) await oldReaction.users.remove(user.id).catch(() => {});
          } catch (e) { /* ignore */ }
        }
      }
    }

    await member.roles.add(role);
    console.log(`🎭 Reaction role: +@${role.name} to ${user.tag} (${guildId})`);

    // DM confirmation
    if (rr.dmConfirm) {
      try {
        await user.send({ embeds: [
          new EmbedBuilder()
            .setColor(0x00D4FF)
            .setTitle('✅ Role Added')
            .setDescription(`You've been given the **@${role.name}** role in **${guild.name}**!`)
            .setTimestamp()
        ]});
      } catch (e) { /* DMs may be disabled */ }
    }
  } catch (err) {
    console.error('❌ Reaction role add error:', err.message);
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) { try { await reaction.fetch(); } catch (e) { return; } }
  if (reaction.message.partial) { try { await reaction.message.fetch(); } catch (e) { return; } }

  const guildId = reaction.message.guild?.id;
  if (!guildId) return;

  const config = loadConfig();
  const rr = config.guilds[guildId]?.reactRoles;
  if (!rr || !Array.isArray(rr.entries) || rr.entries.length === 0) return;
  if (rr.removeOnUnreact === false) return; // Setting: don't remove on unreact

  const messageId = reaction.message.id;
  const emojiStr = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;

  const entry = rr.entries.find(e => e.messageId === messageId && (e.emoji === emojiStr || e.emoji === reaction.emoji.name));
  if (!entry) return;

  try {
    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);
    const role = guild.roles.cache.get(entry.roleId);
    if (!role) return;

    await member.roles.remove(role);
    console.log(`🎭 Reaction role: -@${role.name} from ${user.tag} (${guildId})`);

    // DM confirmation
    if (rr.dmConfirm) {
      try {
        await user.send({ embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('❌ Role Removed')
            .setDescription(`The **@${role.name}** role has been removed in **${guild.name}**.`)
            .setTimestamp()
        ]});
      } catch (e) { /* DMs may be disabled */ }
    }
  } catch (err) {
    console.error('❌ Reaction role remove error:', err.message);
  }
});

// ============== MESSAGE COMMANDS ==============
client.on("messageCreate", async (msg) => {
  if (msg.author.bot && !msg.guild.config?.messageCountingBots) return;
  if (!msg.member) return;
  
  // LOAD FRESH CONFIG FROM DASHBOARD FOR ALL FEATURES
  const guildConfig = getGuildConfig(msg.guild.id);

  // ============== MESSAGE COUNTING ==============
  const messageCounting = guildConfig.messageCounting || {};
  if (messageCounting.enabled !== false) {
    const ignoredChannels = messageCounting.ignoredChannels || [];
    if (!ignoredChannels.includes(msg.channelId)) {
      messageCounting.totalMessages = (messageCounting.totalMessages || 0) + 1;
      messageCounting.byUser = messageCounting.byUser || {};
      messageCounting.byChannel = messageCounting.byChannel || {};
      messageCounting.byUser[msg.author.id] = (messageCounting.byUser[msg.author.id] || 0) + 1;
      messageCounting.byChannel[msg.channelId] = (messageCounting.byChannel[msg.channelId] || 0) + 1;
      guildConfig.messageCounting = messageCounting;
      updateGuildConfig(msg.guild.id, { messageCounting });
    }
  }

  // ============== SERVER GUARD: ANTI-SPAM ==============
  const asConfig = guildConfig.antiSpam || {};
  if (asConfig.enabled !== false && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const key = `${msg.guild.id}:${msg.author.id}`;
    const now = Date.now();
    if (!spamTracker.has(key)) spamTracker.set(key, { timestamps: [], warned: false });
    const tracker = spamTracker.get(key);
    tracker.timestamps.push(now);
    // Keep only messages within the last 5 seconds
    tracker.timestamps = tracker.timestamps.filter(t => now - t < 5000);
    const limit = asConfig.messagesPerLimit || 5;

    if (tracker.timestamps.length > limit) {
      const action = (asConfig.action || 'warn').toLowerCase();
      try {
        if (action === 'ban') {
          await msg.member.ban({ reason: 'SpideyBot Anti-Spam: exceeded message limit' });
          logModAction(msg.guild, 'BAN', client.user, msg.author.tag, 'Anti-Spam: exceeded message limit');
          sendAuditLog(msg.guild, guildConfig, '🛡️ Anti-Spam BAN', `${msg.author.tag} was banned for spamming (${tracker.timestamps.length} msgs in 5s)`, 0xED4245);
        } else if (action === 'kick') {
          await msg.member.kick('SpideyBot Anti-Spam: exceeded message limit');
          logModAction(msg.guild, 'KICK', client.user, msg.author.tag, 'Anti-Spam: exceeded message limit');
          sendAuditLog(msg.guild, guildConfig, '🛡️ Anti-Spam KICK', `${msg.author.tag} was kicked for spamming (${tracker.timestamps.length} msgs in 5s)`, 0xFF6B6B);
        } else if (action === 'mute') {
          await msg.member.timeout(5 * 60 * 1000, 'SpideyBot Anti-Spam: exceeded message limit');
          logModAction(msg.guild, 'MUTE', client.user, msg.author.tag, 'Anti-Spam: 5min timeout');
          sendAuditLog(msg.guild, guildConfig, '🛡️ Anti-Spam MUTE', `${msg.author.tag} was timed out for spamming (${tracker.timestamps.length} msgs in 5s)`, 0xFFBD39);
        } else if (!tracker.warned) {
          await msg.reply('⚠️ **Slow down!** You are sending messages too fast.');
          tracker.warned = true;
          logModAction(msg.guild, 'WARN', client.user, msg.author.tag, 'Anti-Spam: sending messages too fast');
          sendAuditLog(msg.guild, guildConfig, '🛡️ Anti-Spam WARN', `${msg.author.tag} warned for spamming (${tracker.timestamps.length} msgs in 5s)`, 0xFFBD39);
          setTimeout(() => { tracker.warned = false; }, 10000);
        }
      } catch (e) { console.error('Anti-spam action failed:', e.message); }
      tracker.timestamps = [];
      return;
    }
  }

  // ============== SERVER GUARD: LINK SCANNING ==============
  const lsConfig = guildConfig.linkScanning || {};
  if (lsConfig.enabled !== false && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const urlRegex = /https?:\/\/([^\s\/]+)/gi;
    let match;
    while ((match = urlRegex.exec(msg.content)) !== null) {
      const domain = match[1].toLowerCase();
      let blocked = false;
      let reason = '';

      if (lsConfig.detectPhishing !== false && PHISH_DOMAINS.some(p => domain.includes(p))) {
        blocked = true; reason = 'Phishing link detected';
      }
      if (lsConfig.blockScamSites !== false && (domain.includes('free-nitro') || domain.includes('gift-discord') || domain.includes('steam-community') || domain.includes('robux-free'))) {
        blocked = true; reason = 'Scam site blocked';
      }
      // Discord invite links from other servers
      if (lsConfig.blockScamSites !== false && (domain.includes('discord.gg') || domain.includes('discordapp.com/invite'))) {
        blocked = true; reason = 'Unauthorized invite link';
      }

      if (blocked) {
        try {
          await msg.delete();
          await msg.channel.send(`🚫 **Link blocked** — ${reason}. Message from ${msg.author} was removed.`);
          sendAuditLog(msg.guild, guildConfig, '🔗 Link Blocked', `**User:** ${msg.author.tag}\n**Reason:** ${reason}\n**Domain:** ${domain}`, 0xED4245);
        } catch (e) { console.error('Link scan action failed:', e.message); }
        return;
      }
    }
  }

  // ============== SERVER GUARD: RATE LIMITING ==============
  const rlConfig = guildConfig.rateLimiting || {};
  if (rlConfig.enabled !== false && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const key = `${msg.guild.id}:${msg.author.id}`;
    const now = Date.now();
    if (!userRateLimit.has(key)) userRateLimit.set(key, { timestamps: [] });
    const rl = userRateLimit.get(key);
    rl.timestamps.push(now);
    rl.timestamps = rl.timestamps.filter(t => now - t < 60000);
    const perMin = rlConfig.requestsPerMin || 100;

    if (rl.timestamps.length > perMin) {
      const action = (rlConfig.action || 'throttle').toLowerCase();
      try {
        if (action === 'kick') {
          await msg.member.kick('SpideyBot Rate Limit exceeded');
          sendAuditLog(msg.guild, guildConfig, '📊 Rate Limit KICK', `${msg.author.tag} kicked for exceeding ${perMin} msgs/min`, 0xFF6B6B);
        } else if (action === 'block') {
          await msg.member.timeout(10 * 60 * 1000, 'SpideyBot Rate Limit: temp block');
          sendAuditLog(msg.guild, guildConfig, '📊 Rate Limit BLOCK', `${msg.author.tag} blocked 10min for exceeding ${perMin} msgs/min`, 0xFFBD39);
        } else {
          await msg.member.timeout(60 * 1000, 'SpideyBot Rate Limit: throttle');
          sendAuditLog(msg.guild, guildConfig, '📊 Rate Limit Throttle', `${msg.author.tag} throttled for exceeding ${perMin} msgs/min`, 0xFFBD39);
        }
      } catch (e) { console.error('Rate limit action failed:', e.message); }
      rl.timestamps = [];
      return;
    }
  }

  // ============== PERMISSIONS FROM DASHBOARD ==============
  if (msg.content.startsWith("/")) {
    const permissions = guildConfig.permissions || {};
    if (permissions.membersOnly) {
      const hasMembersRole = msg.member.roles.cache.some(role => role.name === "Members");
      if (!hasMembersRole && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return msg.reply("❌ Only members with the **@Members** role can use bot commands!");
      }
    }
  }

  // ============== AUTO XP GAIN ==============
  if (!msg.content.startsWith("/") && guildConfig.levelingSystem !== false) {
    const levels = guildConfig.levels || {};
    const userId = msg.author.id;
    const lastXpTime = levels[`${userId}_xp_time`] || 0;
    const now = Date.now();

    if (now - lastXpTime > 60000) {
      const xpGain = Math.floor(Math.random() * 20) + 10;
      levels[userId] = (levels[userId] || 0) + xpGain;
      levels[`${userId}_xp_time`] = now;

      const currentXp = levels[userId];
      const nextLevelXp = (Math.floor(currentXp / 500) + 1) * 500;
      if (currentXp >= nextLevelXp) {
        const level = Math.floor(currentXp / 500) + 1;
        msg.reply(`🎉 **${msg.author.username}** leveled up to **Level ${level}**! 🎉`);
        addActivity(msg.guild.id, "⬆️", msg.author.username, `leveled up to Level ${level}`);

        const levelRoles = guildConfig.levelRoles || {};
        const newRoleId = levelRoles[`level_${level}`];

        try {
          // Remove all old level roles (1-99)
          for (let oldLevel = 1; oldLevel < level; oldLevel++) {
            const oldRoleId = levelRoles[`level_${oldLevel}`];
            if (oldRoleId) {
              const oldRole = msg.guild.roles.cache.get(oldRoleId);
              if (oldRole && msg.member.roles.cache.has(oldRoleId)) {
                await msg.member.roles.remove(oldRole);
              }
            }
          }

          // Add new level role
          if (newRoleId) {
            const newRole = msg.guild.roles.cache.get(newRoleId);
            if (newRole) await msg.member.roles.add(newRole);
          }
        } catch (err) {
          console.error(`❌ Failed to manage level roles: ${err.message}`);
        }
      }

      updateGuildConfig(msg.guild.id, { levels });
    }
  }

  // Message Statistics
  if (msg.content === "/stats") {
    const messageCounting = guildConfig.messageCounting || {};
    const userCount = Object.keys(messageCounting.byUser || {}).length;
    const channelCount = Object.keys(messageCounting.byChannel || {}).length;
    const userMessages = messageCounting.byUser?.[msg.author.id] || 0;
    const topUsers = Object.entries(messageCounting.byUser || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => `<@${userId}>: **${count}**`)
      .join("\n");

    const statsEmbed = new EmbedBuilder()
      .setColor('#004B87')
      .setTitle("📊 Message Statistics")
      .addFields(
        { name: "📈 Total Messages", value: `${messageCounting.totalMessages || 0}`, inline: true },
        { name: "👥 Active Users", value: `${userCount}`, inline: true },
        { name: "💬 Active Channels", value: `${channelCount}`, inline: true },
        { name: "📝 Your Messages", value: `${userMessages}`, inline: true },
        { name: "🏆 Top 5 Messengers", value: topUsers || "No data yet" }
      )
      .setFooter({ text: "SPIDEY BOT • Message Counter" })
      .setTimestamp();

    return msg.reply({ embeds: [statsEmbed] });
  }

  // Bot Status
  if (msg.content === "/ping") {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const guilds = client.guilds.cache.size;
    const activeQueues = player.queues.size;

    const statusEmbed = new EmbedBuilder()
      .setColor('#004B87')
      .setTitle("🤖 SPIDEY BOT - Status")
      .addFields(
        { name: "🔌 Latency", value: `${client.ws.ping}ms`, inline: true },
        { name: "⏱️ Uptime", value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
        { name: "🖥️ Memory", value: `${memory}MB`, inline: true },
        { name: "🏢 Servers", value: `${guilds}`, inline: true },
        { name: "🎵 Active Music", value: `${activeQueues} queue${activeQueues !== 1 ? "s" : ""}`, inline: true },
        { name: "👤 Bot Version", value: "v2.0", inline: true },
        { name: "Status", value: "✅ **ONLINE** - All systems operational!", inline: false }
      )
      .setFooter({ text: "SPIDEY BOT • Always ready to serve" })
      .setTimestamp();

    return msg.reply({ embeds: [statusEmbed] });
  }

  // List all active roles
  if (msg.content === "/list-roles") {
    const categories = guildConfig.roleCategories || {};
    console.log(`DEBUG: /list-roles invoked - categories keys: ${Object.keys(categories).length}`);
    if (Object.keys(categories).length === 0) {
      return msg.reply("❌ No role categories created yet! Use `/create-category [name]` to get started.");
    }

    const fields = Object.entries(categories).map(([catName, catData]) => {
      const roles = Array.isArray(catData) ? catData : (catData.roles || []);
      const banner = !Array.isArray(catData) && catData.banner ? " 🎬" : "";
      return {
        name: catName + banner,
        value: roles.length > 0 ? roles.map(r => `• ${r.name}`).join("\n") : "No roles",
        inline: false
      };
    });

    const rolesEmbed = new EmbedBuilder()
      .setColor('#004B87')
      .setTitle("📋 Active Role Categories")
      .setDescription("🎬 = Has a banner image")
      .addFields(...fields)
      .setFooter({ text: "SPIDEY BOT" });
    return msg.reply({ embeds: [rolesEmbed] });
  }

  // Create a new category
  if (msg.content.startsWith("/create-category ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can create categories!");
    }
    const categoryName = msg.content.slice(18).trim();
    if (!categoryName) return msg.reply("Usage: /create-category [name]");
    const categories = guildConfig.roleCategories || {};
    if (categories[categoryName]) return msg.reply(`❌ Category "${categoryName}" already exists!`);
    categories[categoryName] = { roles: [], banner: null };
    updateGuildConfig(msg.guild.id, { roleCategories: categories });
    addActivity(msg.guild.id, "📂", msg.author.username, `created category: ${categoryName}`);
    return msg.reply(`✅ Created category: **${categoryName}**\n\n*Tip: Use \`/set-category-banner ${categoryName} [gif-url]\` to add a banner!*`);
  }

  // Add a role to a category
  if (msg.content.startsWith("/addrole ")) {
    // Guild-only command
    if (!msg.guild) {
      return msg.reply("❌ This command only works in servers!");
    }
    
    // Admin permission check
    if (!msg.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    
    try {
      const args = msg.content.slice(9).trim().split(" ");
      const categoryName = args[0];
      const roleName = args[1];
      const roleId = args[2];
      
      if (!categoryName || !roleName || !roleId) {
        return msg.reply("Usage: /addrole [category] [role name] [role ID]\n\nExample: /addrole Gaming Minecraft 123456789");
      }
      
      // Verify role ID is valid and exists in guild
      const role = await msg.guild.roles.fetch(roleId).catch(() => null);
      if (!role) {
        return msg.reply(`❌ Role with ID \`${roleId}\` not found in this server! Make sure the ID is correct.`);
      }
      
      const categories = guildConfig.roleCategories || {};
      if (!categories[categoryName]) {
        return msg.reply(`❌ Category "${categoryName}" doesn't exist!\n\nCreate it first with: \`/create-category ${categoryName}\``);
      }
      
      const catData = Array.isArray(categories[categoryName]) 
        ? { roles: categories[categoryName], banner: null } 
        : categories[categoryName];
      
      if (catData.roles.some(r => r.name === roleName)) {
        return msg.reply(`❌ Role "${roleName}" is already in category "${categoryName}"!`);
      }
      
      catData.roles.push({ name: roleName, id: roleId });
      categories[categoryName] = catData;
      updateGuildConfig(msg.guild.id, { roleCategories: categories });
      addActivity(msg.guild.id, "➕", msg.author.username, `added role: ${roleName} to ${categoryName}`);
      return msg.reply(`✅ Added **${roleName}** (${role}) to category **${categoryName}**\n\n*Tip: Use \`/setupcategory ${categoryName}\` to post reaction roles!*`);
    } catch (err) {
      console.error(`❌ Error adding role: ${err.message}`);
      return msg.reply(`❌ Error adding role. Please check the role ID and try again.`);
    }
  }

  // Remove a role from a category
  if (msg.content.startsWith("/removerole ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const args = msg.content.slice(12).trim().split(" ");
    const categoryName = args[0];
    const roleName = args[1];
    if (!categoryName || !roleName) {
      return msg.reply("Usage: /removerole [category] [role name]");
    }
    const categories = guildConfig.roleCategories || {};
    if (!categories[categoryName]) return msg.reply(`❌ Category "${categoryName}" not found!`);
    const catData = Array.isArray(categories[categoryName]) ? { roles: categories[categoryName], banner: null } : categories[categoryName];
    const index = catData.roles.findIndex(r => r.name === roleName);
    if (index === -1) return msg.reply(`❌ Role "${roleName}" not found in this category!`);
    catData.roles.splice(index, 1);
    categories[categoryName] = catData;
    updateGuildConfig(msg.guild.id, { roleCategories: categories });
    addActivity(msg.guild.id, "➖", msg.author.username, `removed role: ${roleName} from ${categoryName}`);
    return msg.reply(`✅ Removed **${roleName}** from **${categoryName}**`);
  }

  // Set category banner
  if (msg.content.startsWith("/set-category-banner ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set banners!");
    }
    const args = msg.content.slice(22).trim().split(" ");
    const categoryName = args[0];
    const bannerUrl = args.slice(1).join(" ");
    if (!categoryName || !bannerUrl) {
      return msg.reply("Usage: /set-category-banner [category] [gif-url]\n\nExample: /set-category-banner Gaming https://example.com/gaming.gif");
    }
    const categories = guildConfig.roleCategories || {};
    if (!categories[categoryName]) return msg.reply(`❌ Category "${categoryName}" not found!`);
    const catData = Array.isArray(categories[categoryName]) ? { roles: categories[categoryName], banner: null } : categories[categoryName];
    catData.banner = bannerUrl;
    categories[categoryName] = catData;
    updateGuildConfig(msg.guild.id, { roleCategories: categories });
    addActivity(msg.guild.id, "🎬", msg.author.username, `set banner for category: ${categoryName}`);
    return msg.reply(`✅ Banner set for **${categoryName}**!\n\n*Use \`/setup-category ${categoryName}\` to see it in action!*`);
  }

  // Delete a category
  if (msg.content.startsWith("/delete-category ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can delete categories!");
    }
    const categoryName = msg.content.slice(18).trim();
    if (!categoryName) return msg.reply("Usage: /delete-category [name]");
    const categories = guildConfig.roleCategories || {};
    if (!categories[categoryName]) return msg.reply(`❌ Category "${categoryName}" not found!`);
    delete categories[categoryName];
    updateGuildConfig(msg.guild.id, { roleCategories: categories });
    addActivity(msg.guild.id, "🗑️", msg.author.username, `deleted category: ${categoryName}`);
    return msg.reply(`✅ Deleted category: **${categoryName}**`);
  }

  // ============== ECONOMY SYSTEM ==============
  if (msg.content === "/balance") {
    const economy = guildConfig.economy || {};
    const balance = economy[msg.author.id] || 0;
    const balanceEmbed = new EmbedBuilder()
      .setColor('#004B87')
      .setTitle("💰 Your Balance")
      .setDescription(`You have **${balance} coins** 🪙`)
      .setFooter({ text: "SPIDEY BOT Economy" });
    return msg.reply({ embeds: [balanceEmbed] });
  }

  if (msg.content === "/daily") {
    const economy = guildConfig.economy || {};
    const lastDaily = economy[msg.author.id + "_daily"] || 0;
    const now = Date.now();
    if (now - lastDaily < 86400000) {
      const remaining = Math.ceil((86400000 - (now - lastDaily)) / 3600000);
      return msg.reply(`⏳ You can claim your daily reward in ${remaining} hours!`);
    }
    const reward = 100;
    economy[msg.author.id] = (economy[msg.author.id] || 0) + reward;
    economy[msg.author.id + "_daily"] = now;
    updateGuildConfig(msg.guild.id, { economy });
    return msg.reply(`✅ Claimed daily reward! You got **${reward} coins** 🪙`);
  }

  if (msg.content.startsWith("/work")) {
    const economy = guildConfig.economy || {};
    const lastWork = economy[msg.author.id + "_work"] || 0;
    if (Date.now() - lastWork < 300000) {
      return msg.reply("⏳ You need to wait 5 minutes between work shifts!");
    }
    const earnings = Math.floor(Math.random() * 50) + 25;
    economy[msg.author.id] = (economy[msg.author.id] || 0) + earnings;
    economy[msg.author.id + "_work"] = Date.now();
    updateGuildConfig(msg.guild.id, { economy });
    return msg.reply(`💼 You worked and earned **${earnings} coins**! 🪙`);
  }

  if (msg.content.startsWith("/transfer ")) {
    const args = msg.content.slice(11).trim().split(" ");
    const target = msg.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target || !amount || amount <= 0) return msg.reply("Usage: /transfer @user [amount]");
    const economy = guildConfig.economy || {};
    const senderBalance = economy[msg.author.id] || 0;
    if (senderBalance < amount) return msg.reply(`❌ Insufficient funds! You only have ${senderBalance} coins.`);
    economy[msg.author.id] = senderBalance - amount;
    economy[target.id] = (economy[target.id] || 0) + amount;
    updateGuildConfig(msg.guild.id, { economy });
    return msg.reply(`✅ Transferred **${amount} coins** to ${target.toString()}! 🪙`);
  }

  // ============== LEVELING SYSTEM ==============
  if (msg.content === "/level") {
    const levels = guildConfig.levels || {};
    const level = levels[msg.author.id] || 0;
    const xp = levels[msg.author.id + "_xp"] || 0;
    const levelEmbed = new EmbedBuilder()
      .setColor('#004B87')
      .setTitle("📊 Your Level")
      .addFields(
        { name: "Level", value: `${level}`, inline: true },
        { name: "XP", value: `${xp} / ${(level + 1) * 100}`, inline: true }
      )
      .setFooter({ text: "SPIDEY BOT Leveling" });
    return msg.reply({ embeds: [levelEmbed] });
  }

  if (msg.content === "/leaderboard") {
    const levels = guildConfig.levels || {};
    const sorted = Object.entries(levels)
      .filter(([k, v]) => !k.includes("_"))
      .map(([userId, level]) => ({ userId, level }))
      .sort((a, b) => b.level - a.level)
      .slice(0, 10);

    const leaderboardEmbed = new EmbedBuilder()
      .setColor('#004B87')
      .setTitle("🏆 Server Leaderboard")
      .setDescription(sorted.length === 0 ? "No data yet!" : sorted.map((e, i) => `**${i + 1}.** <@${e.userId}> - Level ${e.level}`).join("\n"))
      .setFooter({ text: "SPIDEY BOT Leaderboard" });
    return msg.reply({ embeds: [leaderboardEmbed] });
  }

  // Gain XP on message (every message)
  if (!guildConfig.levels) guildConfig.levels = {};
  const levels = guildConfig.levels;
  const xpGain = Math.floor(Math.random() * 25) + 5;
  levels[msg.author.id + "_xp"] = (levels[msg.author.id + "_xp"] || 0) + xpGain;
  const currentLevel = levels[msg.author.id] || 0;
  const xpNeeded = (currentLevel + 1) * 100;
  if (levels[msg.author.id + "_xp"] >= xpNeeded) {
    levels[msg.author.id] = currentLevel + 1;
    levels[msg.author.id + "_xp"] = 0;
    updateGuildConfig(msg.guild.id, { levels });
    msg.reply(`🎉 ${msg.author} leveled up to **Level ${currentLevel + 1}**!`).catch(() => {});
  } else {
    updateGuildConfig(msg.guild.id, { levels });
  }

  // ============== SERVER PROTECTION ==============
  if (msg.content.startsWith("/filter-toggle")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can toggle the filter!");
    }
    const newState = !guildConfig.profanityFilterEnabled;
    updateGuildConfig(msg.guild.id, { profanityFilterEnabled: newState });
    return msg.reply(`✅ Profanity filter is now **${newState ? "ON" : "OFF"}**`);
  }

  // Auto-delete messages with profanity
  if (guildConfig.profanityFilterEnabled && guildConfig.badWords) {
    const hasSwearing = guildConfig.badWords.some(word => msg.content.toLowerCase().includes(word.toLowerCase()));
    if (hasSwearing && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      msg.delete().catch(() => {});
      return msg.author.send("⚠️ Your message was deleted because it contains profanity.").catch(() => {});
    }
  }

  // ============== LINK FILTERING ==============
  if (msg.content.startsWith("/link-filter ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can toggle link filter!");
    }
    const newState = !guildConfig.linkFilterEnabled;
    updateGuildConfig(msg.guild.id, { linkFilterEnabled: newState });
    return msg.reply(`✅ Link filter is now **${newState ? "ON" : "OFF"}**`);
  }

  // Auto-delete messages with links/invites
  if (guildConfig.linkFilterEnabled && !msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const linkRegex = /(https?:\/\/[^\s]+|discord\.(gg|io|me)\/[^\s]+)/gi;
    if (linkRegex.test(msg.content)) {
      msg.delete().catch(() => {});
      return msg.author.send("🔗 Links are not allowed in this server!").catch(() => {});
    }
  }

  // ============== TICKET SYSTEM ==============
  if (msg.content === "/ticket") {
    if (!guildConfig.ticketsEnabled) return msg.reply("❌ Ticket system is not enabled! Admin use: `/ticket-setup #channel`");
    const userId = msg.author.id;
    const ticketChannelName = `ticket-${msg.author.username.slice(0, 10)}`;

    try {
      const ticketChannel = await msg.guild.channels.create({
        name: ticketChannelName,
        type: 0,
        permissionOverwrites: [
          { id: msg.guild.id, deny: ["ViewChannel"] },
          { id: userId, allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"] }
        ]
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor('#004B87')
        .setTitle("🎫 Support Ticket Created")
        .setDescription(`Support team will be with you shortly!`)
        .addFields({ name: "User", value: msg.author.toString(), inline: true });

      ticketChannel.send({ embeds: [ticketEmbed] });
      return msg.reply(`✅ Ticket created: ${ticketChannel.toString()}`);
    } catch (error) {
      return msg.reply("❌ Failed to create ticket!");
    }
  }

  if (msg.content === "/close-ticket") {
    if (!msg.channel.name.startsWith("ticket-")) return msg.reply("❌ This is not a ticket channel!");
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can close tickets!");
    msg.channel.delete().catch(() => {});
  }

  if (msg.content.startsWith("/ticket-setup ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can setup tickets!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: /ticket-setup #channel");
    updateGuildConfig(msg.guild.id, { ticketsEnabled: true, ticketChannelId: channel.id });
    return msg.reply(`✅ Ticket system enabled! Users can create tickets with \`/ticket\``);
  }

  // ============== CUSTOM COMMANDS ==============
  if (msg.content.startsWith("/addcmd ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can create custom commands!");
    }
    const args = msg.content.slice(9).trim().split("|");
    const cmdName = args[0]?.trim();
    const cmdResponse = args[1]?.trim();
    if (!cmdName || !cmdResponse) return msg.reply("Usage: /addcmd [command] | [response]\nExample: /addcmd hello | Hey there!");

    const customCmds = guildConfig.customCommands || {};
    customCmds[cmdName] = cmdResponse;
    updateGuildConfig(msg.guild.id, { customCommands: customCmds });
    return msg.reply(`✅ Custom command **${cmdName}** created! Use \`/${cmdName}\` to trigger it.`);
  }

  if (msg.content.startsWith("/delcmd ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can delete custom commands!");
    }
    const cmdName = msg.content.slice(9).trim();
    if (!cmdName) return msg.reply("Usage: /delcmd [command]");

    const customCmds = guildConfig.customCommands || {};
    if (!customCmds[cmdName]) return msg.reply(`❌ Custom command **${cmdName}** not found!`);
    delete customCmds[cmdName];
    updateGuildConfig(msg.guild.id, { customCommands: customCmds });
    return msg.reply(`✅ Custom command **${cmdName}** deleted!`);
  }

  // Trigger custom commands
  const customCmds = guildConfig.customCommands || {};
  if (msg.content.startsWith("/") && msg.content.length > 2) {
    const cmdName = msg.content.slice(2).split(" ")[0];
    if (customCmds[cmdName]) {
      return msg.reply(customCmds[cmdName]);
    }
  }

  // ============== COMMUNITY TOOLS ==============
  if (msg.content === "/suggest") {
    return msg.reply("Usage: /suggest [your suggestion]");
  }

  if (msg.content.startsWith("/suggest ")) {
    const suggestion = msg.content.slice(10).trim();
    if (!suggestion) return msg.reply("Usage: /suggest [your suggestion]");
    const suggestionsChannel = guildConfig.suggestionsChannelId ? msg.guild.channels.cache.get(guildConfig.suggestionsChannelId) : null;
    if (!suggestionsChannel) return msg.reply("❌ Suggestions channel not configured! Admin needs to set it with `/config-suggestions #channel`");

    const suggestionEmbed = new EmbedBuilder()
      .setColor('#004B87')
      .setTitle("📝 New Suggestion")
      .setDescription(suggestion)
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setFooter({ text: "React with 👍 or 👎 to vote" });

    const suggestionMsg = await suggestionsChannel.send({ embeds: [suggestionEmbed] });
    await suggestionMsg.react("👍");
    await suggestionMsg.react("👎");
    return msg.reply("✅ Suggestion submitted!");
  }

  if (msg.content.startsWith("/config-suggestions ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure channels!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: /config-suggestions #channel");
    updateGuildConfig(msg.guild.id, { suggestionsChannelId: channel.id });
    return msg.reply(`✅ Suggestions channel set to ${channel}`);
  }

  if (msg.content.startsWith("/giveaway ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can create giveaways!");
    }
    const args = msg.content.slice(11).trim().split(" ");
    const prize = args[0];
    const duration = parseInt(args[1]) || 60;
    if (!prize) return msg.reply("Usage: /giveaway [prize] [duration in seconds]");

    const giveawayEmbed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle("🎁 GIVEAWAY!")
      .setDescription(`**Prize:** ${prize}\n**Duration:** ${duration} seconds\n\nReact with 🎉 to enter!`)
      .setFooter({ text: "SPIDEY BOT Giveaway" });

    const giveawayMsg = await msg.channel.send({ embeds: [giveawayEmbed] });
    await giveawayMsg.react("🎉");

    setTimeout(async () => {
      const reactions = giveawayMsg.reactions.cache.get("🎉");
      if (!reactions) return;
      const users = await reactions.users.fetch();
      const filteredUsers = users.filter(u => !u.bot).map(u => u.id);
      const winner = filteredUsers[Math.floor(Math.random() * filteredUsers.length)];
      if (!winner) return msg.channel.send("❌ No valid entries!");
      msg.channel.send(`🎉 Winner: <@${winner}> won **${prize}**!`);
    }, duration * 1000);

    return msg.reply("✅ Giveaway started!");
  }

  // ============== FUN COMMANDS ==============
  if (msg.content === "/8ball") {
    const responses = ["Yes! 🎯", "No! ❌", "Maybe... 🤔", "Absolutely! ✅", "Not likely! 😅", "Ask again later 🔮", "Definitely! 💯", "I don't think so 👎"];
    return msg.reply(responses[Math.floor(Math.random() * responses.length)]);
  }

  if (msg.content === "/dice") {
    const roll = Math.floor(Math.random() * 6) + 1;
    return msg.reply(`🎲 You rolled a **${roll}**!`);
  }

  if (msg.content === "/coin") {
    const flip = Math.random() < 0.5 ? "Heads" : "Tails";
    return msg.reply(`🪙 **${flip}**!`);
  }

  if (msg.content === "/trivia") {
    const trivia = [
      { question: "What is the capital of France?", answer: "Paris" },
      { question: "What is 2 + 2?", answer: "4" },
      { question: "What is the largest planet?", answer: "Jupiter" }
    ];
    const q = trivia[Math.floor(Math.random() * trivia.length)];
    const triviaEmbed = new EmbedBuilder()
      .setColor('#004B87')
      .setTitle("🧠 Trivia Question")
      .setDescription(q.question)
      .setFooter({ text: `Answer: ${q.answer}` });
    return msg.reply({ embeds: [triviaEmbed] });
  }

  if (msg.content === "/rps") {
    return msg.reply("Usage: /rps [rock/paper/scissors]");
  }

  if (msg.content.startsWith("/rps ")) {
    const choices = ["rock", "paper", "scissors"];
    const userChoice = msg.content.slice(6).trim().toLowerCase();
    if (!choices.includes(userChoice)) return msg.reply("Choose: rock, paper, or scissors!");
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    const results = {
      "rock_scissors": "You won! 🎉",
      "paper_rock": "You won! 🎉",
      "scissors_paper": "You won! 🎉",
      "rock_rock": "It's a tie! 🤝",
      "paper_paper": "It's a tie! 🤝",
      "scissors_scissors": "It's a tie! 🤝"
    };
    const key = userChoice + "_" + botChoice;
    const result = results[key] || "I won! 😎";
    return msg.reply(`You chose **${userChoice}**, I chose **${botChoice}**\n${result}`);
  }

  // ============== DEVELOPERS ==============
  if (msg.content === "/developers") {
    const developersEmbed = new EmbedBuilder()
      .setColor('#004B87')
      .setTitle("👨‍💻 SPIDEY BOT Developers")
      .setDescription("Meet the team behind SPIDEY BOT!")
      .addFields(
        { name: "🕷️ Main Developer", value: "Peter Burke", inline: false },
        { name: "💜 Support", value: "Join our developer community to help shape SPIDEY BOT's future!", inline: false }
      )
      .addFields(
        { name: "🔗 Developer Discord", value: "[Join the Dev Server](https://discord.gg/spideybotdev)", inline: true }
      )
      .setFooter({ text: "Want to contribute? Join our Discord!" });
    return msg.reply({ embeds: [developersEmbed] });
  }

  // Help - List all user commands
  if (msg.content === "/help") {
    // Organize commands by category and subsection
    const categoryMap = {};
    Object.entries(COMMANDS_META).forEach(([name, meta]) => {
      // Skip admin-only commands from public /help
      if (meta && meta.adminOnly) return;
      const cat = meta.category || 'misc';
      if (!categoryMap[cat]) categoryMap[cat] = {};
      const subsec = meta.subsection || 'Other';
      if (!categoryMap[cat][subsec]) categoryMap[cat][subsec] = [];
      categoryMap[cat][subsec].push(name);
    });

    const helpEmbed = new EmbedBuilder()
      .setColor('#004B87')
      .setTitle("🤖 SPIDEY BOT - All Commands")
      .setDescription("Organized by category and subsection. Type `/[command]` to use!");

    // Add category sections dynamically
    const categoryEmojis = {
      music: "🎵",
      games: "🎮",
      economy: "💰",
      leveling: "📊",
      moderation: "🛡️",
      roles: "👤",
      social: "📱",
      config: "⚙️",
      tickets: "🎫",
      custom: "✨",
      giveaway: "🎁",
      info: "ℹ️"
    };

    const catOrder = ['music','games','economy','leveling','info'];
    catOrder.forEach(cat => {
      if (!categoryMap[cat]) return;
      const subsections = categoryMap[cat];
      const emoji = categoryEmojis[cat] || "📌";
      
      // Build subsection display
      let catDisplay = "";
      Object.keys(subsections).sort().forEach(subsec => {
        const cmds = subsections[subsec].map(c => `/${c}`).join(" • ");
        catDisplay += `**${subsec}:** ${cmds}\n`;
      });

      helpEmbed.addFields({
        name: `${emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        value: catDisplay || "No commands",
        inline: false
      });
    });

    helpEmbed.setFooter({ text: "Use /adminhelp for admin-only commands | Visit /commands for full guide" });
    return msg.reply({ embeds: [helpEmbed] });
  }

  // Admin Help - List all admin commands
  if (msg.content === "/adminhelp") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can view admin help!");
    }

    // Organize commands by category and subsection
    const categoryMap = {};
    Object.entries(COMMANDS_META).forEach(([name, meta]) => {
      const cat = meta.category || 'misc';
      if (!categoryMap[cat]) categoryMap[cat] = {};
      const subsec = meta.subsection || 'Other';
      if (!categoryMap[cat][subsec]) categoryMap[cat][subsec] = [];
      categoryMap[cat][subsec].push(name);
    });

    const adminEmbed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle("👑 ADMIN COMMAND GUIDE")
      .setDescription("Administrator-only commands. Type `/[command]` to use!");

    // Admin-only categories (pre-filled categories)
    const adminCats = ['moderation', 'roles', 'social', 'config', 'custom', 'giveaway', 'tickets'];
    const categoryEmojis = {
      moderation: "🛡️",
      roles: "👤",
      social: "📱",
      config: "⚙️",
      custom: "✨",
      giveaway: "🎁",
      tickets: "🎫",
      economy: "💰"
    };

    // Render configured admin categories first
    adminCats.forEach(cat => {
      if (!categoryMap[cat]) return;
      const subsections = categoryMap[cat];
      const emoji = categoryEmojis[cat] || "📌";
      
      // Build subsection display
      let catDisplay = "";
      Object.keys(subsections).sort().forEach(subsec => {
        const cmds = subsections[subsec].map(c => `/${c}`).join(" • ");
        catDisplay += `**${subsec}:** ${cmds}\n`;
      });

      adminEmbed.addFields({
        name: `${emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        value: catDisplay || "No commands",
        inline: false
      });
    });

    // Collect admin-only commands (flagged via adminOnly) and display any that belong to categories not already shown above
    const adminOnlyMap = {};
    Object.entries(COMMANDS_META).forEach(([name, meta]) => {
      if (!meta || !meta.adminOnly) return;
      const cat = meta.category || 'misc';
      if (!adminOnlyMap[cat]) adminOnlyMap[cat] = {};
      const subsec = meta.subsection || 'Other';
      if (!adminOnlyMap[cat][subsec]) adminOnlyMap[cat][subsec] = [];
      adminOnlyMap[cat][subsec].push(name);
    });

    Object.keys(adminOnlyMap).sort().forEach(cat => {
      if (adminCats.includes(cat)) return; // already displayed
      const subsections = adminOnlyMap[cat];
      const emoji = categoryEmojis[cat] || "🔒";
      let catDisplay = "";
      Object.keys(subsections).sort().forEach(subsec => {
        const cmds = subsections[subsec].map(c => `/${c}`).join(" • ");
        catDisplay += `**${subsec}:** ${cmds}\n`;
      });
      adminEmbed.addFields({ name: `${emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)} (Admin-only)`, value: catDisplay || "No commands", inline: false });
    });

    adminEmbed.setFooter({ text: "✅ All changes are logged to dashboard activity & modlog channel" });

    return msg.reply({ embeds: [adminEmbed] });
  }

  // Admin command to force re-register slash commands (in case of new entries added to COMMANDS_META)
  if (msg.content === "/register-commands") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can register commands!");
    }
    const replyMsg = await msg.reply("🔁 Registering slash commands, please wait...");
    const result = await registerSlashCommands();
    if (result && result.success) {
      return replyMsg.edit(`✅ Registered ${result.count} slash commands.`).catch(() => {});
    }
    return replyMsg.edit(`❌ Registration failed: ${result && result.error ? result.error : 'unknown error'}`).catch(() => {});
  }

  // ============== CONFIG COMMANDS ==============
  if (msg.content.startsWith("/config-welcome-channel ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure the bot!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Mention a channel: /config-welcome-channel #channel");
    updateGuildConfig(msg.guild.id, { welcomeChannelId: channel.id });
    addActivity(msg.guild.id, "🎉", msg.author.username, `set welcome channel to ${channel.name}`);
    return msg.reply(`✅ Welcome channel set to ${channel}`);
  }

  if (msg.content.startsWith("/config-welcome-message ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure the bot!");
    }
    const welcomeMsg = msg.content.slice(26).trim();
    if (!welcomeMsg) return msg.reply("Provide a message: /config-welcome-message Your message here\n\n**Available placeholders:**\n`{user}` - Member mention\n`{username}` - Username\n`{displayname}` - Display name\n`{server}` - Server name\n`{membercount}` - Total member count");
    updateGuildConfig(msg.guild.id, { welcomeMessage: welcomeMsg });
    addActivity(msg.guild.id, "📝", msg.author.username, `updated welcome message`);
    return msg.reply(`✅ Welcome message updated!\n\n**Available placeholders:**\n\`{user}\` - ${msg.member.toString()}\n\`{username}\` - ${msg.author.username}\n\`{displayname}\` - ${msg.member.displayName}\n\`{server}\` - ${msg.guild.name}\n\`{membercount}\` - ${msg.guild.memberCount}`);
  }

  // Add game role
  if (msg.content.startsWith("/addgamerole ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const args = msg.content.slice(14).trim().split(" ");
    const roleName = args[0];
    const roleId = args[1];
    if (!roleName || !roleId) return msg.reply("Usage: /addgamerole [role name] [role ID]\n\nExample: /addgamerole Minecraft 123456789");
    const config = getGuildConfig(msg.guild.id);
    if (config.gameRoles.some(r => r.name === roleName)) return msg.reply("❌ Role already added!");
    config.gameRoles.push({ name: roleName, id: roleId });
    updateGuildConfig(msg.guild.id, { gameRoles: config.gameRoles });
    addActivity(msg.guild.id, "🎮", msg.author.username, `added game role: ${roleName}`);
    return msg.reply(`✅ Added game role: **${roleName}** (ID: ${roleId})`);
  }

  // Remove game role
  if (msg.content.startsWith("/removegamerole ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const roleName = msg.content.slice(16).trim();
    if (!roleName) return msg.reply("Usage: /removegamerole [role name]");
    const config = getGuildConfig(msg.guild.id);
    const index = config.gameRoles.findIndex(r => r.name === roleName);
    if (index === -1) return msg.reply("❌ Role not found!");
    config.gameRoles.splice(index, 1);
    updateGuildConfig(msg.guild.id, { gameRoles: config.gameRoles });
    addActivity(msg.guild.id, "🗑️", msg.author.username, `removed game role: ${roleName}`);
    return msg.reply(`✅ Removed game role: **${roleName}**`);
  }

  // Add watch party role
  if (msg.content.startsWith("/addwatchpartyrole ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const args = msg.content.slice(22).trim().split(" ");
    const roleName = args[0];
    const roleId = args[1];
    if (!roleName || !roleId) return msg.reply("Usage: /addwatchpartyrole [role name] [role ID]");
    const config = getGuildConfig(msg.guild.id);
    if (config.watchPartyRoles.some(r => r.name === roleName)) return msg.reply("❌ Role already added!");
    config.watchPartyRoles.push({ name: roleName, id: roleId });
    updateGuildConfig(msg.guild.id, { watchPartyRoles: config.watchPartyRoles });
    addActivity(msg.guild.id, "🎬", msg.author.username, `added watch party role: ${roleName}`);
    return msg.reply(`✅ Added watch party role: **${roleName}** (ID: ${roleId})`);
  }

  // Remove watch party role
  if (msg.content.startsWith("/removewatchpartyrole ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const roleName = msg.content.slice(22).trim();
    if (!roleName) return msg.reply("Usage: /removewatchpartyrole [role name]");
    const config = getGuildConfig(msg.guild.id);
    const index = config.watchPartyRoles.findIndex(r => r.name === roleName);
    if (index === -1) return msg.reply("❌ Role not found!");
    config.watchPartyRoles.splice(index, 1);
    updateGuildConfig(msg.guild.id, { watchPartyRoles: config.watchPartyRoles });
    addActivity(msg.guild.id, "🗑️", msg.author.username, `removed watch party role: ${roleName}`);
    return msg.reply(`✅ Removed watch party role: **${roleName}**`);
  }

  // Add platform role
  if (msg.content.startsWith("/addplatformrole ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const args = msg.content.slice(17).trim().split(" ");
    const roleName = args[0];
    const roleId = args[1];
    if (!roleName || !roleId) return msg.reply("Usage: /addplatformrole [role name] [role ID]");
    const config = getGuildConfig(msg.guild.id);
    if (config.platformRoles.some(r => r.name === roleName)) return msg.reply("❌ Role already added!");
    config.platformRoles.push({ name: roleName, id: roleId });
    updateGuildConfig(msg.guild.id, { platformRoles: config.platformRoles });
    addActivity(msg.guild.id, "💻", msg.author.username, `added platform role: ${roleName}`);
    return msg.reply(`✅ Added platform role: **${roleName}** (ID: ${roleId})`);
  }

  // Remove platform role
  if (msg.content.startsWith("/removeplatformrole ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const roleName = msg.content.slice(20).trim();
    if (!roleName) return msg.reply("Usage: /removeplatformrole [role name]");
    const config = getGuildConfig(msg.guild.id);
  // Setup category selector
  if (msg.content.startsWith("/setup-category ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set up roles!");
    }
    const categoryName = msg.content.slice(17).trim();
    if (!categoryName) return msg.reply("Usage: /setup-category [category name]");
    const categories = guildConfig.roleCategories || {};
    if (!categories[categoryName]) {
      return msg.reply(`❌ Category "${categoryName}" does not exist!`);
    }

    const catData = Array.isArray(categories[categoryName]) ? { roles: categories[categoryName], banner: null } : categories[categoryName];
    if (catData.roles.length === 0) {
      return msg.reply(`❌ Add roles with //addrole first!`);
    }

    const roleOptions = catData.roles.map(r => ({ label: `✨ ${r.name}`, value: r.id }));
    const colorMap = { gaming: 0xFF6B6B, streaming: 0x4ECDC4, platform: 0x45B7D1, community: 0x96CEB4, events: 0xFFBD39, other: 0x9B59B6 };
    const categoryLower = categoryName.toLowerCase();
    let embedColor = colorMap[categoryLower] || 0x5865F2;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🎯 ${categoryName.toUpperCase()} ROLES`)
      .setDescription(`✨ Click below to select your ${categoryName.toLowerCase()} roles!\n\n*Choose multiple roles to add yourself to communities*`)
      .setFooter({ text: "SPIDEY BOT • Select roles to join communities" });

    if (catData.banner) {
      embed.setImage(catData.banner);
    }

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`select_${categoryName}`)
        .setPlaceholder(`🔍 Select ${categoryName.toLowerCase()} roles...`)
        .setMinValues(1)
        .setMaxValues(roleOptions.length)
        .addOptions(roleOptions)
    );
    return msg.channel.send({ embeds: [embed], components: [selectMenu] });
  }
    const index = config.platformRoles.findIndex(r => r.name === roleName);
    if (index === -1) return msg.reply("❌ Role not found!");
    config.platformRoles.splice(index, 1);
    updateGuildConfig(msg.guild.id, { platformRoles: config.platformRoles });
    addActivity(msg.guild.id, "🗑️", msg.author.username, `removed platform role: ${roleName}`);
    return msg.reply(`✅ Removed platform role: **${roleName}**`);
  }

  // Setup roles
  if (msg.content === "/setup-roles") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set up roles!");
    }
    const embed = new EmbedBuilder()
      .setColor(0x00D4FF)
      .setTitle("🎮 GAMING ROLE SELECTION")
      .setDescription("✨ Choose the games you play and join gaming communities!\n\n*Click the button below to see available gaming roles*")
      .addFields(
        { name: "What's this?", value: "Get roles for your favorite games and find other players!" }
      )
      .setFooter({ text: "SPIDEY BOT • Gaming Community" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_roles")
        .setLabel("🎮 SELECT GAMING ROLES")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎯")
    );
    return msg.channel.send({ embeds: [embed], components: [button] });
  }

  if (msg.content === "/setup-watchparty") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set up roles!");
    }
    const embed = new EmbedBuilder()
      .setColor(0x4ECDC4)
      .setTitle("🎬 WATCH PARTY ROLE SELECTION")
      .setDescription("✨ Join watch parties and stream together!\n\n*Click the button below to see available watch party roles*")
      .addFields(
        { name: "What's this?", value: "Get notified about watch parties and join streams with your community!" }
      )
      .setFooter({ text: "SPIDEY BOT • Watch Party Community" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_watchparty")
        .setLabel("🎬 SELECT WATCH PARTY ROLES")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📺")
    );
    return msg.channel.send({ embeds: [embed], components: [button] });
  }

  if (msg.content === "/setup-platform") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set up roles!");
    }
    const embed = new EmbedBuilder()
      .setColor(0x45B7D1)
      .setTitle("💻 PLATFORM ROLE SELECTION")
      .setDescription("✨ Select your gaming platforms!\n\n*Click the button below to see available platform roles*")
      .addFields(
        { name: "What's this?", value: "Tell everyone what platforms you game on and find crossplay buddies!" }
      )
      .setFooter({ text: "SPIDEY BOT • Platform Community" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_platform")
        .setLabel("💻 SELECT PLATFORM ROLES")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🖥️")
    );
    return msg.channel.send({ embeds: [embed], components: [button] });
  }

  if (msg.content === "/remove-roles") {
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("🗑️ REMOVE ROLES")
      .setDescription("❌ Remove roles you no longer want!\n\n*Click the button below to manage your roles*")
      .addFields(
        { name: "What's this?", value: "Deselect roles and remove yourself from communities!" }
      )
      .setFooter({ text: "SPIDEY BOT • Role Management" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("remove_all_roles")
        .setLabel("🗑️ REMOVE ROLES")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("❌")
    );
    return msg.channel.send({ embeds: [embed], components: [button] });
  }

  // ============== MUSIC COMMANDS ==============
  if (msg.content.startsWith("/play ")) {
    const query = msg.content.slice(7).trim();
    if (!query) return msg.reply("Usage: /play [song name or YouTube link]");

    const voiceChannel = msg.member?.voice.channel;
    if (!voiceChannel) return msg.reply("❌ Join a voice channel first!");

    try {
      await msg.reply(`🎵 Searching for: ${query}`);

      const searchOptions = { requestedBy: msg.author };
      const result = await player.search(query, searchOptions);

      if (!result.tracks.length) {
        return msg.reply("❌ No results found!");
      }

      let queue = player.queues.get(msg.guild);
      if (!queue) {
        queue = player.queues.create(msg.guild, {
          metadata: { channel: msg.channel },
          selfDeaf: true
        });
      }

      if (!queue.connection) {
        await queue.connect(voiceChannel);
      }

      const track = result.tracks[0];
      queue.addTrack(track);

      if (!queue.isPlaying()) {
        await queue.node.play();
      }

      const embed = new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle("🎵 Now Playing")
        .setDescription(`[${track.title}](${track.url})`)
        .addFields(
          { name: "Duration", value: `${Math.floor(track.durationMS / 1000)}s`, inline: true },
          { name: "Source", value: track.source || "YouTube", inline: true }
        );

      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("music_previous").setLabel("⏮").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("music_pause").setLabel("⏸").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("music_resume").setLabel("▶").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("music_skip").setLabel("⏭").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("music_stop").setLabel("⏹").setStyle(ButtonStyle.Danger)
      );

      msg.reply({ embeds: [embed], components: [controls] });
    } catch (error) {
      console.error("Music play error:", error);
      msg.reply(`❌ Error: ${error.message}`);
    }
  }

  if (msg.content === "/queue") {
    const queue = player.queues.get(msg.guild);
    if (!queue || !queue.isPlaying()) {
      return msg.reply("❌ No music is playing!");
    }

    const tracks = queue.tracks.slice(0, 10);
    const queueStr = tracks.length > 0 
      ? tracks.map((t, i) => `${i + 1}. [${t.title}](${t.url})`).join("\n")
      : "Queue is empty";

    const embed = new EmbedBuilder()
      .setColor(0x00D4FF)
      .setTitle("🎵 Music Queue")
      .setDescription(queueStr);

    msg.reply({ embeds: [embed] });
  }

  // Music enhancements
  if (msg.content === "/loop") {
    const queue = player.queues.get(msg.guild);
    if (!queue || !queue.isPlaying()) {
      return msg.reply("❌ No music playing!");
    }
    const isLooping = queue.repeatMode === 2;
    queue.setRepeatMode(isLooping ? 0 : 2);
    return msg.reply(isLooping ? "🔄 Loop disabled" : "🔄 Loop enabled - queue will repeat!");
  }

  if (msg.content === "/shuffle") {
    const queue = player.queues.get(msg.guild);
    if (!queue || !queue.isPlaying()) {
      return msg.reply("❌ No music playing!");
    }
    queue.tracks.sort(() => Math.random() - 0.5);
    return msg.reply("🔀 Queue shuffled!");
  }

  if (msg.content.startsWith("/volume ")) {
    const queue = player.queues.get(msg.guild);
    if (!queue || !queue.isPlaying()) {
      return msg.reply("❌ No music playing!");
    }
    const vol = parseInt(msg.content.slice(9));
    if (isNaN(vol) || vol < 0 || vol > 200) return msg.reply("❌ Volume must be 0-200!");
    queue.node.setVolume(vol);
    return msg.reply(`🔊 Volume set to ${vol}%`);
  }

  // Moderation commands
  if (msg.content.startsWith("/kick ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return msg.reply("❌ You need kick permissions!");
    }
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: /kick @user [reason]");
    const reason = msg.content.slice(6).split(" ").slice(1).join(" ") || "No reason";
    try {
      await user.kick(reason);
      msg.reply(`✅ Kicked ${user.user.tag} - ${reason}`);
      logModAction(msg.guild, "KICK", msg.author, user.user.tag, reason);
    } catch (err) {
      msg.reply(`❌ Failed to kick: ${err.message}`);
    }
  }

  if (msg.content.startsWith("/ban ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return msg.reply("❌ You need ban permissions!");
    }
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: /ban @user [reason]");
    const reason = msg.content.slice(5).split(" ").slice(1).join(" ") || "No reason";
    try {
      await user.ban({ reason });
      msg.reply(`✅ Banned ${user.user.tag} - ${reason}`);
      logModAction(msg.guild, "BAN", msg.author, user.user.tag, reason);
    } catch (err) {
      msg.reply(`❌ Failed to ban: ${err.message}`);
    }
  }

  if (msg.content.startsWith("/warn ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return msg.reply("❌ You need moderation permissions!");
    }
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: /warn @user [reason]");
    const reason = msg.content.slice(6).split(" ").slice(1).join(" ") || "No reason";

    const warnings = guildConfig.warnings || {};
    if (!warnings[user.id]) warnings[user.id] = [];
    warnings[user.id].push({ reason, warnedBy: msg.author.tag, timestamp: new Date() });
    updateGuildConfig(msg.guild.id, { warnings });

    msg.reply(`⚠️ Warned ${user.user.tag} (${warnings[user.id].length} warnings) - ${reason}`);
    logModAction(msg.guild, "WARN", msg.author, user.user.tag, reason);
  }

  if (msg.content.startsWith("/mute ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return msg.reply("❌ You need moderation permissions!");
    }
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: /mute @user");
    try {
      await user.timeout(60 * 60 * 1000);
      msg.reply(`🔇 Muted ${user.user.tag} for 1 hour`);
      logModAction(msg.guild, "MUTE", msg.author, user.user.tag, "1 hour timeout");
    } catch (err) {
      msg.reply(`❌ Failed to mute: ${err.message}`);
    }
  }

  if (msg.content.startsWith("/unmute ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return msg.reply("❌ You need moderation permissions!");
    }
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: /unmute @user");
    try {
      await user.timeout(null);
      msg.reply(`🔊 Unmuted ${user.user.tag}`);
      logModAction(msg.guild, "UNMUTE", msg.author, user.user.tag, "Timeout removed");
    } catch (err) {
      msg.reply(`❌ Failed to unmute: ${err.message}`);
    }
  }

  if (msg.content.startsWith("/warnings ")) {
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: /warnings @user");
    const warnings = guildConfig.warnings?.[user.id] || [];
    const warningList = warnings.map((w, i) => `${i+1}. ${w.reason} (by ${w.warnedBy})`).join("\n") || "No warnings";
    msg.reply(`⚠️ ${user.user.tag} has ${warnings.length} warning(s):\n${warningList}`);
  }

  // Config commands
  if (msg.content.startsWith("/set-prefix ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set prefix!");
    }
    const prefix = msg.content.slice(13).trim();
    if (!prefix || prefix.length > 5) return msg.reply("Usage: /set-prefix [prefix] (max 5 chars)");
    updateGuildConfig(msg.guild.id, { prefix });
    return msg.reply(`✅ Prefix changed to \`${prefix}\``);
  }

  if (msg.content.startsWith("/config-modlog")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure modlog!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: /config-modlog #channel");
    updateGuildConfig(msg.guild.id, { modLogChannelId: channel.id });
    return msg.reply(`✅ Modlog channel set to ${channel}`);
  }

  // Twitch & TikTok config
  if (msg.content.startsWith("/config-twitch-channel ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: /config-twitch-channel #channel");
    updateGuildConfig(msg.guild.id, { twitchChannelId: channel.id });
    return msg.reply(`✅ Twitch live notifications will post to ${channel}\n\n💡 *Note: Configure your Twitch webhook at: https://dev.twitch.tv/console*`);
  }

  if (msg.content.startsWith("/config-tiktok-channel ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: /config-tiktok-channel #channel");
    updateGuildConfig(msg.guild.id, { tiktokChannelId: channel.id });
    return msg.reply(`✅ TikTok post notifications will post to ${channel}\n\n💡 *Note: Configure your TikTok webhook at: https://developer.tiktok.com*`);
  }

  if (msg.content.startsWith("/addtwitchuser ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const twitchUser = msg.content.slice(15).trim().toLowerCase();
    if (!twitchUser) return msg.reply("Usage: /addtwitchuser [username]\nExample: /addtwitchuser xqc");
    const users = guildConfig.twitchUsers || [];
    if (users.includes(twitchUser)) return msg.reply(`❌ **${twitchUser}** is already being monitored!`);
    users.push(twitchUser);
    updateGuildConfig(msg.guild.id, { twitchUsers: users });
    return msg.reply(`✅ Added **${twitchUser}** to Twitch monitoring! (${users.length} total)`);
  }

  if (msg.content.startsWith("/removetwitchuser ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const twitchUser = msg.content.slice(18).trim().toLowerCase();
    if (!twitchUser) return msg.reply("Usage: /removetwitchuser [username]");
    const users = guildConfig.twitchUsers || [];
    const index = users.indexOf(twitchUser);
    if (index === -1) return msg.reply(`❌ **${twitchUser}** is not being monitored!`);
    users.splice(index, 1);
    updateGuildConfig(msg.guild.id, { twitchUsers: users });
    return msg.reply(`✅ Removed **${twitchUser}** from Twitch monitoring!`);
  }

  if (msg.content === "/list-twitch-users") {
    const users = guildConfig.twitchUsers || [];
    if (users.length === 0) return msg.reply("❌ No Twitch users being monitored! Use `/addtwitchuser [username]`");
    return msg.reply(`🎮 **Twitch Users Being Monitored:**\n${users.map((u, i) => `${i+1}. ${u}`).join("\n")}`);
  }

  if (msg.content.startsWith("/addtiktokuser ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const tiktokUser = msg.content.slice(15).trim().toLowerCase();
    if (!tiktokUser) return msg.reply("Usage: /addtiktokuser [username]\nExample: /addtiktokuser charlidamelio");
    const users = guildConfig.tiktokUsers || [];
    if (users.includes(tiktokUser)) return msg.reply(`❌ **${tiktokUser}** is already being monitored!`);
    users.push(tiktokUser);
    updateGuildConfig(msg.guild.id, { tiktokUsers: users });
    return msg.reply(`✅ Added **${tiktokUser}** to TikTok monitoring! (${users.length} total)`);
  }

  if (msg.content.startsWith("/removetiktokuser ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const tiktokUser = msg.content.slice(18).trim().toLowerCase();
    if (!tiktokUser) return msg.reply("Usage: /removetiktokuser [username]");
    const users = guildConfig.tiktokUsers || [];
    const index = users.indexOf(tiktokUser);
    if (index === -1) return msg.reply(`❌ **${tiktokUser}** is not being monitored!`);
    users.splice(index, 1);
    updateGuildConfig(msg.guild.id, { tiktokUsers: users });
    return msg.reply(`✅ Removed **${tiktokUser}** from TikTok monitoring!`);
  }

  if (msg.content === "/list-tiktok-users") {
    const users = guildConfig.tiktokUsers || [];
    if (users.length === 0) return msg.reply("❌ No TikTok users being monitored! Use `/addtiktokuser [username]`");
    return msg.reply(`📱 **TikTok Users Being Monitored:**\n${users.map((u, i) => `${i+1}. ${u}`).join("\n")}`);
  }

  if (msg.content.startsWith("/config-kick-channel ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: /config-kick-channel #channel");
    updateGuildConfig(msg.guild.id, { kickChannelId: channel.id });
    return msg.reply(`✅ Kick live notifications will post to ${channel}\n\n💡 *Note: Configure your Kick webhook at: https://developers.kick.com*`);
  }

  if (msg.content.startsWith("/addkickuser ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const kickUser = msg.content.slice(13).trim().toLowerCase();
    if (!kickUser) return msg.reply("Usage: /addkickuser [username]\nExample: /addkickuser xqc");
    const users = guildConfig.kickUsers || [];
    if (users.includes(kickUser)) return msg.reply(`❌ **${kickUser}** is already being monitored!`);
    users.push(kickUser);
    updateGuildConfig(msg.guild.id, { kickUsers: users });
    return msg.reply(`✅ Added **${kickUser}** to Kick monitoring! (${users.length} total)`);
  }

  if (msg.content.startsWith("/removekickuser ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const kickUser = msg.content.slice(16).trim().toLowerCase();
    if (!kickUser) return msg.reply("Usage: /removekickuser [username]");
    const users = guildConfig.kickUsers || [];
    const index = users.indexOf(kickUser);
    if (index === -1) return msg.reply(`❌ **${kickUser}** is not being monitored!`);
    users.splice(index, 1);
    updateGuildConfig(msg.guild.id, { kickUsers: users });
    return msg.reply(`✅ Removed **${kickUser}** from Kick monitoring!`);
  }

  if (msg.content === "/list-kick-users") {
    const users = guildConfig.kickUsers || [];
    if (users.length === 0) return msg.reply("❌ No Kick users being monitored! Use `/addkickuser [username]`");
    return msg.reply(`🎮 **Kick Users Being Monitored:**\n${users.map((u, i) => `${i+1}. ${u}`).join("\n")}`);
  }

  // ============== ECONOMY COMMANDS ==============
  if (msg.content === "/balance") {
    const economy = guildConfig.economy || {};
    const balance = economy[msg.author.id] || 0;
    return msg.reply(`💰 **${msg.author.username}** has **${balance}** coins!`);
  }

  if (msg.content === "/daily") {
    const economy = guildConfig.economy || {};
    const lastDaily = economy[`${msg.author.id}_daily`] || 0;
    const now = Date.now();
    if (now - lastDaily < 86400000) {
      const timeLeft = Math.ceil((86400000 - (now - lastDaily)) / 3600000);
      return msg.reply(`⏰ You can claim daily rewards in **${timeLeft}** hours!`);
    }
    economy[msg.author.id] = (economy[msg.author.id] || 0) + 100;
    economy[`${msg.author.id}_daily`] = now;
    updateGuildConfig(msg.guild.id, { economy });
    return msg.reply(`✅ Claimed **100** coins! Total: **${economy[msg.author.id]}** 💰`);
  }

  if (msg.content === "/work") {
    const economy = guildConfig.economy || {};
    const lastWork = economy[`${msg.author.id}_work`] || 0;
    const now = Date.now();
    if (now - lastWork < 300000) {
      const timeLeft = Math.ceil((300000 - (now - lastWork)) / 60000);
      return msg.reply(`⏰ You can work again in **${timeLeft}** minute(s)!`);
    }
    const earned = Math.floor(Math.random() * 50) + 20;
    economy[msg.author.id] = (economy[msg.author.id] || 0) + earned;
    economy[`${msg.author.id}_work`] = now;
    updateGuildConfig(msg.guild.id, { economy });
    return msg.reply(`💼 You worked hard and earned **${earned}** coins! Total: **${economy[msg.author.id]}** 💰`);
  }

  if (msg.content.startsWith("/transfer ")) {
    const target = msg.mentions.members.first();
    const amountStr = msg.content.split(" ").pop();
    const amount = parseInt(amountStr);

    if (!target) return msg.reply("Usage: /transfer @user [amount]");
    if (isNaN(amount) || amount <= 0) return msg.reply("Usage: /transfer @user [amount]\nAmount must be a positive number!");
    if (target.id === msg.author.id) return msg.reply("❌ You can't transfer to yourself!");

    const economy = guildConfig.economy || {};
    const senderBalance = economy[msg.author.id] || 0;

    if (senderBalance < amount) return msg.reply(`❌ You only have **${senderBalance}** coins! Need **${amount}**`);

    economy[msg.author.id] = senderBalance - amount;
    economy[target.id] = (economy[target.id] || 0) + amount;
    updateGuildConfig(msg.guild.id, { economy });

    return msg.reply(`✅ Transferred **${amount}** coins to ${target.user.tag}!\nYour new balance: **${economy[msg.author.id]}** 💰`);
  }

  if (msg.content.startsWith("/addmoney ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can add money!");
    }
    const target = msg.mentions.members.first();
    const amountStr = msg.content.split(" ").pop();
    const amount = parseInt(amountStr);

    if (!target) return msg.reply("Usage: /addmoney @user [amount]");
    if (isNaN(amount) || amount <= 0) return msg.reply("Amount must be a positive number!");

    const economy = guildConfig.economy || {};
    economy[target.id] = (economy[target.id] || 0) + amount;
    updateGuildConfig(msg.guild.id, { economy });

    return msg.reply(`✅ Added **${amount}** coins to ${target.user.tag}!\nNew balance: **${economy[target.id]}** 💰`);
  }

  if (msg.content.startsWith("/removemoney ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can remove money!");
    }
    const target = msg.mentions.members.first();
    const amountStr = msg.content.split(" ").pop();
    const amount = parseInt(amountStr);

    if (!target) return msg.reply("Usage: /removemoney @user [amount]");
    if (isNaN(amount) || amount <= 0) return msg.reply("Amount must be a positive number!");

    const economy = guildConfig.economy || {};
    const currentBalance = economy[target.id] || 0;
    economy[target.id] = Math.max(0, currentBalance - amount);
    updateGuildConfig(msg.guild.id, { economy });

    return msg.reply(`✅ Removed **${amount}** coins from ${target.user.tag}!\nNew balance: **${economy[target.id]}** 💰`);
  }

  if (msg.content === "/leaderboard") {
    const economy = guildConfig.economy || {};
    const members = Object.entries(economy)
      .filter(([key]) => !key.includes("_"))
      .map(([userId, balance]) => ({ userId, balance }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);

    if (members.length === 0) return msg.reply("📊 No economy data yet! Use //daily or //work to start earning!");

    const leaderboard = members.map((m, i) => {
      const user = msg.guild.members.cache.get(m.userId)?.user;
      const name = user?.username || "Unknown";
      return `**${i+1}.** ${name} - **${m.balance}** 💰`;
    }).join("\n");

    return msg.reply(`🏆 **Top 10 Richest Members:**\n${leaderboard}`);
  }

  // ============== LEVELING COMMANDS ==============
  if (msg.content === "/level") {
    const levels = guildConfig.levels || {};
    const userXp = levels[msg.author.id] || 0;
    const level = Math.floor(userXp / 500) + 1;
    const xpInLevel = userXp % 500;
    const nextLevelXp = 500;

    const levelEmbed = new EmbedBuilder()
      .setColor(0x00D4FF)
      .setTitle(`📊 ${msg.author.username}'s Level`)
      .addFields(
        { name: "Level", value: `${level}`, inline: true },
        { name: "Total XP", value: `${userXp}`, inline: true },
        { name: "Progress", value: `${xpInLevel}/${nextLevelXp} XP`, inline: false }
      )
      .setThumbnail(msg.author.displayAvatarURL());

    return msg.reply({ embeds: [levelEmbed] });
  }

  if (msg.content === "/xpleaderboard") {
    const levels = guildConfig.levels || {};
    const members = Object.entries(levels)
      .filter(([key]) => !key.includes("_"))
      .map(([userId, xp]) => ({ userId, xp }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10);

    if (members.length === 0) return msg.reply("📊 No leveling data yet! Send messages to gain XP!");

    const leaderboard = members.map((m, i) => {
      const user = msg.guild.members.cache.get(m.userId)?.user;
      const name = user?.username || "Unknown";
      const level = Math.floor(m.xp / 500) + 1;
      return `**${i+1}.** ${name} - **Level ${level}** (${m.xp} XP)`;
    }).join("\n");

    return msg.reply(`🏆 **Top 10 Members by Level:**\n${leaderboard}`);
  }

  // Setup level roles (1-100)
  if (msg.content === "/setup-level-roles") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can setup level roles!");
    }

    await msg.reply("⏳ Creating 100 level roles... This may take a moment!");

    const levelRoles = {};
    let created = 0;

    const botRole = msg.guild.members.me?.roles.highest;
    const colorGradient = (level) => {
      const hue = (level / 100) * 360;
      const h = hue / 60;
      const c = 255;
      const x = c * (1 - Math.abs((h % 2) - 1));
      let r = 0, g = 0, b = 0;
      if (h >= 0 && h < 1) [r, g, b] = [c, x, 0];
      else if (h >= 1 && h < 2) [r, g, b] = [x, c, 0];
      else if (h >= 2 && h < 3) [r, g, b] = [0, c, x];
      else if (h >= 3 && h < 4) [r, g, b] = [0, x, c];
      else if (h >= 4 && h < 5) [r, g, b] = [x, 0, c];
      else [r, g, b] = [c, 0, x];
      return (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b);
    };

    for (let level = 1; level <= 100; level++) {
      try {
        const emoji = getNumberedEmoji(level);
        const roleName = `${emoji} Level ${level}`;

        const role = await msg.guild.roles.create({
          name: roleName,
          color: colorGradient(level),
          position: botRole ? botRole.position - 1 : 1
        });

        levelRoles[`level_${level}`] = role.id;
        created++;

        if (created % 20 === 0) {
          console.log(`✅ Created ${created}/100 level roles`);
        }
      } catch (err) {
        console.error(`Failed to create level ${level} role: ${err.message}`);
      }
    }

    updateGuildConfig(msg.guild.id, { levelRoles });
    return msg.reply(`✅ Created **${created}/100** level roles with gradient colors! Members will display their level badge next to their name as they level up.`);
  }

  // ============== ADMIN CONFIG COMMANDS ==============
  if (msg.content.startsWith("/config-logging ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: /config-logging #channel");
    const logTypes = msg.content.includes("--all") ? ["deletes", "edits", "joins", "leaves", "bans", "kicks"] : [];
    updateGuildConfig(msg.guild.id, { logging: { channelId: channel.id, types: logTypes } });
    return msg.reply(`✅ Logging configured for ${channel}! 📝`);
  }

  if (msg.content.startsWith("/config-xp ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    const xpPerMsg = parseInt(msg.content.split(" ")[1]) || 10;
    const levelUp = parseInt(msg.content.split(" ")[2]) || 500;
    updateGuildConfig(msg.guild.id, { xpSettings: { perMessage: xpPerMsg, perLevel: levelUp } });
    return msg.reply(`✅ XP set to **${xpPerMsg}** per message, **${levelUp}** XP per level! 📈`);
  }

  if (msg.content.startsWith("/config-leaderboard ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: /config-leaderboard #channel");
    updateGuildConfig(msg.guild.id, { leaderboardChannel: channel.id });
    return msg.reply(`✅ Leaderboard will update in ${channel}! 🏆`);
  }

  if (msg.content.startsWith("/start-giveaway ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can start giveaways!");
    const parts = msg.content.split(" | ");
    const prize = parts[0]?.slice(17).trim() || "Mystery Prize";
    const duration = parseInt(parts[1]?.split(" ")[0]) || 60;
    const winners = parseInt(parts[2]?.split(" ")[0]) || 1;

    const giveaway = { prize, duration, winners, startTime: Date.now(), endTime: Date.now() + (duration * 60000), entries: [] };
    const giveaways = guildConfig.giveaways || [];
    giveaways.push(giveaway);
    updateGuildConfig(msg.guild.id, { giveaways });

    msg.reply(`🎁 **GIVEAWAY STARTED!**\n**Prize:** ${prize}\n**Duration:** ${duration} minutes\n**Winners:** ${winners}\n\nReact with 🎉 to enter!`);
  }

  if (msg.content === "/end-giveaway") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can end giveaways!");
    const giveaways = guildConfig.giveaways || [];
    if (giveaways.length === 0) return msg.reply("❌ No active giveaway!");
    const giveaway = giveaways.pop();
    updateGuildConfig(msg.guild.id, { giveaways });
    return msg.reply(`✅ Giveaway ended! Selected ${giveaway.winners} winner(s) from ${giveaway.entries.length} entries! 🎊`);
  }

  if (msg.content.startsWith("/config-social-notifs ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: /config-social-notifs #channel");
    updateGuildConfig(msg.guild.id, { socialNotifsChannel: channel.id });
    return msg.reply(`✅ Social notifications will post to ${channel}! 📣`);
  }

  if (msg.content.startsWith("/config-subscriptions ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    const tierName = msg.content.split(" ")[1] || "Gold";
    const price = parseFloat(msg.content.split(" ")[2]) || 9.99;
    const subscriptions = guildConfig.subscriptions || {};
    subscriptions[tierName] = { price, createdAt: Date.now() };
    updateGuildConfig(msg.guild.id, { subscriptions });
    return msg.reply(`✅ Added subscription tier **${tierName}** at **$${price}/month**! 💳`);
  }

  if (msg.content.startsWith("/config-welcome-message ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    const message = msg.content.slice(26).trim();
    if (!message) return msg.reply("Usage: /config-welcome-message [message with {user}, {server}, {membercount}]");
    updateGuildConfig(msg.guild.id, { welcomeMessage: message });
    return msg.reply(`✅ Welcome message set! 👋\nPreview: ${message.replace("{user}", "Member").replace("{server}", msg.guild.name).replace("{membercount}", msg.guild.memberCount)}`);
  }

  if (msg.content.startsWith("/config-goodbye-message ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    const message = msg.content.slice(26).trim();
    updateGuildConfig(msg.guild.id, { goodbyeMessage: message });
    return msg.reply(`✅ Goodbye message set! 👋`);
  }

  if (msg.content.startsWith("/addcustomcommand ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can add commands!");
    const cmdName = msg.content.split(" ")[1];
    const cmdResponse = msg.content.split(" ").slice(2).join(" ");
    if (!cmdName || !cmdResponse) return msg.reply("Usage: /addcustomcommand [name] [response]");

    const customCmds = guildConfig.customCommands || {};
    customCmds[cmdName] = cmdResponse;
    updateGuildConfig(msg.guild.id, { customCommands: customCmds });
    return msg.reply(`✅ Custom command **//${cmdName}** added! ⌨️`);
  }

  if (msg.content.startsWith("/removecustomcommand ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can remove commands!");
    const cmdName = msg.content.slice(21).trim();
    const customCmds = guildConfig.customCommands || {};
    delete customCmds[cmdName];
    updateGuildConfig(msg.guild.id, { customCommands: customCmds });
    return msg.reply(`✅ Removed custom command **//${cmdName}**! ⌨️`);
  }

  if (msg.content === "/list-custom-commands") {
    const customCmds = guildConfig.customCommands || {};
    const list = Object.keys(customCmds).map(cmd => `\`/${cmd}\``).join(", ") || "None";
    return msg.reply(`📋 **Custom Commands:** ${list}`);
  }

  if (msg.content.startsWith("/config-react-roles ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    msg.reply(`✅ React roles configured! Use the web dashboard to manage reaction roles. 🎭`);
  }

  if (msg.content.startsWith("/config-role-categories ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    const catName = msg.content.slice(25).trim();
    if (!catName) return msg.reply("Usage: /config-role-categories [name]");
    const categories = guildConfig.roleCategories || {};
    categories[catName] = { roles: [], createdAt: Date.now() };
    updateGuildConfig(msg.guild.id, { roleCategories: categories });
    return msg.reply(`✅ Role category **${catName}** created! 📂`);
  }

  if (msg.content.startsWith("/config-server-guard ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    const antiSpam = msg.content.includes("--anti-spam");
    const raidProt = msg.content.includes("--raid-protection");
    const autoMod = msg.content.includes("--auto-mod");
    updateGuildConfig(msg.guild.id, { serverGuard: { antiSpam, raidProt, autoMod } });
    return msg.reply(`✅ Server Guard configured! 🛡️`);
  }

  if (msg.content.startsWith("/config-statistics-channels ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: /config-statistics-channels #channel");
    updateGuildConfig(msg.guild.id, { statsChannel: channel.id });
    return msg.reply(`✅ Statistics will update in ${channel}! 📉`);
  }

  if (msg.content === "/config-components") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    msg.reply(`✅ Use the web dashboard to create button menus and dropdown components! 🧩`);
  }

  if (msg.content === "/config-reminders") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    msg.reply(`✅ Use the web dashboard to set up automatic reminders and notifications! 🔔`);
  }

  if (msg.content === "/config-recordings") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    msg.reply(`✅ Voice recording settings available in web dashboard! 🎥`);
  }

  if (msg.content === "/config-invite-tracking") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    msg.reply(`✅ Invite tracking enabled! Track who invited members. 🔗`);
  }

  if (msg.content === "/config-message-counting") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can configure!");
    msg.reply(`✅ Message counting and XP per message now enabled! 📊`);
  }

  // Custom command execution
  if (msg.content.startsWith(guildConfig.prefix || "//")) {
    const cmdName = msg.content.slice((guildConfig.prefix || "//").length).split(" ")[0];
    const customCmds = guildConfig.customCommands || {};
    if (customCmds[cmdName]) {
      return msg.reply(customCmds[cmdName]);
    }
  }
});

// ============== INTERACTIONS (BUTTONS & DROPDOWNS & SLASH COMMANDS) ==============
client.on("interactionCreate", async (interaction) => {
  // Handle autocomplete interactions
  if (interaction.isAutocomplete()) {
    const { commandName, options } = interaction;
    const guildConfig = getGuildConfig(interaction.guild.id);
    
    try {
      let choices = [];
      
      // Autocomplete for remove commands
      if (commandName === 'removetwitchuser') {
        choices = guildConfig.twitchUsers || [];
      } else if (commandName === 'removetiktokuser') {
        choices = guildConfig.tiktokUsers || [];
      } else if (commandName === 'removekickuser') {
        choices = guildConfig.kickUsers || [];
      } else if (commandName === 'removecustomcommand') {
        choices = Object.keys(guildConfig.customCommands || {});
      }
      
      const filtered = choices.filter(choice => 
        choice.toLowerCase().startsWith(options.getFocused().toLowerCase())
      ).slice(0, 25);
      
      await interaction.respond(
        filtered.map(choice => ({ name: choice, value: choice }))
      );
    } catch (err) {
      console.error('Autocomplete error:', err);
    }
    return;
  }

  // Handle slash command interactions - Individual command handlers
  if (interaction.isChatInputCommand()) {
    const { commandName, options } = interaction;
    
    try {
      await interaction.deferReply();
      const guildConfig = getGuildConfig(interaction.guild.id);

      // ========== FEATURE TOGGLE CHECKS ==========
      const cmdMeta = COMMANDS_META[commandName];
      if (cmdMeta) {
        const toggleMap = {
          music: 'musicPlayer',
          economy: 'economySystem',
          moderation: 'moderationTools'
        };
        const toggleKey = toggleMap[cmdMeta.category];
        if (toggleKey && guildConfig[toggleKey] === false) {
          return interaction.editReply(`❌ **${cmdMeta.category.charAt(0).toUpperCase() + cmdMeta.category.slice(1)}** commands are disabled by the server admin.`);
        }
      }
      
      // ========== ROLE MANAGEMENT ==========
      if (commandName === 'addrole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can manage roles!");
        }
        
        const categoryName = options.getString('category');
        const roleName = options.getString('role_name');
        const roleId = options.getString('role_id');
        
        const categories = guildConfig.roleCategories || {};
        if (!categories[categoryName]) {
          return interaction.editReply(`❌ Category "${categoryName}" doesn't exist!\n\nCreate it first with: \`/create-category ${categoryName}\``);
        }
        
        const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
          return interaction.editReply(`❌ Role with ID \`${roleId}\` not found!`);
        }
        
        const catData = Array.isArray(categories[categoryName]) ? { roles: categories[categoryName] } : categories[categoryName];
        if (catData.roles.some(r => r.name === roleName)) {
          return interaction.editReply(`❌ Role "${roleName}" already in category!`);
        }
        
        catData.roles.push({ name: roleName, id: roleId });
        categories[categoryName] = catData;
        updateGuildConfig(interaction.guild.id, { roleCategories: categories });
        addActivity(interaction.guild.id, "➕", interaction.user.username, `added role: ${roleName} to ${categoryName}`);
        return interaction.editReply(`✅ Added **${roleName}** (${role}) to category **${categoryName}**`);
      }
      
      if (commandName === 'removerole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can manage roles!");
        }
        
        const categoryName = options.getString('category');
        const roleName = options.getString('role_name');
        
        const categories = guildConfig.roleCategories || {};
        if (!categories[categoryName]) {
          return interaction.editReply(`❌ Category "${categoryName}" doesn't exist!`);
        }
        
        const catData = Array.isArray(categories[categoryName]) ? { roles: categories[categoryName] } : categories[categoryName];
        const roleIndex = catData.roles.findIndex(r => r.name === roleName);
        if (roleIndex === -1) {
          return interaction.editReply(`❌ Role "${roleName}" not found in that category!`);
        }
        
        catData.roles.splice(roleIndex, 1);
        categories[categoryName] = catData;
        updateGuildConfig(interaction.guild.id, { roleCategories: categories });
        return interaction.editReply(`✅ Removed **${roleName}** from **${categoryName}**`);
      }
      
      if (commandName === 'addgamerole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can manage roles!");
        }
        
        const roleName = options.getString('role_name');
        const roleId = options.getString('role_id');
        
        const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
          return interaction.editReply(`❌ Role with ID \`${roleId}\` not found!`);
        }
        
        const categories = guildConfig.roleCategories || {};
        if (!categories.Gaming) {
          categories.Gaming = { roles: [], banner: null };
        }
        const catData = Array.isArray(categories.Gaming) ? { roles: categories.Gaming } : categories.Gaming;
        
        if (catData.roles.some(r => r.name === roleName)) {
          return interaction.editReply(`❌ Role "${roleName}" already exists!`);
        }
        
        catData.roles.push({ name: roleName, id: roleId });
        categories.Gaming = catData;
        updateGuildConfig(interaction.guild.id, { roleCategories: categories });
        return interaction.editReply(`✅ Added game role **${roleName}** (${role})`);
      }
      
      if (commandName === 'removegamerole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can manage roles!");
        }
        
        const roleName = options.getString('role_name');
        const categories = guildConfig.roleCategories || {};
        
        if (!categories.Gaming) {
          return interaction.editReply("❌ No gaming roles set up yet!");
        }
        
        const catData = Array.isArray(categories.Gaming) ? { roles: categories.Gaming } : categories.Gaming;
        const roleIndex = catData.roles.findIndex(r => r.name === roleName);
        
        if (roleIndex === -1) {
          return interaction.editReply(`❌ Role "${roleName}" not found!`);
        }
        
        catData.roles.splice(roleIndex, 1);
        categories.Gaming = catData;
        updateGuildConfig(interaction.guild.id, { roleCategories: categories });
        return interaction.editReply(`✅ Removed game role **${roleName}**`);
      }
      
      if (commandName === 'addwatchpartyrole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can manage roles!");
        }
        
        const roleName = options.getString('role_name');
        const roleId = options.getString('role_id');
        
        const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
          return interaction.editReply(`❌ Role with ID \`${roleId}\` not found!`);
        }
        
        const roles = guildConfig.watchPartyRoles || [];
        if (roles.some(r => r.name === roleName)) {
          return interaction.editReply(`❌ Watch party role "${roleName}" already exists!`);
        }
        
        roles.push({ name: roleName, id: roleId });
        updateGuildConfig(interaction.guild.id, { watchPartyRoles: roles });
        return interaction.editReply(`✅ Added watch party role **${roleName}**`);
      }
      
      if (commandName === 'removewatchpartyrole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can manage roles!");
        }
        
        const roleName = options.getString('role_name');
        const roles = guildConfig.watchPartyRoles || [];
        const roleIndex = roles.findIndex(r => r.name === roleName);
        
        if (roleIndex === -1) {
          return interaction.editReply(`❌ Watch party role "${roleName}" not found!`);
        }
        
        roles.splice(roleIndex, 1);
        updateGuildConfig(interaction.guild.id, { watchPartyRoles: roles });
        return interaction.editReply(`✅ Removed watch party role **${roleName}**`);
      }
      
      if (commandName === 'addplatformrole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can manage roles!");
        }
        
        const roleName = options.getString('role_name');
        const roleId = options.getString('role_id');
        
        const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
        if (!role) {
          return interaction.editReply(`❌ Role with ID \`${roleId}\` not found!`);
        }
        
        const roles = guildConfig.platformRoles || [];
        if (roles.some(r => r.name === roleName)) {
          return interaction.editReply(`❌ Platform role "${roleName}" already exists!`);
        }
        
        roles.push({ name: roleName, id: roleId });
        updateGuildConfig(interaction.guild.id, { platformRoles: roles });
        return interaction.editReply(`✅ Added platform role **${roleName}**`);
      }
      
      if (commandName === 'removeplatformrole') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can manage roles!");
        }
        
        const roleName = options.getString('role_name');
        const roles = guildConfig.platformRoles || [];
        const roleIndex = roles.findIndex(r => r.name === roleName);
        
        if (roleIndex === -1) {
          return interaction.editReply(`❌ Platform role "${roleName}" not found!`);
        }
        
        roles.splice(roleIndex, 1);
        updateGuildConfig(interaction.guild.id, { platformRoles: roles });
        return interaction.editReply(`✅ Removed platform role **${roleName}**`);
      }
      
      // ========== STREAMER MONITORING ==========
      if (commandName === 'addtwitchuser') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const username = options.getString('username').toLowerCase();
        const users = guildConfig.twitchUsers || [];
        
        if (users.includes(username)) {
          return interaction.editReply(`❌ **${username}** is already being monitored!`);
        }
        
        users.push(username);
        updateGuildConfig(interaction.guild.id, { twitchUsers: users });
        return interaction.editReply(`✅ Added **${username}** to Twitch monitoring! (${users.length} total)`);
      }
      
      if (commandName === 'removetwitchuser') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const username = options.getString('username').toLowerCase();
        const users = guildConfig.twitchUsers || [];
        const index = users.indexOf(username);
        
        if (index === -1) {
          return interaction.editReply(`❌ **${username}** is not being monitored!`);
        }
        
        users.splice(index, 1);
        updateGuildConfig(interaction.guild.id, { twitchUsers: users });
        return interaction.editReply(`✅ Removed **${username}** from Twitch monitoring!`);
      }
      
      if (commandName === 'addtiktokuser') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const username = options.getString('username').toLowerCase();
        const users = guildConfig.tiktokUsers || [];
        
        if (users.includes(username)) {
          return interaction.editReply(`❌ **${username}** is already being monitored!`);
        }
        
        users.push(username);
        updateGuildConfig(interaction.guild.id, { tiktokUsers: users });
        return interaction.editReply(`✅ Added **${username}** to TikTok monitoring! (${users.length} total)`);
      }
      
      if (commandName === 'removetiktokuser') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const username = options.getString('username').toLowerCase();
        const users = guildConfig.tiktokUsers || [];
        const index = users.indexOf(username);
        
        if (index === -1) {
          return interaction.editReply(`❌ **${username}** is not being monitored!`);
        }
        
        users.splice(index, 1);
        updateGuildConfig(interaction.guild.id, { tiktokUsers: users });
        return interaction.editReply(`✅ Removed **${username}** from TikTok monitoring!`);
      }
      
      if (commandName === 'addkickuser') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const username = options.getString('username').toLowerCase();
        const users = guildConfig.kickUsers || [];
        
        if (users.includes(username)) {
          return interaction.editReply(`❌ **${username}** is already being monitored!`);
        }
        
        users.push(username);
        updateGuildConfig(interaction.guild.id, { kickUsers: users });
        return interaction.editReply(`✅ Added **${username}** to Kick monitoring! (${users.length} total)`);
      }
      
      if (commandName === 'removekickuser') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const username = options.getString('username').toLowerCase();
        const users = guildConfig.kickUsers || [];
        const index = users.indexOf(username);
        
        if (index === -1) {
          return interaction.editReply(`❌ **${username}** is not being monitored!`);
        }
        
        users.splice(index, 1);
        updateGuildConfig(interaction.guild.id, { kickUsers: users });
        return interaction.editReply(`✅ Removed **${username}** from Kick monitoring!`);
      }
      
      // ========== CUSTOM COMMANDS ==========
      if (commandName === 'addcustomcommand') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const cmdName = options.getString('command_name');
        const response = options.getString('response');
        const commands = guildConfig.customCommands || {};
        
        if (commands[cmdName]) {
          return interaction.editReply(`❌ Command **${cmdName}** already exists!`);
        }
        
        commands[cmdName] = response;
        updateGuildConfig(interaction.guild.id, { customCommands: commands });
        addActivity(interaction.guild.id, "➕", interaction.user.username, `added command: /${cmdName}`);
        return interaction.editReply(`✅ Created custom command **/${cmdName}**`);
      }
      
      if (commandName === 'removecustomcommand') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const cmdName = options.getString('command_name');
        const commands = guildConfig.customCommands || {};
        
        if (!commands[cmdName]) {
          return interaction.editReply(`❌ Command **${cmdName}** doesn't exist!`);
        }
        
        delete commands[cmdName];
        updateGuildConfig(interaction.guild.id, { customCommands: commands });
        return interaction.editReply(`✅ Deleted command **/${cmdName}**`);
      }
      
      // ========== CONFIGURATION ==========
      if (commandName === 'configwelcomechannel') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const channel = options.getChannel('channel');
        updateGuildConfig(interaction.guild.id, { welcomeChannel: channel.id });
        return interaction.editReply(`✅ Set welcome channel to ${channel}`);
      }
      
      if (commandName === 'configmodlog') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const channel = options.getChannel('channel');
        updateGuildConfig(interaction.guild.id, { modLogChannel: channel.id });
        return interaction.editReply(`✅ Set mod log channel to ${channel}`);
      }
      
      if (commandName === 'configtwitchchannel') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const channel = options.getChannel('channel');
        updateGuildConfig(interaction.guild.id, { twitchChannel: channel.id });
        return interaction.editReply(`✅ Set Twitch notification channel to ${channel}`);
      }
      
      if (commandName === 'configtiktokchannel') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const channel = options.getChannel('channel');
        updateGuildConfig(interaction.guild.id, { tiktokChannel: channel.id });
        return interaction.editReply(`✅ Set TikTok notification channel to ${channel}`);
      }
      
      if (commandName === 'configkickchannel') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const channel = options.getChannel('channel');
        updateGuildConfig(interaction.guild.id, { kickChannel: channel.id });
        return interaction.editReply(`✅ Set Kick notification channel to ${channel}`);
      }
      
      // ========== ECONOMY ==========
      if (commandName === 'addmoney') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can use this command!");
        }
        
        const user = options.getUser('user');
        const amount = options.getInteger('amount');
        const economy = guildConfig.economy || {};
        
        economy[user.id] = (economy[user.id] || 0) + amount;
        updateGuildConfig(interaction.guild.id, { economy });
        return interaction.editReply(`✅ Added **${amount}** coins to ${user}! New balance: ${economy[user.id]}`);
      }
      
      // ========== SETUP ==========
      if (commandName === 'setupcategory') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can use this command!");
        }
        
        const category = options.getString('category');
        const categories = guildConfig.roleCategories || {};
        
        if (!categories[category]) {
          return interaction.editReply(`❌ Category "${category}" doesn't exist!`);
        }
        
        return interaction.editReply(`✅ Use dashboard to setup "${category}" selector!`);
      }
      
      // ========== MODERATION (ADDITIONAL) ==========
      if (commandName === 'kick') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
          return interaction.editReply("❌ You don't have permission to kick members!");
        }
        
        const user = options.getUser('user');
        const reason = options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(user.id);
        
        if (!member) {
          return interaction.editReply("❌ Member not found!");
        }
        
        if (!member.kickable) {
          return interaction.editReply("❌ I cannot kick this member! They may have higher roles than me.");
        }
        
        try {
          await member.kick(reason);
          logModAction(interaction.guild, "KICK", interaction.user, user.tag, reason);
          return interaction.editReply(`✅ Kicked **${user.username}** - ${reason}`);
        } catch (err) {
          return interaction.editReply(`❌ Failed to kick: ${err.message}`);
        }
      }
      
      if (commandName === 'ban') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
          return interaction.editReply("❌ You don't have permission to ban members!");
        }
        
        const user = options.getUser('user');
        const reason = options.getString('reason') || 'No reason provided';
        const member = interaction.guild.members.cache.get(user.id);
        
        if (member && !member.bannable) {
          return interaction.editReply("❌ I cannot ban this member! They may have higher roles than me.");
        }
        
        try {
          await interaction.guild.members.ban(user.id, { reason });
          logModAction(interaction.guild, "BAN", interaction.user, user.tag, reason);
          return interaction.editReply(`✅ Banned **${user.username}** - ${reason}`);
        } catch (err) {
          return interaction.editReply(`❌ Failed to ban: ${err.message}`);
        }
      }
      
      if (commandName === 'warn') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          return interaction.editReply("❌ You don't have permission to warn members!");
        }
        
        const user = options.getUser('user');
        const reason = options.getString('reason');
        const warnings = guildConfig.warnings || {};
        
        if (!warnings[user.id]) warnings[user.id] = [];
        warnings[user.id].push({ reason, date: new Date().toISOString(), moderator: interaction.user.tag });
        
        updateGuildConfig(interaction.guild.id, { warnings });
        return interaction.editReply(`⚠️ Warned **${user.username}** for: ${reason}\nTotal warnings: ${warnings[user.id].length}`);
      }
      
      if (commandName === 'mute') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          return interaction.editReply("❌ You don't have permission to timeout members!");
        }
        
        const user = options.getUser('user');
        const member = interaction.guild.members.cache.get(user.id);
        
        if (!member) {
          return interaction.editReply("❌ Member not found!");
        }
        
        await member.timeout(60000 * 10, 'Muted by moderator'); // 10 minutes
        return interaction.editReply(`🔇 Muted **${user.username}** for 10 minutes`);
      }
      
      if (commandName === 'unmute') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          return interaction.editReply("❌ You don't have permission to remove timeouts!");
        }
        
        const user = options.getUser('user');
        const member = interaction.guild.members.cache.get(user.id);
        
        if (!member) {
          return interaction.editReply("❌ Member not found!");
        }
        
        await member.timeout(null);
        return interaction.editReply(`🔊 Unmuted **${user.username}**`);
      }
      
      if (commandName === 'warnings') {
        const user = options.getUser('user');
        const warnings = guildConfig.warnings || {};
        const userWarnings = warnings[user.id] || [];
        
        if (userWarnings.length === 0) {
          return interaction.editReply(`✅ **${user.username}** has no warnings!`);
        }
        
        const warnList = userWarnings.map((w, i) => `${i+1}. ${w.reason} (${new Date(w.date).toLocaleDateString()})`).join('\n');
        return interaction.editReply(`⚠️ **${user.username}** has ${userWarnings.length} warning(s):\n${warnList}`);
      }
      
      // ========== ROLES - CATEGORY (ADDITIONAL) ==========
      if (commandName === 'createcategory') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can create categories!");
        }
        
        const name = options.getString('name');
        const categories = guildConfig.roleCategories || {};
        
        if (categories[name]) {
          return interaction.editReply(`❌ Category **${name}** already exists!`);
        }
        
        categories[name] = { roles: [], banner: null };
        updateGuildConfig(interaction.guild.id, { roleCategories: categories });
        return interaction.editReply(`✅ Created category **${name}**`);
      }
      
      if (commandName === 'listroles') {
        const categories = guildConfig.roleCategories || {};
        const catNames = Object.keys(categories);
        
        if (catNames.length === 0) {
          return interaction.editReply("❌ No role categories set up yet!");
        }
        
        const catList = catNames.map(name => {
          const cat = categories[name];
          const roleCount = cat.roles ? cat.roles.length : 0;
          return `• **${name}** (${roleCount} roles)`;
        }).join('\n');
        
        return interaction.editReply(`📋 **Role Categories:**\n${catList}`);
      }
      
      if (commandName === 'setcategorybanner') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can set banners!");
        }
        
        const category = options.getString('category');
        const url = options.getString('url');
        const categories = guildConfig.roleCategories || {};
        
        if (!categories[category]) {
          return interaction.editReply(`❌ Category **${category}** doesn't exist!`);
        }
        
        categories[category].banner = url;
        updateGuildConfig(interaction.guild.id, { roleCategories: categories });
        return interaction.editReply(`✅ Set banner for **${category}**`);
      }
      
      if (commandName === 'deletecategory') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can delete categories!");
        }
        
        const category = options.getString('category');
        const categories = guildConfig.roleCategories || {};
        
        if (!categories[category]) {
          return interaction.editReply(`❌ Category **${category}** doesn't exist!`);
        }
        
        delete categories[category];
        updateGuildConfig(interaction.guild.id, { roleCategories: categories });
        return interaction.editReply(`✅ Deleted category **${category}**`);
      }
      
      // ========== ROLES - SELECTORS ==========
      if (commandName === 'setuproles') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can setup selectors!");
        }
        
        updateGuildConfig(interaction.guild.id, { roleSelector: { enabled: true } });
        return interaction.editReply("✅ Gaming roles selector enabled! Users can now select roles.");
      }
      
      if (commandName === 'setupwatchparty') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can setup selectors!");
        }
        
        updateGuildConfig(interaction.guild.id, { watchpartySelector: { enabled: true } });
        return interaction.editReply("✅ Watch party selector enabled!");
      }
      
      if (commandName === 'setupplatform') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can setup selectors!");
        }
        
        updateGuildConfig(interaction.guild.id, { platformSelector: { enabled: true } });
        return interaction.editReply("✅ Platform selector enabled!");
      }
      
      if (commandName === 'removeroles') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can use this!");
        }
        
          const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🗑️ Role Removal')
            .setDescription('Click the button below to remove roles you no longer want');
        
          const removeRoleBtn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('remove_all_roles')
              .setLabel('Remove Roles')
              .setStyle(ButtonStyle.Danger)
          );
        
          try {
            await interaction.channel.send({ embeds: [embed], components: [removeRoleBtn] });
            return interaction.editReply('✅ Role removal message posted to this channel!');
          } catch (err) {
            return interaction.editReply(`❌ Failed to post: ${err.message}`);
          }
      }
      
      if (commandName === 'setuplevelroles') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can setup level roles!");
        }
        
          try {
            const levelRoles = [];
            let createdCount = 0;
          
            // Create 100 level roles
            for (let i = 1; i <= 100; i++) {
              const roleName = `Level ${i}`;
            
              // Check if role already exists
              const existingRole = interaction.guild.roles.cache.find(r => r.name === roleName);
              if (existingRole) {
                levelRoles.push({ level: i, roleId: existingRole.id });
                continue;
              }
            
              // Create new role
              const role = await interaction.guild.roles.create({
                name: roleName,
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
                position: interaction.guild.roles.highest.position - 1
              });
            
              levelRoles.push({ level: i, roleId: role.id });
              createdCount++;
            }
          
            // Save level roles to config
            updateGuildConfig(interaction.guild.id, { levelRoles });
          
            return interaction.editReply(`✅ Setup complete! Created **${createdCount}** new level roles (1-100). Total roles available: **${levelRoles.length}**`);
          } catch (err) {
            return interaction.editReply(`❌ Failed to create level roles: ${err.message}`);
          }
      }
      
      // ========== CUSTOM COMMANDS (ALIASES) ==========
      if (commandName === 'addcmd') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can add commands!");
        }
        
        const cmdName = options.getString('command_name');
        const response = options.getString('response');
        const commands = guildConfig.customCommands || {};
        
        if (commands[cmdName]) {
          return interaction.editReply(`❌ Command **${cmdName}** already exists!`);
        }
        
        commands[cmdName] = response;
        updateGuildConfig(interaction.guild.id, { customCommands: commands });
        return interaction.editReply(`✅ Created command **/${cmdName}**`);
      }
      
      if (commandName === 'delcmd') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can delete commands!");
        }
        
        const cmdName = options.getString('command_name');
        const commands = guildConfig.customCommands || {};
        
        if (!commands[cmdName]) {
          return interaction.editReply(`❌ Command **${cmdName}** doesn't exist!`);
        }
        
        delete commands[cmdName];
        updateGuildConfig(interaction.guild.id, { customCommands: commands });
        return interaction.editReply(`✅ Deleted command **/${cmdName}**`);
      }
      
      // ========== CONFIGURATION (ADDITIONAL) ==========
      if (commandName === 'configsuggestions') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const channel = options.getChannel('channel');
        updateGuildConfig(interaction.guild.id, { suggestionsChannel: channel.id });
        return interaction.editReply(`✅ Set suggestions channel to ${channel}`);
      }
      
      if (commandName === 'configleaderboard') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const channel = options.getChannel('channel');
        updateGuildConfig(interaction.guild.id, { leaderboardChannel: channel.id });
        return interaction.editReply(`✅ Set leaderboard channel to ${channel}`);
      }
      
      if (commandName === 'configwelcomemessage') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const message = options.getString('message');
        updateGuildConfig(interaction.guild.id, { welcomeMessage: message });
        return interaction.editReply(`✅ Set welcome message!`);
      }
      
      if (commandName === 'configgoodbyemessage') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure!");
        }
        
        const message = options.getString('message');
        updateGuildConfig(interaction.guild.id, { goodbyeMessage: message });
        return interaction.editReply(`✅ Set goodbye message!`);
      }
      
      // ========== ECONOMY ==========
      if (commandName === 'balance') {
        const economy = guildConfig.economy || {};
        const balance = economy[interaction.user.id] || 0;
        return interaction.editReply(`💰 Your balance: **${balance}** coins`);
      }
      
      if (commandName === 'pay') {
        const user = options.getUser('user');
        const amount = options.getInteger('amount');
        const economy = guildConfig.economy || {};
        
        const senderBalance = economy[interaction.user.id] || 0;
        
        if (senderBalance < amount) {
          return interaction.editReply(`❌ You don't have enough coins! Your balance: ${senderBalance}`);
        }
        
        economy[interaction.user.id] = senderBalance - amount;
        economy[user.id] = (economy[user.id] || 0) + amount;
        
        updateGuildConfig(interaction.guild.id, { economy });
        return interaction.editReply(`✅ Paid **${amount}** coins to ${user}!`);
      }
      
      if (commandName === 'removemoney') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can remove money!");
        }
        
        const user = options.getUser('user');
        const amount = options.getInteger('amount');
        const economy = guildConfig.economy || {};
        
        economy[user.id] = Math.max(0, (economy[user.id] || 0) - amount);
        updateGuildConfig(interaction.guild.id, { economy });
        return interaction.editReply(`✅ Removed **${amount}** coins from ${user}! New balance: ${economy[user.id]}`);
      }
      
      if (commandName === 'work') {
        const economy = guildConfig.economy || {};
        const earned = Math.floor(Math.random() * 50) + 10;
        
        economy[interaction.user.id] = (economy[interaction.user.id] || 0) + earned;
        updateGuildConfig(interaction.guild.id, { economy });
        return interaction.editReply(`💼 You worked and earned **${earned}** coins! Balance: ${economy[interaction.user.id]}`);
      }
      
      if (commandName === 'transfer') {
        const user = options.getUser('user');
        const amount = options.getInteger('amount');
        const economy = guildConfig.economy || {};
        
        const senderBalance = economy[interaction.user.id] || 0;
        
        if (senderBalance < amount) {
          return interaction.editReply(`❌ Insufficient funds! Your balance: ${senderBalance}`);
        }
        
        economy[interaction.user.id] = senderBalance - amount;
        economy[user.id] = (economy[user.id] || 0) + amount;
        
        updateGuildConfig(interaction.guild.id, { economy });
        return interaction.editReply(`✅ Transferred **${amount}** coins to ${user}!`);
      }
      
      // ========== GAMES ==========
      if (commandName === 'rps') {
        const choice = options.getString('choice');
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        
        let result = '';
        if (choice === botChoice) result = "It's a tie!";
        else if (
          (choice === 'rock' && botChoice === 'scissors') ||
          (choice === 'paper' && botChoice === 'rock') ||
          (choice === 'scissors' && botChoice === 'paper')
        ) result = 'You win!';
        else result = 'I win!';
        
        return interaction.editReply(`🎮 You chose **${choice}**, I chose **${botChoice}**. ${result}`);
      }
      
      if (commandName === '8ball') {
        const responses = ['Yes', 'No', 'Maybe', 'Definitely', 'Probably not', 'Ask again later', 'Without a doubt', 'Very doubtful'];
        const response = responses[Math.floor(Math.random() * responses.length)];
        return interaction.editReply(`🎱 ${response}`);
      }
      
      if (commandName === 'dice') {
        const roll = Math.floor(Math.random() * 6) + 1;
        return interaction.editReply(`🎲 You rolled a **${roll}**!`);
      }
      
      if (commandName === 'coin') {
        const flip = Math.random() < 0.5 ? 'Heads' : 'Tails';
        return interaction.editReply(`🪙 **${flip}**!`);
      }
      
      if (commandName === 'trivia') {
        const triviaQuestions = [
          { q: "What is the capital of France?", a: ["Paris", "paris"] },
          { q: "What is 2 + 2?", a: ["4", "four"] },
          { q: "What is the largest planet in our solar system?", a: ["Jupiter", "jupiter"] },
          { q: "What year did World War II end?", a: ["1945"] },
          { q: "What is the chemical symbol for gold?", a: ["Au", "au"] },
          { q: "Who painted the Mona Lisa?", a: ["Leonardo da Vinci", "Leonardo", "Da Vinci"] },
          { q: "What is the smallest prime number?", a: ["2", "two"] },
          { q: "What is the speed of light (in km/s)?", a: ["300000", "299792"] },
          { q: "What does HTTP stand for?", a: ["HyperText Transfer Protocol", "Hypertext Transfer Protocol"] },
          { q: "What programming language is known for its snake logo?", a: ["Python", "python"] }
        ];
        
        const randomTrivia = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
        const embed = new EmbedBuilder()
          .setColor('#004B87')
          .setTitle('🧠 Trivia Question')
          .setDescription(randomTrivia.q)
          .setFooter({ text: 'Answer in chat within 30 seconds!' });
        
        await interaction.editReply({ embeds: [embed] });
        
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });
        
        collector.on('collect', async m => {
          const userAnswer = m.content.trim();
          const isCorrect = randomTrivia.a.some(ans => ans.toLowerCase() === userAnswer.toLowerCase());
          
          if (isCorrect) {
            const economy = guildConfig.economy || {};
            const reward = 25;
            economy[interaction.user.id] = (economy[interaction.user.id] || 0) + reward;
            updateGuildConfig(interaction.guild.id, { economy });
            await m.reply(`✅ Correct! You earned **${reward}** coins! 🎉`);
          } else {
            await m.reply(`❌ Wrong! The correct answer was: **${randomTrivia.a[0]}**`);
          }
        });
        
        collector.on('end', collected => {
          if (collected.size === 0) {
            interaction.followUp(`⏰ Time's up! The correct answer was: **${randomTrivia.a[0]}**`);
          }
        });
        
        return;
      }
      
      // ========== MUSIC ==========
      if (commandName === 'play') {
        const query = options.getString('query');
        
        if (!interaction.member.voice.channel) {
          return interaction.editReply('❌ You must be in a voice channel to play music!');
        }
        
        try {
          const searchResult = await player.search(query, {
            requestedBy: interaction.user
          });
          
          if (!searchResult || !searchResult.tracks.length) {
            return interaction.editReply('❌ No results found!');
          }
          
          const queue = player.nodes.create(interaction.guild, {
            metadata: {
              channel: interaction.channel,
              client: interaction.guild.members.me,
              requestedBy: interaction.user
            },
            selfDeaf: true,
            volume: 80,
            leaveOnEmpty: true,
            leaveOnEmptyCooldown: 300000,
            leaveOnEnd: true,
            leaveOnEndCooldown: 300000
          });
          
          try {
            if (!queue.connection) await queue.connect(interaction.member.voice.channel);
          } catch {
            player.nodes.delete(interaction.guild.id);
            return interaction.editReply('❌ Could not join your voice channel!');
          }
          
          searchResult.playlist ? queue.addTrack(searchResult.tracks) : queue.addTrack(searchResult.tracks[0]);
          
          if (!queue.isPlaying()) await queue.node.play();
          
          const embed = new EmbedBuilder()
            .setColor('#004B87')
            .setTitle('🎵 Added to Queue')
            .setDescription(`**${searchResult.tracks[0].title}**\n${searchResult.tracks[0].author}`)
            .setThumbnail(searchResult.tracks[0].thumbnail)
            .addFields(
              { name: 'Duration', value: searchResult.tracks[0].duration, inline: true },
              { name: 'Position in Queue', value: `${queue.tracks.size}`, inline: true }
            );
          
          return interaction.editReply({ embeds: [embed] });
        } catch (err) {
          console.error('Play command error:', err);
          return interaction.editReply(`❌ Error playing music: ${err.message}`);
        }
      }
      
      if (commandName === 'shuffle') {
        const queue = player.nodes.get(interaction.guild);
        if (!queue || !queue.isPlaying()) {
          return interaction.editReply('❌ No music is playing!');
        }
        
        queue.tracks.shuffle();
        return interaction.editReply('🔀 Queue shuffled!');
      }
      
      if (commandName === 'queue') {
        const queue = player.nodes.get(interaction.guild);
        if (!queue || !queue.isPlaying()) {
          return interaction.editReply('📋 Music queue is empty!');
        }
        
        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.toArray().slice(0, 10);
        
        const embed = new EmbedBuilder()
          .setColor('#004B87')
          .setTitle('🎶 Music Queue')
          .setDescription(
            `**Now Playing:**\n${currentTrack.title} - ${currentTrack.author}\n\n` +
            `**Up Next:**\n` +
            (tracks.length > 0
              ? tracks.map((track, i) => `${i + 1}. ${track.title} - ${track.author}`).join('\n')
              : 'No more tracks in queue')
          )
          .setFooter({ text: `${queue.tracks.size} tracks in queue` });
        
        return interaction.editReply({ embeds: [embed] });
      }
      
      if (commandName === 'loop') {
        const queue = player.nodes.get(interaction.guild);
        if (!queue || !queue.isPlaying()) {
          return interaction.editReply('❌ No music is playing!');
        }
        
        const mode = queue.repeatMode;
        queue.setRepeatMode(mode === 0 ? 1 : 0);
        const modeText = queue.repeatMode === 0 ? 'Off' : 'Queue';
        return interaction.editReply(`🔁 Loop mode: **${modeText}**`);
      }
      
      if (commandName === 'volume') {
        const queue = player.nodes.get(interaction.guild);
        if (!queue || !queue.isPlaying()) {
          return interaction.editReply('❌ No music is playing!');
        }
        
        const level = options.getInteger('level');
        queue.node.setVolume(level);
        return interaction.editReply(`🔊 Volume set to ${level}%`);
      }
      
      if (commandName === 'back') {
        const queue = player.nodes.get(interaction.guild);
        if (!queue || !queue.isPlaying()) {
          return interaction.editReply('❌ No music is playing!');
        }
        
        await queue.history.previous();
        return interaction.editReply('⏮️ Playing previous track!');
      }
      
      if (commandName === 'pause') {
        const queue = player.nodes.get(interaction.guild);
        if (!queue || !queue.isPlaying()) {
          return interaction.editReply('❌ No music is playing!');
        }
        
        queue.node.pause();
        return interaction.editReply('⏸️ Playback paused!');
      }
      
      if (commandName === 'resume') {
        const queue = player.nodes.get(interaction.guild);
        if (!queue) {
          return interaction.editReply('❌ No music in queue!');
        }
        
        queue.node.resume();
        return interaction.editReply('▶️ Playback resumed!');
      }
      
      if (commandName === 'skip') {
        const queue = player.nodes.get(interaction.guild);
        if (!queue || !queue.isPlaying()) {
          return interaction.editReply('❌ No music is playing!');
        }
        
        const currentTrack = queue.currentTrack;
        queue.node.skip();
        return interaction.editReply(`⏭️ Skipped **${currentTrack.title}**!`);
      }
      
      if (commandName === 'stop') {
        const queue = player.nodes.get(interaction.guild);
        if (!queue || !queue.isPlaying()) {
          return interaction.editReply('❌ No music is playing!');
        }
        
        queue.delete();
        return interaction.editReply('⏹️ Stopped playback and cleared queue!');
      }
      
      // ========== TICKETS ==========
      if (commandName === 'ticketsetup') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can setup tickets!");
        }
        
        const channel = options.getChannel('channel');
        updateGuildConfig(interaction.guild.id, { ticketChannel: channel.id });
        return interaction.editReply(`✅ Ticket system setup in ${channel}!`);
      }
      
      if (commandName === 'ticket') {
        const topic = options.getString('topic');
        const ticketChannel = guildConfig.ticketChannel;
        
        if (!ticketChannel) {
          return interaction.editReply('❌ Ticket system not configured! Ask an admin to run `/ticketsetup` first.');
        }
        
        const channel = interaction.guild.channels.cache.get(ticketChannel);
        if (!channel) {
          return interaction.editReply('❌ Configured ticket channel not found!');
        }
        
        const ticketEmbed = new EmbedBuilder()
          .setColor('#004B87')
          .setTitle('🎫 New Support Ticket')
          .setDescription(`**Submitted by:** ${interaction.user}\n**Topic:** ${topic}\n**Status:** Open`)
          .setTimestamp();
        
        const closeButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket_btn')
            .setLabel('🔒 Close Ticket')
            .setStyle(ButtonStyle.Danger)
        );
        
        try {
          await channel.send({ embeds: [ticketEmbed], components: [closeButton] });
          
          const tickets = guildConfig.tickets || [];
          tickets.push({
            user: interaction.user.id,
            topic: topic,
            timestamp: new Date().toISOString(),
            status: 'open'
          });
          updateGuildConfig(interaction.guild.id, { tickets });
          
          return interaction.editReply(`✅ Ticket created successfully in ${channel}!\n**Topic:** ${topic}`);
        } catch (err) {
          return interaction.editReply(`❌ Failed to create ticket: ${err.message}`);
        }
      }
      
      if (commandName === 'closeticket') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can close tickets!");
        }
        
        const channelId = interaction.channel.id;
        const ticketChannel = guildConfig.ticketChannel;
        
        if (!ticketChannel) {
          return interaction.editReply('❌ Ticket system not configured!');
        }
        
        // Find and update ticket status
        const tickets = guildConfig.tickets || [];
        const ticketIndex = tickets.findIndex(t => t.status === 'open');
        
        if (ticketIndex !== -1) {
          tickets[ticketIndex].status = 'closed';
          tickets[ticketIndex].closedBy = interaction.user.username;
          tickets[ticketIndex].closedAt = new Date().toISOString();
          updateGuildConfig(interaction.guild.id, { tickets });
        }
        
        const embed = new EmbedBuilder()
          .setColor('#9B59B6')
          .setTitle('🔒 Ticket Closed')
          .setDescription(`This ticket has been closed by ${interaction.user}`)
          .setTimestamp();
        
        return interaction.editReply({ embeds: [embed] });
      }
      
      // ========== GIVEAWAY ==========
      if (commandName === 'giveaway' || commandName === 'startgiveaway') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can start giveaways!");
        }
        
        const prize = options.getString('prize');
        const duration = options.getInteger('duration');
        const winners = options.getInteger('winners') || 1;
        
        return interaction.editReply(`🎉 Giveaway started for **${prize}**!\nDuration: ${duration} minutes | Winners: ${winners}`);
      }
      
      // ========== UTILITY ==========
      if (commandName === 'ping') {
        const ping = client.ws.ping;
        return interaction.editReply(`🏓 Pong! Latency: ${ping}ms`);
      }
      
      if (commandName === 'help') {
        const embed = new EmbedBuilder()
          .setColor('#004B87') // Petrol Blue
          .setTitle('📚 Available Commands')
          .setDescription('Here are all the public commands you can use!')
          .addFields(
            {
              name: '💰 Economy',
              value: '`/balance` - Check your current balance!\n`/pay` - Send money to another user!\n`/work` - Work to earn some money!\n`/transfer` - Transfer money between users!',
              inline: false
            },
            {
              name: '🎮 Games',
              value: '`/rps` - Play rock paper scissors!\n`/8ball` - Ask the magic 8ball a question!\n`/dice` - Roll a dice!\n`/coin` - Flip a coin!\n`/trivia` - Test your knowledge with trivia!',
              inline: false
            },
            {
              name: '🎵 Music',
              value: '`/play` - Play a song in voice channel!\n`/shuffle` - Shuffle the queue!\n`/queue` - View the current music queue!\n`/loop` - Toggle loop mode!\n`/volume` - Adjust the volume!\n`/pause` - Pause the current song!\n`/resume` - Resume the paused song!\n`/skip` - Skip to the next song!\n`/stop` - Stop playback and clear queue!',
              inline: false
            },
            {
              name: '🎫 Tickets',
              value: '`/ticket` - Create a support ticket!',
              inline: true
            },
            {
              name: '🎁 Giveaways',
              value: '`/giveaway` - View active giveaways!',
              inline: true
            },
            {
              name: '🔧 Utility',
              value: '`/ping` - Check bot latency!\n`/suggest` - Submit a suggestion!',
              inline: false
            }
          )
          .setFooter({ text: 'Type /adminhelp for admin commands!' });
        
        const dismissBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('dismiss_help_btn')
            .setLabel('🗑️ Dismiss')
            .setStyle(ButtonStyle.Danger)
        );
        
        return interaction.editReply({ embeds: [embed], components: [dismissBtn] });
      }
      
      if (commandName === 'adminhelp') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can view admin commands!");
        }
        
        const embed = new EmbedBuilder()
          .setColor('#9B59B6') // Purple
          .setTitle('🔐 Admin Commands')
          .setDescription('Admin-only commands for server management')
          .addFields(
            {
              name: '🛡️ Moderation',
              value: '`/kick` - Kick a member from the server!\n`/ban` - Ban a member from the server!\n`/warn` - Warn a member!\n`/mute` - Mute a member!\n`/unmute` - Unmute a member!\n`/warnings` - View warnings for a member!',
              inline: false
            },
            {
              name: '👤 Roles - Category',
              value: '`/createcategory` - Create a new role category!\n`/listroles` - List all roles in a category!\n`/addrole` - Add a role to a category!\n`/removerole` - Remove a role from a category!\n`/setcategorybanner` - Set a banner for a role category!\n`/setupcategory` - Setup a role category!\n`/deletecategory` - Delete a category!',
              inline: false
            },
            {
              name: '👤 Roles - Gaming',
              value: '`/addgamerole` - Add a game role!\n`/removegamerole` - Remove a game role!\n`/addwatchpartyrole` - Add a watch party role!\n`/removewatchpartyrole` - Remove a watch party role!\n`/addplatformrole` - Add a platform role!\n`/removeplatformrole` - Remove a platform role!',
              inline: false
            },
            {
              name: '👤 Roles - Setup',
              value: '`/setuproles` - Post gaming roles selector with buttons!\n`/setupwatchparty` - Post watch party role selector!\n`/setupplatform` - Post platform selector!\n`/removeroles` - Post role removal message!\n`/setuplevelroles` - Auto-create level roles!',
              inline: false
            },
            {
              name: '📺 Streamers',
              value: '`/addtwitchuser` - Add a Twitch streamer to track!\n`/removetwitchuser` - Remove a Twitch streamer!\n`/addtiktokuser` - Add a TikTok streamer to track!\n`/removetiktokuser` - Remove a TikTok streamer!\n`/addkickuser` - Add a Kick streamer to track!\n`/removekickuser` - Remove a Kick streamer!',
              inline: false
            },
            {
              name: '🤖 Custom Commands',
              value: '`/addcustomcommand` - Add a custom command!\n`/removecustomcommand` - Remove a custom command!\n`/addcmd` - Add a custom command (alias)!\n`/delcmd` - Delete a custom command (alias)!',
              inline: false
            },
            {
              name: '⚙️ Configuration',
              value: '`/configwelcomechannel` - Set welcome channel!\n`/configmodlog` - Set moderation log channel!\n`/configtwitchchannel` - Set Twitch notifications channel!\n`/configtiktokchannel` - Set TikTok notifications channel!\n`/configkickchannel` - Set Kick notifications channel!\n`/configsuggestions` - Set suggestions channel!\n`/configleaderboard` - Set leaderboard channel!\n`/configwelcomemessage` - Set custom welcome message!\n`/configgoodbyemessage` - Set custom goodbye message!',
              inline: false
            },
            {
              name: '💰 Economy Admin',
              value: '`/addmoney` - Add money to a user\'s balance!\n`/removemoney` - Remove money from a user\'s balance!',
              inline: false
            },
            {
              name: '🎫 Tickets Admin',
              value: '`/ticketsetup` - Setup the ticket system!\n`/closeticket` - Close a support ticket!',
              inline: false
            },
            {
              name: '🎁 Giveaways Admin',
              value: '`/startgiveaway` - Start a new giveaway!',
              inline: false
            },
            {
              name: '🔒 Filters',
              value: '`/filtertoggle` - Toggle content filters!\n`/linkfilter` - Configure link filtering!\n`/setprefix` - Set custom command prefix!',
              inline: false
            }
          )
          .setFooter({ text: 'Use these commands to manage your server!' });
        
        const dismissBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('dismiss_adminhelp_btn')
            .setLabel('🗑️ Dismiss')
            .setStyle(ButtonStyle.Danger)
        );
        
        return interaction.editReply({ embeds: [embed], components: [dismissBtn] });
      }
      
      if (commandName === 'suggest') {
        const suggestion = options.getString('suggestion');
        const suggestions = guildConfig.suggestions || [];
        
        suggestions.push({
          author: interaction.user.username,
          text: suggestion,
          date: new Date().toISOString(),
          votes: 0
        });
        
        updateGuildConfig(interaction.guild.id, { suggestions });
        return interaction.editReply(`💡 Suggestion submitted by **${interaction.user.username}**!`);
      }
      
      // ========== FILTERS ==========
      if (commandName === 'filtertoggle') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can toggle filters!");
        }
        
        const filterEnabled = guildConfig.profanityFilter || false;
        updateGuildConfig(interaction.guild.id, { profanityFilter: !filterEnabled });
        return interaction.editReply(`🛡️ Profanity filter ${!filterEnabled ? 'enabled' : 'disabled'}!`);
      }
      
      if (commandName === 'linkfilter') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can configure filters!");
        }
        
        const state = options.getString('state');
        updateGuildConfig(interaction.guild.id, { linkFilter: state === 'on' });
        return interaction.editReply(`🔗 Link filter ${state === 'on' ? 'enabled' : 'disabled'}!`);
      }
      
      if (commandName === 'setprefix') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
          return interaction.editReply("❌ Only admins can set prefix!");
        }
        
        const prefix = options.getString('prefix');
        updateGuildConfig(interaction.guild.id, { prefix });
        return interaction.editReply(`✅ Command prefix set to **${prefix}**`);
      }
      
      return interaction.editReply("❌ Unknown slash command!");
      
    } catch (err) {
      console.error(`Slash command error for /${commandName}:`, err);
      return interaction.editReply(`❌ Error: ${err.message}`);
    }
  }

  // Helper function to create fake message object
  const guildConfig = getGuildConfig(interaction.guild.id);
  autoMigrateRoles(interaction.guild.id, interaction.guild, guildConfig);

  // Gaming roles
  if (interaction.isButton() && interaction.customId === "claim_roles") {
    const allRoles = Array.from(interaction.guild.roles.cache.values())
      .filter(r => !r.managed && r.name !== "@everyone")
      .sort((a, b) => b.position - a.position)
      .slice(0, 25)
      .map(r => ({ label: r.name, value: r.id }));
    console.log(`DEBUG: claim_roles - found ${allRoles.length} roles in guild ${interaction.guild.id}`);
    if (allRoles.length === 0) {
      return interaction.reply({ content: "❌ No roles available!", ephemeral: true });
    }

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("game_roles")
        .setPlaceholder("Select games...")
        .setMinValues(1)
        .setMaxValues(Math.min(allRoles.length, 25))
        .addOptions(allRoles)
    );
    return interaction.reply({ content: "Select gaming roles:", components: [selectMenu], ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "game_roles") {
    const member = interaction.member;
    const addedRoles = [];
    const failedRoles = [];

    for (const roleId of interaction.values) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (role) {
        try {
          await member.roles.add(role);
          addedRoles.push(role.name);
        } catch (error) {
          failedRoles.push(role.name);
          console.error(`Failed to add role ${roleId}: ${error.message}`);
        }
      }
    }

    if (addedRoles.length > 0) {
      addActivity(interaction.guild.id, "👤", member.user.username, `claimed gaming roles: ${addedRoles.join(", ")}`);
    }

    let response = addedRoles.length > 0 ? `✅ Added: ${addedRoles.join(", ")}` : "";
    if (failedRoles.length > 0) response += `\n⚠️ Failed: ${failedRoles.join(", ")}`;

    return interaction.update({ content: response || "No roles added.", components: [] });
  }

  // Watch party roles
  if (interaction.isButton() && interaction.customId === "claim_watchparty") {
    const allRoles = Array.from(interaction.guild.roles.cache.values())
      .filter(r => !r.managed && r.name !== "@everyone")
      .sort((a, b) => b.position - a.position)
      .slice(0, 25)
      .map(r => ({ label: r.name, value: r.id }));
    console.log(`DEBUG: claim_watchparty - found ${allRoles.length} roles in guild ${interaction.guild.id}`);
    if (allRoles.length === 0) {
      return interaction.reply({ content: "❌ No roles available!", ephemeral: true });
    }

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("watchparty_roles")
        .setPlaceholder("Select watch parties...")
        .setMinValues(1)
        .setMaxValues(Math.min(allRoles.length, 25))
        .addOptions(allRoles)
    );
    return interaction.reply({ content: "Select watch party roles:", components: [selectMenu], ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "watchparty_roles") {
    const member = interaction.member;
    const addedRoles = [];
    const failedRoles = [];

    for (const roleId of interaction.values) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (role) {
        try {
          await member.roles.add(role);
          addedRoles.push(role.name);
        } catch (error) {
          failedRoles.push(role.name);
          console.error(`Failed to add role ${roleId}: ${error.message}`);
        }
      }
    }

    if (addedRoles.length > 0) {
      addActivity(interaction.guild.id, "🎬", member.user.username, `claimed watch party roles: ${addedRoles.join(", ")}`);
    }

    let response = addedRoles.length > 0 ? `✅ Added: ${addedRoles.join(", ")}` : "";
    if (failedRoles.length > 0) response += `\n⚠️ Failed: ${failedRoles.join(", ")}`;

    return interaction.update({ content: response || "No roles added.", components: [] });
  }

  // Handle custom category role selections (from `select_<category>` menus)
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("select_")) {
    const categoryName = interaction.customId.slice(7);
    const member = interaction.member;
    const config = getGuildConfig(interaction.guild.id);
    const addedRoles = [];
    const failedRoles = [];
    for (const roleId of interaction.values) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (role) {
        try {
          await member.roles.add(role);
          const roleData = config.roleCategories?.[categoryName]?.find(r => (r.id || r) === roleId);
          addedRoles.push(roleData ? (roleData.name || roleData) : role.name);
        } catch (error) {
          failedRoles.push(roleId);
          console.error(`Failed to add role ${roleId}: ${error.message}`);
        }
      }
    }
    let response = addedRoles.length > 0 ? `✅ Added: ${addedRoles.join(", ")}` : "";
    if (failedRoles.length > 0) response += `\n⚠️ Failed: ${failedRoles.length} roles`;
    return interaction.update({ content: response || "No roles added.", components: [] });
  }

  // Platform roles
  if (interaction.isButton() && interaction.customId === "claim_platform") {
    const config = getGuildConfig(interaction.guild.id);
    console.log(`DEBUG: claim_platform - platformRoles length: ${Array.isArray(config.platformRoles) ? config.platformRoles.length : 0} for guild ${interaction.guild.id}`);
    if (config.platformRoles.length === 0) {
      return interaction.reply({ content: "❌ No platform roles configured! Admin: use //addplatformrole [name] [roleID]", ephemeral: true });
    }
    const platformRoles = config.platformRoles.map(r => ({ label: typeof r === 'string' ? r : r.name, value: typeof r === 'string' ? r : r.id }));
    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("platform_roles")
        .setPlaceholder("Select platform...")
        .setMinValues(1)
        .setMaxValues(platformRoles.length)
        .addOptions(platformRoles)
    );
    return interaction.reply({ content: "Select your platform:", components: [selectMenu], ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "platform_roles") {
    const member = interaction.member;
    const config = getGuildConfig(interaction.guild.id);
    const addedRoles = [];

    for (const roleValue of interaction.values) {
      const roleData = config.platformRoles.find(r => (typeof r === 'string' ? r : r.id) === roleValue);
      const role = interaction.guild.roles.cache.get(roleValue);
      if (role) {
        try {
          await member.roles.add(role);
          addedRoles.push(typeof roleData === 'string' ? roleData : roleData.name);
        } catch (error) {
          console.error(`Failed to add role ${roleValue}: ${error.message}`);
        }
      }
    }

    return interaction.update({ content: `✅ Added: ${addedRoles.join(", ")}`, components: [] });
  }

  // Remove roles
  if (interaction.isButton() && interaction.customId === "remove_all_roles") {
    const config = getGuildConfig(interaction.guild.id);
    const allRoles = config.gameRoles.concat(config.watchPartyRoles, config.platformRoles).map(r => ({ label: typeof r === 'string' ? r : r.name, value: typeof r === 'string' ? r : r.id }));
    if (allRoles.length === 0) {
      return interaction.reply({ content: "❌ No roles configured yet!", ephemeral: true });
    }
    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("remove_all_roles_select")
        .setPlaceholder("Select roles to remove...")
        .setMinValues(1)
        .setMaxValues(allRoles.length)
        .addOptions(allRoles)
    );
    return interaction.reply({ content: "Select roles to remove:", components: [selectMenu], ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "remove_all_roles_select") {
    const member = interaction.member;
    const config = getGuildConfig(interaction.guild.id);
    const removedRoles = [];

    for (const roleValue of interaction.values) {
      const role = interaction.guild.roles.cache.get(roleValue);
      const roleData = config.gameRoles.concat(config.watchPartyRoles, config.platformRoles).find(r => (typeof r === 'string' ? r : r.id) === roleValue);
      if (role && member.roles.cache.has(role.id)) {
        try {
          await member.roles.remove(role);
          removedRoles.push(typeof roleData === 'string' ? roleData : roleData.name);
        } catch (error) {
          console.error(`Failed to remove role ${roleValue}: ${error.message}`);
        }
      }
    }

    if (removedRoles.length > 0) {
      addActivity(interaction.guild.id, "🗑️", member.user.username, `removed roles: ${removedRoles.join(", ")}`);
    }

    return interaction.update({ content: `✅ Removed: ${removedRoles.join(", ")}`, components: [] });
  }

  // Close ticket button
  if (interaction.isButton() && interaction.customId === "close_ticket_btn") {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ Only admins can close tickets!", ephemeral: true });
    }
    
    const message = interaction.message;
    const embed = message.embeds[0];
    
    if (embed) {
      const closedEmbed = EmbedBuilder.from(embed)
        .setColor('#ED4245')
        .setDescription(embed.description.replace('**Status:** Open', '**Status:** Closed'))
        .setFooter({ text: `Closed by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
      
      await interaction.update({ embeds: [closedEmbed], components: [] });
      await interaction.followUp({ content: `🔒 Ticket closed by ${interaction.user}`, ephemeral: false });
    } else {
      await interaction.reply({ content: "❌ Could not close ticket - embed not found!", ephemeral: true });
    }
    
    return;
  }

  // Dismiss buttons for help embeds
  if (interaction.isButton() && interaction.customId === "dismiss_help_btn") {
    await interaction.message.delete().catch(() => {});
    return;
  }

  if (interaction.isButton() && interaction.customId === "dismiss_adminhelp_btn") {
    await interaction.message.delete().catch(() => {});
    return;
  }

  // Music controls
  if (interaction.isButton() && interaction.customId.startsWith("music_")) {
    const queue = player.queues.get(interaction.guild);
    if (!queue || !queue.isPlaying()) {
      return interaction.reply({ content: "❌ No music playing!", ephemeral: true });
    }

    switch (interaction.customId) {
      case "music_pause":
        queue.node.pause();
        return interaction.reply({ content: "⏸ Music paused", ephemeral: true });
      case "music_resume":
        queue.node.resume();
        return interaction.reply({ content: "▶ Music resumed", ephemeral: true });
      case "music_skip":
        queue.node.skip();
        return interaction.reply({ content: "⏭ Skipped to next track", ephemeral: true });
      case "music_previous":
        queue.history.back();
        return interaction.reply({ content: "⏮ Previous track", ephemeral: true });
      case "music_stop":
        queue.delete();
        return interaction.reply({ content: "⏹ Music stopped", ephemeral: true });
    }
  }
});

// ============== WEB SERVER FOR UPTIME & WEBHOOKS ==============

// Admin authentication middleware
function verifyAdmin(req, res, next) {
  const adminToken = process.env.ADMIN_TOKEN || "spidey123";
  const token = req.query.token || req.headers["x-admin-token"];
  if (token !== adminToken) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
}

// Get invite link
const botInviteURL = `https://discord.com/oauth2/authorize?client_id=${process.env.CLIENT_ID || "1234567890"}&scope=bot&permissions=8`;

// ============== HOMEPAGE ==============
app.get("/", (req, res) => {
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPIDEY BOT - Complete Discord Bot</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0f0f0f;
      color: #fff;
      line-height: 1.6;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
    }
    .logo {
      font-weight: 700;
      font-size: 1.4rem;
      background: linear-gradient(135deg, #9146FF 0%, #FF1493 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 1px;
    }
    nav {
      background: rgba(20, 20, 20, 0.95);
      border-bottom: 1px solid #222;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    }
    nav a {
      color: #999;
      text-decoration: none;
      margin: 0 1.5rem;
      transition: color 0.3s;
      font-weight: 500;
    }
    nav a:hover { color: #9146FF; }
    .hero {
      background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
      padding: 6rem 2rem;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 20% 50%, rgba(145, 70, 255, 0.15) 0%, transparent 50%);
    }
    .hero > * { position: relative; z-index: 2; }
    .hero h1 {
      font-size: 3.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, #fff 0%, #9146FF 50%, #FF1493 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hero p {
      font-size: 1.25rem;
      color: #ccc;
      margin-bottom: 2rem;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }
    .btn-group { margin: 2rem 0; }
    .btn {
      display: inline-block;
      padding: 0.9rem 2rem;
      margin: 0.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s;
      border: 2px solid transparent;
      cursor: pointer;
    }
    .btn-primary {
      background: #9146FF;
      color: #fff;
    }
    .btn-primary:hover {
      background: #7a35cc;
      transform: translateY(-2px);
    }
    .btn-secondary {
      background: transparent;
      color: #9146FF;
      border-color: #9146FF;
    }
    .btn-secondary:hover {
      background: #9146FF;
      color: #fff;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    footer {
      background: #000;
      border-top: 1px solid #222;
      padding: 3rem 2rem;
      margin-top: 4rem;
    }
    footer .footer-content {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }
    footer .footer-section h3 {
      color: #9146FF;
      font-size: 0.9rem;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    footer .footer-section ul {
      list-style: none;
    }
    footer .footer-section ul li {
      margin-bottom: 0.75rem;
    }
    footer .footer-section a {
      color: #999;
      text-decoration: none;
      font-size: 0.9rem;
      transition: color 0.3s;
    }
    footer .footer-section a:hover {
      color: #9146FF;
    }
    footer .footer-bottom {
      text-align: center;
      color: #666;
      font-size: 0.85rem;
      padding-top: 2rem;
      border-top: 1px solid #222;
      max-width: 1200px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <nav>
    <div class="logo">SPIDEY BOT</div>
    <div>
      <a href="/">Home</a>
      <a href="/commands">Features</a>
      <a href="/login" class="btn btn-primary" style="padding: 0.6rem 1.5rem; margin: 0;">Admin</a>
    </div>
  </nav>

  <main>
  <div class="hero">
    <h1>Meet SPIDEY BOT – Your Server's Ultimate Tech Guardian</h1>
    <p>SPIDEY BOT blends powerful intelligence with mystical powers to bring order, fun, and automation to your Discord server. Music, moderation, economy, leveling, and 40+ commands to manage and entertain your community.</p>
    <div class="btn-group">
      <a id="addToDiscord" class="btn btn-primary">Invite To Guild →</a>
      <a href="/commands" class="btn btn-secondary">Documentation →</a>
    </div>
  </div>

  <div class="container">
    <h2 style="margin-top: 4rem; margin-bottom: 3rem; font-size: 2.2rem; text-align: center; color: #fff;">✨ Core Features</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; margin-bottom: 4rem;">
      <div style="background: linear-gradient(135deg, rgba(145, 70, 255, 0.15) 0%, rgba(145, 70, 255, 0.05) 100%); padding: 2rem; border-radius: 12px; border: 1px solid rgba(145, 70, 255, 0.2); display: flex; gap: 1rem;">
        <div style="font-size: 2rem;">✓</div>
        <div>
          <h3 style="color: #9146FF; margin-bottom: 0.5rem;">🎵 Music Playback</h3>
          <p style="color: #aaa; font-size: 0.9rem;">Plays high-quality music in voice channels from YouTube with queue management, looping, and shuffle</p>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, rgba(145, 70, 255, 0.15) 0%, rgba(145, 70, 255, 0.05) 100%); padding: 2rem; border-radius: 12px; border: 1px solid rgba(145, 70, 255, 0.2); display: flex; gap: 1rem;">
        <div style="font-size: 2rem;">✓</div>
        <div>
          <h3 style="color: #9146FF; margin-bottom: 0.5rem;">🛡️ Auto Moderation</h3>
          <p style="color: #aaa; font-size: 0.9rem;">Detects and removes spam, bad words, and raids automatically with intelligent filtering</p>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, rgba(145, 70, 255, 0.15) 0%, rgba(145, 70, 255, 0.05) 100%); padding: 2rem; border-radius: 12px; border: 1px solid rgba(145, 70, 255, 0.2); display: flex; gap: 1rem;">
        <div style="font-size: 2rem;">✓</div>
        <div>
          <h3 style="color: #9146FF; margin-bottom: 0.5rem;">👋 Welcome Messages</h3>
          <p style="color: #aaa; font-size: 0.9rem;">Greets new members with customizable messages and automatically assigns welcome roles</p>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, rgba(145, 70, 255, 0.15) 0%, rgba(145, 70, 255, 0.05) 100%); padding: 2rem; border-radius: 12px; border: 1px solid rgba(145, 70, 255, 0.2); display: flex; gap: 1rem;">
        <div style="font-size: 2rem;">✓</div>
        <div>
          <h3 style="color: #9146FF; margin-bottom: 0.5rem;">🎭 Reaction Roles</h3>
          <p style="color: #aaa; font-size: 0.9rem;">Assigns roles to users when they click reaction emojis on messages</p>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, rgba(145, 70, 255, 0.15) 0%, rgba(145, 70, 255, 0.05) 100%); padding: 2rem; border-radius: 12px; border: 1px solid rgba(145, 70, 255, 0.2); display: flex; gap: 1rem;">
        <div style="font-size: 2rem;">✓</div>
        <div>
          <h3 style="color: #9146FF; margin-bottom: 0.5rem;">📈 Leveling System</h3>
          <p style="color: #aaa; font-size: 0.9rem;">Tracks user activity and rewards XP with level-based roles and emoji badges</p>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, rgba(145, 70, 255, 0.15) 0%, rgba(145, 70, 255, 0.05) 100%); padding: 2rem; border-radius: 12px; border: 1px solid rgba(145, 70, 255, 0.2); display: flex; gap: 1rem;">
        <div style="font-size: 2rem;">✓</div>
        <div>
          <h3 style="color: #9146FF; margin-bottom: 0.5rem;">🎫 Ticket Support</h3>
          <p style="color: #aaa; font-size: 0.9rem;">Creates private support channels for members to ask questions and get help</p>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, rgba(145, 70, 255, 0.15) 0%, rgba(145, 70, 255, 0.05) 100%); padding: 2rem; border-radius: 12px; border: 1px solid rgba(145, 70, 255, 0.2); display: flex; gap: 1rem;">
        <div style="font-size: 2rem;">✓</div>
        <div>
          <h3 style="color: #9146FF; margin-bottom: 0.5rem;">📝 Logging System</h3>
          <p style="color: #aaa; font-size: 0.9rem;">Logs server events like joins, bans, edits, and deletes for audit trails</p>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, rgba(145, 70, 255, 0.15) 0%, rgba(145, 70, 255, 0.05) 100%); padding: 2rem; border-radius: 12px; border: 1px solid rgba(145, 70, 255, 0.2); display: flex; gap: 1rem;">
        <div style="font-size: 2rem;">✓</div>
        <div>
          <h3 style="color: #9146FF; margin-bottom: 0.5rem;">💰 Economy System</h3>
          <p style="color: #aaa; font-size: 0.9rem;">Daily rewards, work commands, transfers, and leaderboards for competitive fun</p>
        </div>
      </div>
    </div>

    <!-- And So Much More Section -->
    <div style="background: linear-gradient(135deg, rgba(145, 70, 255, 0.2) 0%, rgba(145, 70, 255, 0.1) 100%); border: 2px solid rgba(145, 70, 255, 0.3); border-radius: 15px; padding: 3rem; text-align: center; margin-bottom: 4rem;">
      <h2 style="color: #fff; margin-bottom: 1.5rem; font-size: 2rem;">💎 And So Much More! 💎</h2>
      <p style="color: #ccc; margin-bottom: 1.5rem; font-size: 1rem; max-width: 600px; margin-left: auto; margin-right: auto;">From seamless integrations to advanced settings, we've got everything you need and more! Need help or have questions? Join our community Discord and connect with us!</p>
      <a href="https://discord.com/invite/spideybot" target="_blank" class="btn btn-primary">Join Our Discord →</a>
    </div>

    <!-- Support Section -->
    <div style="background: linear-gradient(135deg, rgba(145, 70, 255, 0.15) 0%, rgba(145, 70, 255, 0.05) 100%); border: 2px solid rgba(145, 70, 255, 0.3); border-radius: 15px; padding: 3rem 2rem; text-align: center; margin-bottom: 4rem;">
      <h2 style="color: #fff; margin-bottom: 1rem; font-size: 2rem;">🚀 We Are Here For You!</h2>
      <p style="color: #ccc; margin-bottom: 2rem; max-width: 700px; margin-left: auto; margin-right: auto;">Whether you're just getting started or managing a massive community, we're here to offer real support and powerful features that scale with you. Need a hand? Reach out through our support hub or connect with others in our Discord server anytime!</p>
      <a href="/login" class="btn btn-primary">Access Dashboard →</a>
    </div>
  </div>
  <footer>
    <div class="footer-content">
      <div class="footer-section">
        <h3>Quick Links</h3>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/commands">Features</a></li>
          <li><a href="/login">Admin</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h3>Legal</h3>
        <ul>
          <li><a href="/terms">Terms of Service</a></li>
          <li><a href="/privacy">Privacy Policy</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h3>Community</h3>
        <ul>
          <li><a href="#" onclick="return false;">Discord Server</a></li>
          <li><a href="#" onclick="return false;">Twitter</a></li>
          <li><a href="#" onclick="return false;">GitHub</a></li>
        </ul>
      </div>
      <div class="footer-section">
        <h3>About</h3>
        <ul>
          <li style="color: #999; font-size: 0.9rem;">SPIDEY BOT is a feature-rich Discord bot with music, moderation, economy, and 40+ commands.</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 SPIDEY BOT - All rights reserved</p>
    </div>
  </footer>
  <script>
    document.getElementById('addToDiscord').addEventListener('click', function() {
      window.location.href = 'https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&scope=bot&permissions=8';
    });
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(indexHtml);
});

// ============== DISCORD OAUTH LOGIN ==============
// Route /dashboard to dashboard.html
app.get("/dashboard", (req, res) => {
  res.redirect("/dashboard.html");
});

// Redirect login page to Discord OAuth
app.get("/login", (req, res) => {
  if (req.session.authenticated) return res.redirect("/dashboard.html");
  const loginHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPIDEY BOT Admin Login</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #000000;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .login-container {
      text-align: center;
      padding: 3rem;
      background: rgba(145, 70, 255, 0.1);
      border: 2px solid rgba(145, 70, 255, 0.3);
      border-radius: 15px;
      max-width: 400px;
    }
    h1 {
      margin-bottom: 1rem;
      font-size: 2rem;
      background: linear-gradient(135deg, #fff 0%, #9146FF 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    p {
      color: #aaa;
      margin-bottom: 2rem;
      font-size: 1rem;
    }
    .btn-discord {
      display: inline-block;
      padding: 1rem 2rem;
      background: #5865F2;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 1.1rem;
      transition: all 0.3s;
      border: none;
      cursor: pointer;
    }
    .btn-discord:hover {
      background: #4752C4;
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(88, 101, 242, 0.3);
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>SPIDEY BOT</h1>
    <p>Admin Dashboard - Login with Discord</p>
    <a href="/auth/discord" class="btn-discord">Login with Discord</a>
  </div>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(loginHtml);
});

// ============== STATIC PAGES ==============
app.get("/terms", (req, res) => {
  const termsPath = path.join(publicDir, 'terms.html');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(termsPath);
});

app.get("/privacy", (req, res) => {
  const privacyPath = path.join(publicDir, 'privacy.html');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(privacyPath);
});

app.get("/security", (req, res) => {
  const securityPath = path.join(publicDir, 'security.html');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(securityPath);
});

app.get("/commands", (req, res) => {
  const commandsPath = path.join(publicDir, 'commands.html');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(commandsPath);
});


// Determine redirect URI based on host
const REDIRECT_URI_DETECTOR = (req) => {
  const host = req.get('x-forwarded-host') || req.get('host');
  const forwardedProto = req.get('x-forwarded-proto');
  // Replit and GitHub Codespaces use http internally but we need https for OAuth
  const protocol = (forwardedProto === 'https' || host.includes('repl.co') || host.includes('replit.dev') || host.includes('app.github.dev')) ? 'https' : req.protocol;
  return `${protocol}://${host}/auth/discord/callback`;
};

app.get("/auth/discord", (req, res) => {
  const currentRedirectUri = REDIRECT_URI_DETECTOR(req);
  const scopes = ["identify", "guilds"];
  const authURL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(currentRedirectUri)}&response_type=code&scope=${scopes.join("%20")}`;
  
  console.log(`🔵 Initiating OAuth login. Redirect URI: ${currentRedirectUri}`);
  res.redirect(authURL);
});

app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code provided");

  try {
    const currentRedirectUri = REDIRECT_URI_DETECTOR(req);
    console.log(`🔵 Auth Callback received. Using Redirect URI: ${currentRedirectUri}`);

    const tokenRes = await axios.post("https://discord.com/api/oauth2/token", 
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: currentRedirectUri,
        scope: "identify guilds"
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const { access_token } = tokenRes.data;

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const guildsRes = await axios.get("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const adminGuilds = guildsRes.data.filter(guild => {
      const permissions = BigInt(guild.permissions || 0);
      const ADMINISTRATOR = BigInt(8);
      return (permissions & ADMINISTRATOR) === ADMINISTRATOR;
    });

    if (adminGuilds.length === 0) {
      return res.status(403).send(`
        <div style="background: #1a0a2e; color: #ff6b6b; padding: 2rem; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
          <h2 style="color: #00d4ff;">❌ Access Denied</h2>
          <p>You must be an <b>Administrator</b> in at least one server with SPIDEY BOT to access this dashboard.</p>
          <a href="/" style="color: #ff1493; text-decoration: none; border: 1px solid #ff1493; padding: 10px 20px; border-radius: 5px; margin-top: 20px;">Back to Home</a>
        </div>
      `);
    }

    req.session.authenticated = true;
    req.session.user = userRes.data;
    req.session.guilds = adminGuilds;
    req.session.accessToken = access_token;

    req.session.save((err) => {
      if (err) {
        console.error("🔴 Session save error:", err);
        return res.status(500).send("Login failed: could not save session");
      }
      console.log(`✅ User logged in: ${userRes.data.username}`);
      // Ensure we redirect to the full URL to avoid relative path issues in frames
      const host = req.get('x-forwarded-host') || req.get('host');
      const forwardedProto = req.get('x-forwarded-proto');
      const protocol = (forwardedProto === 'https' || host.includes('repl.co') || host.includes('replit.dev') || host.includes('app.github.dev')) ? 'https' : req.protocol;
      res.redirect(`${protocol}://${host}/dashboard.html`);
    });
  } catch (err) {
    console.error("❌ OAuth error details:", err.response?.data || err.message);
    const errorMsg = err.response?.data?.error_description || err.message || "Unknown error";
    
    // Construct debug info
    const attemptedUri = REDIRECT_URI_DETECTOR(req);

    res.status(500).send(`
      <div style="background: #1a0a2e; color: #ff6b6b; padding: 2rem; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <h2 style="color: #00d4ff;">❌ Authentication Failed</h2>
        <p>Error: ${errorMsg}</p>
        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; margin: 20px 0; text-align: left; max-width: 600px;">
          <p><b>Attempted Redirect URI:</b><br/><code style="color: #9146ff; word-break: break-all;">${attemptedUri}</code></p>
          <p style="font-size: 0.9rem; color: #ccc;">If this doesn't match your Discord Dev Portal, add it there.</p>
        </div>
        <a href="/login.html" style="color: #ff1493; text-decoration: none;">← Try Again</a>
      </div>
    `);
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    res.redirect("/");
  });
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    res.json({ success: true });
  });
});

// ============== PUBLIC API ==============

app.get("/api/user", (req, res) => {
  if (!req.session.authenticated) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "User session expired" });
  }

  // Verify user still has admin guilds
  if (!req.session.guilds || req.session.guilds.length === 0) {
    return res.status(403).json({ error: "No admin servers found" });
  }

  let avatarUrl = null;
  
  if (user.avatar) {
    const isAnimated = user.avatar.startsWith('a_');
    const ext = isAnimated ? 'gif' : 'png';
    avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=128`;
  }

  res.json({
    user: {
      ...user,
      avatarUrl
    },
    guilds: req.session.guilds
  });
});

// ============== IMAGE PROXY ENDPOINT (fallback for CDN images) ==============
app.get("/api/image", async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).json({ error: "No URL provided" });

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 5000,
      headers: { 'User-Agent': 'SpideyBot/1.0' }
    });
    
    res.set('Content-Type', response.headers['content-type'] || 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(response.data);
  } catch (err) {
    console.warn(`⚠️ Image proxy failed for ${imageUrl}:`, err.message);
    res.status(502).json({ error: 'Failed to fetch image' });
  }
});

// ============== SERVER MANAGEMENT PAGE ==============
app.get("/dashboard/server/:guildId", (req, res) => {
  if (!req.session.authenticated) return res.redirect("/login");
  res.redirect("/dashboard.html");
});

// ============== API ENDPOINTS ==============
app.get("/api/config/:guildId", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false });

  const guildId = req.params.guildId;
  const userGuilds = req.session.guilds || [];
  const hasAccess = userGuilds.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, error: "No access" });

  const config = loadConfig();
  res.json(config.guilds[guildId] || {});
});

app.post("/api/config/:guildId", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false });

  const guildId = req.params.guildId;
  const userGuilds = req.session.guilds || [];
  const hasAccess = userGuilds.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, error: "No access" });

  const config = loadConfig();
  if (!config.guilds[guildId]) config.guilds[guildId] = {};

  Object.assign(config.guilds[guildId], req.body);
  fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
  res.json({ success: true });
});

app.post("/api/moderation/:guildId", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false });

  const { action, userId, reason } = req.body;
  console.log(`⚠️ Moderation: ${action} on user ${userId} - Reason: ${reason}`);
  res.json({ success: true, message: `${action} executed on user ${userId}` });
});

app.post("/api/economy/:guildId", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false });

  const { action, userId, amount } = req.body;
  console.log(`💰 Economy: ${action} ${amount} coins to user ${userId}`);
  res.json({ success: true, message: `Updated economy for user ${userId}` });
});

app.post("/api/commands/:guildId", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false });

  const guildId = req.params.guildId;
  const { name, response } = req.body;
  const config = loadConfig();
  if (!config.guilds[guildId]) config.guilds[guildId] = {};
  if (!config.guilds[guildId].customCommands) config.guilds[guildId].customCommands = {};

  config.guilds[guildId].customCommands[name] = response;
  fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
  console.log(`✨ Custom command created: ${name}`);
  addActivity(guildId, "💬", "Admin", `created custom command: ${name}`);
  res.json({ success: true });
});

// ============== ADMIN PANEL CONFIG ENDPOINTS ==============
const adminConfigs = ['settings', 'subscriptions', 'logging', 'server-guard', 'react-roles', 'role-categories', 'server-messages', 'components', 'custom-commands', 'recordings', 'reminders', 'leaderboards', 'invite-tracking', 'message-counting', 'statistics-channels', 'xp-levels', 'giveaways', 'social-notifs'];

adminConfigs.forEach(configName => {
  // GET endpoint to load config
  app.get(`/api/config/${configName}`, (req, res) => {
    if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

    const guildId = req.query.guildId;
    if (!guildId) return res.json({});

    // Verify user has admin access to this guild
    const hasAccess = req.session.guilds?.some(g => g.id === guildId);
    if (!hasAccess) {
      console.warn(`⚠️ Unauthorized config access attempt: ${req.session.user?.username} tried to access guild ${guildId}`);
      return res.status(403).json({ error: "You don't have admin permissions in this server" });
    }

    const config = loadConfig();
    const data = config.guilds[guildId]?.[configName] || {};
    res.json(data);
  });

  // POST endpoint to save config
  app.post(`/api/config/${configName}`, express.json(), (req, res) => {
    if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

    const guildId = req.query.guildId;
    if (!guildId) return res.json({ success: false, error: "No guild found" });

    // Verify user has admin access to this guild
    const hasAccess = req.session.guilds?.some(g => g.id === guildId);
    if (!hasAccess) {
      console.warn(`⚠️ Unauthorized config save attempt: ${req.session.user?.username} tried to save config for guild ${guildId}`);
      return res.status(403).json({ error: "You don't have admin permissions in this server" });
    }

    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    if (!config.guilds[guildId][configName]) config.guilds[guildId][configName] = {};

    Object.assign(config.guilds[guildId][configName], req.body);
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log(`✅ Config saved by ${req.session.user?.username}: ${configName} for guild ${guildId}`);
    res.json({ success: true, message: `${configName} saved successfully` });
  });
});

// ============== API: BOT CONFIG UPDATES ==============
app.post("/api/bot-config/prefix", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) {
    return res.status(403).json({ success: false, message: "You don't have admin permissions in this server" });
  }

  const { value } = req.body;
  if (!value || value.trim() === '') {
    return res.json({ success: false, message: "Prefix cannot be empty" });
  }

  try {
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    
    config.guilds[guildId].commandPrefix = value.trim();
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    
    console.log(`✅ Command prefix updated: ${value} (Guild: ${guildId})`);
    res.json({ success: true, message: "Command prefix updated successfully" });
  } catch (err) {
    console.error('❌ Error updating prefix:', err);
    res.json({ success: false, message: "Error updating prefix" });
  }
});

app.post("/api/bot-config/language", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) {
    return res.status(403).json({ success: false, message: "You don't have admin permissions in this server" });
  }

  const { value } = req.body;
  const validLanguages = ['English', 'Spanish', 'French', 'German', 'Portuguese'];
  
  if (!value || !validLanguages.includes(value)) {
    return res.json({ success: false, message: "Invalid language selection" });
  }

  try {
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    
    config.guilds[guildId].defaultLanguage = value;
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    
    console.log(`✅ Default language updated: ${value} (Guild: ${guildId})`);
    res.json({ success: true, message: "Default language updated successfully" });
  } catch (err) {
    console.error('❌ Error updating language:', err);
    res.json({ success: false, message: "Error updating language" });
  }
});

app.post("/api/bot-config/roles", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) {
    return res.status(403).json({ success: false, message: "You don't have admin permissions in this server" });
  }

  const { adminRole, moderatorRole, membersRole, mutedRole } = req.body;

  try {
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    
    if (adminRole) config.guilds[guildId].adminRole = adminRole;
    if (moderatorRole) config.guilds[guildId].moderatorRole = moderatorRole;
    if (membersRole) config.guilds[guildId].membersRole = membersRole;
    if (mutedRole) config.guilds[guildId].mutedRole = mutedRole;
    
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    
    console.log(`✅ Roles updated (Guild: ${guildId})`, { adminRole, moderatorRole, membersRole, mutedRole });
    res.json({ success: true, message: "Roles updated successfully" });
  } catch (err) {
    console.error('❌ Error updating roles:', err);
    res.json({ success: false, message: "Error updating roles" });
  }
});

app.post("/api/bot-config/channels", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) {
    return res.status(403).json({ success: false, message: "You don't have admin permissions in this server" });
  }

  const { generalChannel, announcementsChannel, welcomeChannel } = req.body;

  try {
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    
    if (generalChannel) config.guilds[guildId].generalChannel = generalChannel;
    if (announcementsChannel) config.guilds[guildId].announcementsChannel = announcementsChannel;
    if (welcomeChannel) config.guilds[guildId].welcomeChannel = welcomeChannel;
    
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    
    console.log(`✅ Channels updated (Guild: ${guildId})`, { generalChannel, announcementsChannel, welcomeChannel });
    res.json({ success: true, message: "Channels updated successfully" });
  } catch (err) {
    console.error('❌ Error updating channels:', err);
    res.json({ success: false, message: "Error updating channels" });
  }
});

app.post("/api/bot-config/logging", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "You don't have admin permissions" });

  try {
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    if (!config.guilds[guildId].logging) config.guilds[guildId].logging = {};

    const { logDeleted, logEdited, logBulkDelete, logChannel, logBans, logKicks, logMutes, logWarns, modLogChannel } = req.body;
    
    config.guilds[guildId].logging.messageLogging = { logDeleted, logEdited, logBulkDelete, logChannel };
    config.guilds[guildId].logging.moderationLogging = { logBans, logKicks, logMutes, logWarns, modLogChannel };
    
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log(`✅ All logging settings updated (Guild: ${guildId})`);
    res.json({ success: true, message: "Logging updated successfully" });
  } catch (err) {
    console.error('❌ Error updating logging:', err);
    res.json({ success: false, message: "Error updating logging" });
  }
});

app.post("/api/bot-config/server-guard", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "You don't have admin permissions" });

  try {
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    
    const { antiSpam, raidProtection, permissions, antiNuke, linkScanning, joinGate, rateLimiting, auditLog, backup } = req.body;
    
    if (antiSpam) config.guilds[guildId].antiSpam = antiSpam;
    if (raidProtection) config.guilds[guildId].raidProtection = raidProtection;
    if (permissions) config.guilds[guildId].permissions = permissions;
    if (antiNuke) config.guilds[guildId].antiNuke = antiNuke;
    if (linkScanning) config.guilds[guildId].linkScanning = linkScanning;
    if (joinGate) config.guilds[guildId].joinGate = joinGate;
    if (rateLimiting) config.guilds[guildId].rateLimiting = rateLimiting;
    if (auditLog) config.guilds[guildId].auditLog = auditLog;
    if (backup) config.guilds[guildId].backup = backup;
    
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log(`✅ All Server Guard settings updated (Guild: ${guildId})`);
    res.json({ success: true, message: "Server Guard updated successfully" });
  } catch (err) {
    console.error('❌ Error updating server guard:', err);
    res.json({ success: false, message: "Error updating server guard" });
  }
});

// ============== REACT ROLES API ENDPOINTS ==============
// Save react role settings (allowMultiple, removeOnUnreact, dmConfirm)
app.post("/api/bot-config/react-roles/settings", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "No admin permissions" });
  try {
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    if (!config.guilds[guildId].reactRoles) config.guilds[guildId].reactRoles = { entries: [] };
    const { allowMultiple, removeOnUnreact, dmConfirm } = req.body;
    config.guilds[guildId].reactRoles.allowMultiple = allowMultiple;
    config.guilds[guildId].reactRoles.removeOnUnreact = removeOnUnreact;
    config.guilds[guildId].reactRoles.dmConfirm = dmConfirm;
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log(`✅ React roles settings saved (Guild: ${guildId})`);
    res.json({ success: true, message: "React roles settings saved" });
  } catch (err) {
    console.error('❌ Error saving react roles settings:', err);
    res.json({ success: false, message: "Error saving settings" });
  }
});

// Add a single reaction role entry (and bot adds the reaction to the message)
app.post("/api/bot-config/react-roles/add", express.json(), async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "No admin permissions" });
  try {
    const { channelId, messageId, emoji, roleId } = req.body;
    if (!channelId || !messageId || !emoji || !roleId) return res.json({ success: false, error: "Missing fields" });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.json({ success: false, error: "Guild not found in bot cache" });

    // Verify channel exists
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.json({ success: false, error: "Channel not found" });

    // Verify message exists
    let message;
    try {
      message = await channel.messages.fetch(messageId);
    } catch (e) {
      return res.json({ success: false, error: "Could not find message with that ID in the selected channel" });
    }

    // Verify role exists
    const role = guild.roles.cache.get(roleId);
    if (!role) return res.json({ success: false, error: "Role not found" });

    // Try to add the reaction to the message
    try {
      await message.react(emoji);
    } catch (e) {
      console.warn('Could not add reaction:', e.message);
      return res.json({ success: false, error: "Could not add reaction. Make sure the emoji is valid and the bot has permissions." });
    }

    // Save to config
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    if (!config.guilds[guildId].reactRoles) config.guilds[guildId].reactRoles = { entries: [], allowMultiple: true, removeOnUnreact: true, dmConfirm: false };
    if (!Array.isArray(config.guilds[guildId].reactRoles.entries)) config.guilds[guildId].reactRoles.entries = [];

    // Check for duplicate
    const exists = config.guilds[guildId].reactRoles.entries.some(e => e.messageId === messageId && e.emoji === emoji);
    if (exists) return res.json({ success: false, error: "A reaction role with this emoji on this message already exists" });

    config.guilds[guildId].reactRoles.entries.push({
      channelId,
      channelName: channel.name,
      messageId,
      emoji,
      roleId,
      roleName: role.name,
      createdAt: new Date().toISOString()
    });

    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log(`✅ React role added: ${emoji} → @${role.name} on message ${messageId} (Guild: ${guildId})`);
    addActivity(guildId, "🎭", "Admin", `added reaction role: ${emoji} → @${role.name}`);
    res.json({ success: true, message: "Reaction role added" });
  } catch (err) {
    console.error('❌ Error adding react role:', err);
    res.json({ success: false, message: "Error adding reaction role: " + err.message });
  }
});

// Remove a reaction role entry by index
app.post("/api/bot-config/react-roles/remove", express.json(), async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "No admin permissions" });
  try {
    const { index } = req.body;
    const config = loadConfig();
    const entries = config.guilds[guildId]?.reactRoles?.entries;
    if (!entries || index < 0 || index >= entries.length) return res.json({ success: false, message: "Invalid index" });

    const removed = entries.splice(index, 1)[0];

    // Try to remove the bot's reaction from the message
    try {
      const guild = client.guilds.cache.get(guildId);
      if (guild) {
        const channel = guild.channels.cache.get(removed.channelId);
        if (channel) {
          const message = await channel.messages.fetch(removed.messageId);
          if (message) {
            const reaction = message.reactions.cache.find(r => r.emoji.name === removed.emoji || r.emoji.toString() === removed.emoji);
            if (reaction) await reaction.users.remove(client.user.id).catch(() => {});
          }
        }
      }
    } catch (e) { console.warn('Could not remove bot reaction:', e.message); }

    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log(`✅ React role removed: ${removed.emoji} → @${removed.roleName} (Guild: ${guildId})`);
    addActivity(guildId, "🎭", "Admin", `removed reaction role: ${removed.emoji} → @${removed.roleName}`);
    res.json({ success: true, message: "Reaction role removed" });
  } catch (err) {
    console.error('❌ Error removing react role:', err);
    res.json({ success: false, message: "Error removing reaction role" });
  }
});

// Post a new reaction role embed to a channel
app.post("/api/bot-config/react-roles/post", express.json(), async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "No admin permissions" });
  try {
    const { channelId, title, description } = req.body;
    if (!channelId || !title) return res.json({ success: false, error: "Channel and title required" });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.json({ success: false, error: "Guild not found in bot cache" });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.json({ success: false, error: "Channel not found" });

    // Build and send embed
    const embed = new EmbedBuilder()
      .setColor(0x00D4FF)
      .setTitle(title)
      .setDescription(description || 'React below to claim your roles!')
      .setFooter({ text: 'SPIDEY BOT • React to get roles' })
      .setTimestamp();

    const msg = await channel.send({ embeds: [embed] });
    console.log(`✅ React role message posted: ${msg.id} in #${channel.name} (Guild: ${guildId})`);
    addActivity(guildId, "📨", "Admin", `posted reaction role message in #${channel.name}`);
    res.json({ success: true, messageId: msg.id, message: "Message posted" });
  } catch (err) {
    console.error('❌ Error posting react role message:', err);
    res.json({ success: false, message: "Error posting message: " + err.message });
  }
});

// Delete a role category from dashboard
app.post("/api/bot-config/role-category/delete", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "No admin permissions" });
  try {
    const { categoryName } = req.body;
    if (!categoryName) return res.json({ success: false, message: "Category name required" });
    const config = loadConfig();
    if (!config.guilds[guildId]) return res.json({ success: false, message: "Guild not found" });
    const categories = config.guilds[guildId].roleCategories || {};
    if (!categories[categoryName]) return res.json({ success: false, message: "Category not found" });
    delete categories[categoryName];
    config.guilds[guildId].roleCategories = categories;
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log(`✅ Category deleted from dashboard: ${categoryName} (Guild: ${guildId})`);
    addActivity(guildId, "🗑️", "Dashboard", `deleted category: ${categoryName}`);
    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    console.error('❌ Error deleting category:', err);
    res.json({ success: false, message: "Error deleting category" });
  }
});

// Setup category selector - posts embed with dropdown to a channel
app.post("/api/bot-config/setup-category", express.json(), async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, error: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, error: "No admin permissions" });
  try {
    const { categoryName, channelId } = req.body;
    if (!categoryName) return res.json({ success: false, error: "Category name required" });
    if (!channelId) return res.json({ success: false, error: "Channel required" });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.json({ success: false, error: "Guild not found in bot cache" });

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.json({ success: false, error: "Channel not found" });

    const config = loadConfig();
    const categories = config.guilds[guildId]?.roleCategories || {};
    if (!categories[categoryName]) return res.json({ success: false, error: `Category "${categoryName}" doesn't exist` });

    const catData = Array.isArray(categories[categoryName]) ? { roles: categories[categoryName], banner: null } : categories[categoryName];
    if (!catData.roles || catData.roles.length === 0) return res.json({ success: false, error: "Category has no roles. Add roles first!" });

    const roleOptions = catData.roles.map(r => ({ label: `✨ ${r.name}`, value: r.id }));
    const colorMap = { gaming: 0xFF6B6B, streaming: 0x4ECDC4, platform: 0x45B7D1, community: 0x96CEB4, events: 0xFFBD39 };
    const embedColor = colorMap[categoryName.toLowerCase()] || 0x5865F2;

    const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🎯 ${categoryName.toUpperCase()} ROLES`)
      .setDescription(`✨ Click below to select your ${categoryName.toLowerCase()} roles!\n\n*Choose multiple roles to add yourself to communities*`)
      .setFooter({ text: "SPIDEY BOT • Select roles to join communities" });

    if (catData.banner) embed.setImage(catData.banner);

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`select_${categoryName}`)
        .setPlaceholder(`🔍 Select ${categoryName.toLowerCase()} roles...`)
        .setMinValues(1)
        .setMaxValues(roleOptions.length)
        .addOptions(roleOptions)
    );

    await channel.send({ embeds: [embed], components: [selectMenu] });
    addActivity(guildId, "📂", "Dashboard", `posted category selector: ${categoryName} → #${channel.name}`);
    console.log(`✅ Category selector posted from dashboard: ${categoryName} → #${channel.name} (Guild: ${guildId})`);
    res.json({ success: true, message: `Category selector posted to #${channel.name}` });
  } catch (err) {
    console.error('❌ Error posting category selector:', err);
    res.json({ success: false, error: "Error posting: " + err.message });
  }
});

// Add a typed role (game / watchparty / platform) from dashboard
app.post("/api/bot-config/typed-role/add", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "No admin permissions" });
  try {
    const { type, roles, roleId, roleName } = req.body;
    const configKeyMap = { game: 'gameRoles', watchparty: 'watchPartyRoles', platform: 'platformRoles' };
    const configKey = configKeyMap[type];
    if (!configKey) return res.json({ success: false, error: "Invalid role type" });

    // Support both single role (legacy) and bulk roles array
    const toAdd = Array.isArray(roles) ? roles : (roleId && roleName ? [{ roleId, roleName }] : []);
    if (!toAdd.length) return res.json({ success: false, error: "No roles provided" });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.json({ success: false, error: "Guild not in bot cache" });

    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    if (!Array.isArray(config.guilds[guildId][configKey])) config.guilds[guildId][configKey] = [];

    let added = 0;
    const skipped = [];
    const typeNames = { game: 'gaming', watchparty: 'watch party', platform: 'platform' };

    for (const { roleId: rId, roleName: rName } of toAdd) {
      if (!rId || !rName) continue;
      const role = guild.roles.cache.get(rId);
      if (!role) { skipped.push(rName + ' (not found)'); continue; }
      if (config.guilds[guildId][configKey].some(r => (r.id || r) === rId)) { skipped.push(rName + ' (duplicate)'); continue; }
      config.guilds[guildId][configKey].push({ name: rName.replace(/@/g, ''), id: rId });
      added++;
    }

    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log(`✅ Added ${added} ${typeNames[type]} role(s) (Guild: ${guildId})`);
    if (added > 0) addActivity(guildId, "➕", "Dashboard", `added ${added} ${typeNames[type]} role(s)`);
    const msg = added > 0 ? `Added ${added} role(s)` : 'No new roles added';
    res.json({ success: true, added, skipped, message: msg });
  } catch (err) {
    console.error('❌ Error adding typed role:', err);
    res.json({ success: false, message: "Error adding role" });
  }
});

// Remove a typed role (game / watchparty / platform) from dashboard
app.post("/api/bot-config/typed-role/remove", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "No admin permissions" });
  try {
    const { type, index } = req.body;
    const configKeyMap = { game: 'gameRoles', watchparty: 'watchPartyRoles', platform: 'platformRoles' };
    const configKey = configKeyMap[type];
    if (!configKey) return res.json({ success: false, message: "Invalid role type" });

    const config = loadConfig();
    const roles = config.guilds[guildId]?.[configKey];
    if (!roles || index < 0 || index >= roles.length) return res.json({ success: false, message: "Invalid index" });

    const removed = roles.splice(index, 1)[0];
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    const typeNames = { game: 'gaming', watchparty: 'watch party', platform: 'platform' };
    console.log(`✅ Removed ${typeNames[type]} role: ${removed.name || removed} (Guild: ${guildId})`);
    addActivity(guildId, "🗑️", "Dashboard", `removed ${typeNames[type]} role: ${removed.name || removed}`);
    res.json({ success: true, message: "Role removed" });
  } catch (err) {
    console.error('❌ Error removing typed role:', err);
    res.json({ success: false, message: "Error removing role" });
  }
});

app.post("/api/bot-config/anti-spam", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "You don't have admin permissions" });

  try {
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    const { enabled, messagesPerLimit, action } = req.body;
    config.guilds[guildId].antiSpam = { enabled, messagesPerLimit, action };
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    res.json({ success: true, message: "Anti-spam updated successfully" });
  } catch (err) {
    console.error('❌ Error updating anti-spam:', err);
    res.json({ success: false, message: "Error updating anti-spam" });
  }
});

app.post("/api/bot-config/raid", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "You don't have admin permissions" });

  try {
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    const { enabled, usersPerLimit, banRaidUsers } = req.body;
    config.guilds[guildId].raidProtection = { enabled, usersPerLimit, banRaidUsers };
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    res.json({ success: true, message: "Raid protection updated successfully" });
  } catch (err) {
    console.error('❌ Error updating raid protection:', err);
    res.json({ success: false, message: "Error updating raid protection" });
  }
});

app.post("/api/bot-config/permissions", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "You don't have admin permissions" });

  try {
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    const { membersOnly, adminsBypass, allowDM, confirmDangerous } = req.body;
    config.guilds[guildId].permissions = { membersOnly, adminsBypass, allowDM, confirmDangerous };
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    res.json({ success: true, message: "Permissions updated successfully" });
  } catch (err) {
    console.error('❌ Error updating permissions:', err);
    res.json({ success: false, message: "Error updating permissions" });
  }
});

app.post("/api/bot-config/messages", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });
  const guildId = req.query.guildId;
  if (!guildId) return res.json({ success: false, message: "No guild found" });
  const hasAccess = req.session.guilds?.some(g => g.id === guildId);
  if (!hasAccess) return res.status(403).json({ success: false, message: "You don't have admin permissions" });

  try {
    const config = loadConfig();
    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    const { enableWelcome, welcomeMessage, enableGoodbye, goodbyeMessage } = req.body;
    config.guilds[guildId].serverMessages = { enableWelcome, welcomeMessage, enableGoodbye, goodbyeMessage };
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    res.json({ success: true, message: "Server messages updated successfully" });
  } catch (err) {
    console.error('❌ Error updating messages:', err);
    res.json({ success: false, message: "Error updating messages" });
  }
});

// ============== API: GET ROLE CATEGORIES ==============
app.get("/api/config/role-categories", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const config = loadConfig();
  const guildId = req.query.guildId || client.guilds.cache.first()?.id;
  if (!guildId) return res.json({});

  const data = config.guilds[guildId]?.roleCategories || {};
  
  // Filter out empty category names and log what we're returning
  const filtered = {};
  Object.keys(data).forEach(key => {
    if (key && key.trim() !== '') {
      filtered[key] = data[key];
    }
  });
  
  console.log(`✅ Role Categories API - Guild: ${guildId}, Categories found:`, Object.keys(filtered).length, `(${Object.keys(filtered).join(', ')})`);
  res.json(filtered);
});

// ============== API: SAVE ROLE CATEGORIES ==============
app.post("/api/config/role-categories", express.json(), (req, res) => {
  try {
    if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });

    console.log('📝 POST /api/config/role-categories received');
    console.log('   Query:', req.query);
    console.log('   Body:', req.body);

    const config = loadConfig();
    const guildId = req.query.guildId || client.guilds.cache.first()?.id;
    
    console.log('   Using guildId:', guildId);
    
    if (!guildId) {
      console.error('❌ Role category save failed: No guild ID provided');
      return res.status(400).json({ success: false, error: "No guild found" });
    }

    if (!config.guilds[guildId]) config.guilds[guildId] = {};
    if (!config.guilds[guildId].roleCategories) config.guilds[guildId].roleCategories = {};

    const { categoryName, oldCategoryName, roles, channel, message } = req.body;
    
    if (!categoryName) {
      console.error('❌ Role category save failed: No category name provided');
      return res.status(400).json({ success: false, error: "Category name is required" });
    }

    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      console.error('❌ Role category save failed: No roles provided');
      return res.status(400).json({ success: false, error: "At least one role is required" });
    }
    
    // If renaming, delete old category first
    if (oldCategoryName && oldCategoryName !== categoryName && config.guilds[guildId].roleCategories[oldCategoryName]) {
      delete config.guilds[guildId].roleCategories[oldCategoryName];
      console.log(`🔄 Renamed category: ${oldCategoryName} → ${categoryName}`);
    }

    // Save or update category with message and channel
    config.guilds[guildId].roleCategories[categoryName] = {
      roles: roles || [],
      channel: channel || '',
      message: message || ''
    };
    
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    console.log(`✅ Role category saved: ${categoryName} (Guild: ${guildId})`);
    res.json({ success: true, message: "Role category saved successfully", categoryName, guildId });
  } catch (err) {
    console.error('❌ Error saving role category:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============== API: POST CATEGORY TO DISCORD CHANNEL ==============
app.post("/api/post-category", express.json(), async (req, res) => {
  try {
    if (!req.session.authenticated) return res.status(401).json({ success: false, error: "Not authenticated" });

    const guildId = req.query.guildId;
    const { categoryName, channelId } = req.body;

    console.log('🔵 POST /api/post-category:', { categoryName, channelId, guildId });

    if (!guildId || !categoryName || !channelId) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const config = loadConfig();
    const category = config.guilds[guildId]?.roleCategories?.[categoryName];

    if (!category) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    // Get Discord guild and channel
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(400).json({ success: false, error: "Guild not found" });
    }

    const channel = await guild.channels.fetch(channelId);
    if (!channel || !channel.isSendable?.()) {
      return res.status(400).json({ success: false, error: "Channel not found or not sendable" });
    }

    // Create embed with role selection buttons
    const embed = new EmbedBuilder()
      .setColor("#00d4ff")
      .setTitle(`${categoryName}`)
      .setDescription(category.message || "Select roles below:")
      .setFooter({ text: "React with the button below to claim a role" });

    const buttons = new ActionRowBuilder();
    category.roles.forEach((role, index) => {
      const cleanRole = role.replace('@', '');
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`role_${categoryName}_${index}`)
          .setLabel(cleanRole)
          .setStyle(ButtonStyle.Primary)
      );
    });

    // Send message with buttons
    const message = await channel.send({
      embeds: [embed],
      components: buttons.components.length > 0 ? [buttons] : []
    });

    console.log(`✅ Category posted to channel ${channelId}: ${message.id}`);
    res.json({ success: true, messageId: message.id, categoryName });
  } catch (err) {
    console.error('❌ Error posting category:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// (Duplicate /api/config/:guildId POST removed — handled above)

// ============== REAL-TIME DASHBOARD API ==============
app.get("/api/dashboard/stats", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });
  
  const guildId = req.query.guildId;
  const targetGuild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
  
  if (!targetGuild) return res.json({ status: "offline", members: 0, commands: 66, activity: 0, prefix: "/" });

  const config = getGuildConfig(targetGuild.id);
  const activities = config.activities || [];
  
  res.json({
    status: "online",
    members: targetGuild.memberCount,
    commands: 66,
    activity: activities.length,
    prefix: config.prefix || "/"
  });
});

app.get("/api/dashboard/analytics", (req, res) => {
  const firstGuild = client.guilds.cache.first();
  if (!firstGuild) return res.json({ growth: [], topCommands: [] });

  const config = getGuildConfig(firstGuild.id);
  const levels = config.levels || {};
  const economy = config.economy || {};

  const activeUsers = Object.keys(levels).filter(k => !k.includes("_")).length;
  const retention = {
    veryActive: Math.floor(activeUsers * 0.45),
    active: Math.floor(activeUsers * 0.35),
    inactive: Math.floor(activeUsers * 0.20)
  };

  res.json({
    avgOnline: firstGuild.memberCount,
    dailyMessages: Math.floor(Math.random() * 5000) + 5000,
    avgSession: "2h 45m",
    newMembers: Math.floor(Math.random() * 150) + 100,
    retention: retention,
    growth: [30, 40, 50, 65, 75, 85, 95, 100],
    topCommands: [
      { name: "play", uses: 234 },
      { name: "say", uses: 156 },
      { name: "info", uses: 98 },
      { name: "invite", uses: 87 }
    ]
  });
});

app.get("/api/dashboard/members", (req, res) => {
  const firstGuild = client.guilds.cache.first();
  if (!firstGuild) return res.json({ members: [] });

  const config = getGuildConfig(firstGuild.id);
  const levels = config.levels || {};

  const memberXP = Object.keys(levels)
    .filter(k => !k.includes("_"))
    .map(userId => {
      const xp = levels[userId] || 0;
      const level = Math.floor(xp / 500) + 1;
      return { userId, xp, level };
    })
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5);

  const members = memberXP.map((m, i) => ({
    rank: i + 1,
    userId: m.userId,
    level: m.level,
    xp: m.xp
  }));

  res.json({ members });
});

app.get("/api/dashboard/activity", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const guildId = req.query.guildId;
  const firstGuild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
  if (!firstGuild) return res.json({ activities: [] });

  const config = getGuildConfig(firstGuild.id);
  const activities = config.activities || [];

  res.json({ activities });
});

app.get("/api/dashboard/growth", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const firstGuild = client.guilds.cache.first();
  if (!firstGuild) return res.json({ growth: [] });

  const growth = [150, 185, 245, 310, 385, 480, 620, 785, 950, 1120, 1350, 1620, 1890, 2150];

  res.json({ 
    growth,
    labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8", "Week 9", "Week 10", "Week 11", "Week 12", "Week 13", "Week 14"]
  });
});

app.get("/api/dashboard/active-members", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const firstGuild = client.guilds.cache.first();
  if (!firstGuild) return res.json({ active: [] });

  const config = getGuildConfig(firstGuild.id);
  const levels = config.levels || {};
  const userIds = Object.keys(levels).filter(k => !k.includes("_"));

  const activeCount = Math.floor(userIds.length * 0.65);
  const active = [
    Math.floor(activeCount * 0.45),
    Math.floor(activeCount * 0.52),
    Math.floor(activeCount * 0.48),
    Math.floor(activeCount * 0.61),
    Math.floor(activeCount * 0.58),
    Math.floor(activeCount * 0.72),
    Math.floor(activeCount * 0.68)
  ];

  res.json({ 
    active,
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  });
});

app.get("/api/dashboard/statistics", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const guildId = req.query.guildId;
  const targetGuild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
  
  if (!targetGuild) return res.json({ memberCount: 0, activeMembers: 0, verifiedMembers: 0, botCount: 0 });

  const config = getGuildConfig(targetGuild.id);
  const levels = config.levels || {};
  const userIds = Object.keys(levels).filter(k => !k.includes("_"));

  const memberCount = targetGuild.memberCount;
  const activeMembers = Math.max(userIds.length, Math.floor(memberCount * 0.1));
  const verifiedMembers = Math.floor(memberCount * 0.85);
  const botCount = targetGuild.members.cache.filter(m => m.user.bot).size || Math.floor(memberCount * 0.05);

  res.json({
    memberCount,
    activeMembers,
    verifiedMembers,
    botCount
  });
});

app.get("/api/dashboard/top-members", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const firstGuild = client.guilds.cache.first();
  if (!firstGuild) return res.json({ members: [] });

  const config = getGuildConfig(firstGuild.id);
  const levels = config.levels || {};

  const memberXP = Object.keys(levels)
    .filter(k => !k.includes("_"))
    .map(userId => {
      const xp = levels[userId] || 0;
      const level = Math.floor(xp / 500) + 1;
      return { userId, xp, level };
    })
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);

  const members = memberXP.map((m, i) => ({
    rank: i + 1,
    userId: m.userId,
    level: m.level,
    xp: m.xp,
    username: `User#${m.userId.slice(0, 4)}`
  }));

  res.json({ members });
});

// ============== CREATOR ONLY APIS ==============

// Get all servers the bot is in (filtered to only admin-accessible servers)
app.get("/api/creator/servers", async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const ADMIN_PERMISSION = BigInt(8);

  try {
    // Always fetch fresh guild list from Discord using stored access token
    let userGuilds = req.session.guilds || [];

    if (req.session.accessToken) {
      try {
        const guildsRes = await axios.get("https://discord.com/api/users/@me/guilds", {
          headers: { Authorization: `Bearer ${req.session.accessToken}` }
        });
        // Filter to admin-only guilds and update session
        userGuilds = guildsRes.data.filter(guild => {
          const permissions = BigInt(guild.permissions || 0);
          return (permissions & ADMIN_PERMISSION) === ADMIN_PERMISSION;
        });
        req.session.guilds = userGuilds;
        console.log(`📡 Refreshed guild list from Discord: ${userGuilds.length} admin guilds`);
      } catch (discordErr) {
        console.warn(`⚠️ Could not refresh guilds from Discord (token may be expired), using cached data: ${discordErr.message}`);
        // Fall back to session-stored guilds
      }
    }

    console.log(`📡 User has ${userGuilds.length} admin guilds`);
    console.log(`📡 Bot is in ${client.guilds.cache.size} guilds`);

    // Get IDs of user's admin guilds
    const adminGuildIds = userGuilds.map(guild => guild.id);

    console.log(`📡 Admin guild IDs: ${adminGuildIds.join(', ')}`);
    console.log(`📡 Bot guild IDs: ${client.guilds.cache.map(g => g.id).join(', ')}`);

    // Get bot's servers where user is admin — the intersection
    const servers = client.guilds.cache
      .filter(guild => adminGuildIds.includes(guild.id))
      .map(guild => {
        let iconUrl = null;
        let iconProxyUrl = null;
        if (guild.icon) {
          const isAnimated = guild.icon.startsWith('a_');
          const ext = isAnimated ? 'gif' : 'png';
          iconUrl = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=128`;
          iconProxyUrl = `/api/image?url=${encodeURIComponent(iconUrl)}`;
        }
        return {
          id: guild.id,
          name: guild.name,
          icon: iconUrl,
          iconProxy: iconProxyUrl,
          memberCount: guild.memberCount
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`📡 Returning ${servers.length} servers to dashboard`);
    res.json({ servers });
  } catch (err) {
    console.error('❌ Error in /api/creator/servers:', err);
    res.status(500).json({ error: 'Failed to load servers' });
  }
});

// Get all channels in a guild
app.get("/api/channels/:guildId", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const guild = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  const channels = guild.channels.cache
    .filter(channel => channel.isTextBased())
    .map(channel => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json({ channels });
});

// Get all roles in a guild
app.get("/api/roles/:guildId", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const guild = client.guilds.cache.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  const roles = guild.roles.cache
    .filter(role => role.name !== '@everyone')
    .map(role => ({
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position
    }))
    .sort((a, b) => b.position - a.position);

  res.json({ roles });
});

// Get creator settings (bot nickname, timezone)
app.get("/api/creator/settings", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const config = loadConfig();
  const creatorSettings = config.creator || {
    botNickname: "SPIDEY BOT",
    timezone: "GMT"
  };

  res.json(creatorSettings);
});

// Save creator settings
app.post("/api/creator/settings", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const config = loadConfig();
  config.creator = config.creator || {};
  config.creator.botNickname = req.body.botNickname || "SPIDEY BOT";
  config.creator.timezone = req.body.timezone || "GMT";

  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  res.json({ success: true, settings: config.creator });
});

// Get member statistics by role for graphs (with caching to avoid rate limits)

// Get admin and mod members for dashboard management panel
app.get("/api/staff-members/:guildId", async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const guildId = req.params.guildId;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  // Ensure members are fetched
  if (guild.members.cache.size <= 1) {
    try { await guild.members.fetch(); } catch (e) { console.warn('Failed to fetch members:', e.message); }
  }

  const members = guild.members.cache;
  const botMember = guild.members.me;

  // Get admins (non-bot members with Administrator permission)
  const admins = members
    .filter(m => !m.user.bot && m.permissions.has('Administrator'))
    .map(m => {
      const adminRoles = m.roles.cache.filter(r => r.permissions.has('Administrator') && r.name !== '@everyone');
      return {
        id: m.user.id,
        username: m.user.username,
        displayName: m.displayName,
        avatar: m.user.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=64` : null,
        isOwner: m.id === guild.ownerId,
        roles: adminRoles.map(r => ({ id: r.id, name: r.name, position: r.position })),
        canRevoke: m.id !== guild.ownerId && botMember && botMember.roles.highest.position > m.roles.highest.position
      };
    })
    .sort((a, b) => (a.isOwner ? -1 : b.isOwner ? 1 : a.displayName.localeCompare(b.displayName)));

  // Get mods (non-bot, non-admin members with mod-like perms)
  const mods = members
    .filter(m => {
      if (m.user.bot) return false;
      if (m.permissions.has('Administrator')) return false;
      return m.permissions.has('ModerateMembers') ||
             m.permissions.has('KickMembers') ||
             m.permissions.has('BanMembers') ||
             m.permissions.has('ManageMessages') ||
             m.roles.cache.some(r => r.name.toLowerCase().includes('mod') || r.name.toLowerCase().includes('staff'));
    })
    .map(m => {
      const modRoles = m.roles.cache.filter(r => {
        if (r.name === '@everyone') return false;
        return r.permissions.has('ModerateMembers') ||
               r.permissions.has('KickMembers') ||
               r.permissions.has('BanMembers') ||
               r.permissions.has('ManageMessages') ||
               r.name.toLowerCase().includes('mod') ||
               r.name.toLowerCase().includes('staff');
      });
      return {
        id: m.user.id,
        username: m.user.username,
        displayName: m.displayName,
        avatar: m.user.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png?size=64` : null,
        roles: modRoles.map(r => ({ id: r.id, name: r.name, position: r.position })),
        canRevoke: botMember && botMember.roles.highest.position > m.roles.highest.position
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  res.json({ admins, mods, ownerId: guild.ownerId });
});

// Revoke a role from a member (remove admin/mod role)
app.post("/api/revoke-role/:guildId", express.json(), async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const guildId = req.params.guildId;
  const { memberId, roleId } = req.body;

  if (!memberId || !roleId) return res.status(400).json({ error: "Missing memberId or roleId" });

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  try {
    const member = await guild.members.fetch(memberId);
    if (!member) return res.status(404).json({ error: "Member not found" });

    // Safety: can't revoke roles from the server owner
    if (member.id === guild.ownerId) {
      return res.status(403).json({ error: "Cannot revoke roles from the server owner" });
    }

    const botMember = guild.members.me;
    if (!botMember || botMember.roles.highest.position <= member.roles.highest.position) {
      return res.status(403).json({ error: "Bot's role is not high enough to manage this member" });
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) return res.status(404).json({ error: "Role not found" });

    if (!member.roles.cache.has(roleId)) {
      return res.status(400).json({ error: "Member does not have this role" });
    }

    await member.roles.remove(roleId, `Revoked via dashboard by ${req.session.user.username}`);
    
    // Clear the member stats cache so numbers update
    setCachedMemberStats(guildId, null);

    console.log(`✅ Role "${role.name}" removed from ${member.user.username} by dashboard user ${req.session.user.username}`);
    res.json({ success: true, message: `Removed role "${role.name}" from ${member.displayName}` });
  } catch (err) {
    console.error(`❌ Failed to revoke role: ${err.message}`);
    res.status(500).json({ error: `Failed to revoke role: ${err.message}` });
  }
});

app.get("/api/member-stats/:guildId", async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const guildId = req.params.guildId;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  // Check cache first
  const cached = getCachedMemberStats(guildId);
  if (cached) {
    console.log(`📊 Using cached member stats for guild ${guildId}`);
    return res.json(cached);
  }

  // Use cached member data if available, otherwise fetch
  const memberCache = guild.members.cache;
  
  // If cache is too small (likely not fetched yet), fetch now
  if (memberCache.size <= 1) {
    console.log(`📊 Member cache empty for ${guildId}, fetching...`);
    try {
      await guild.members.fetch();
    } catch (err) {
      console.warn(`⚠️ Failed to fetch members for ${guildId}:`, err.message);
    }
  }
  
  const members = guild.members.cache;
  
  // Count non-bot members (humans)
  const humans = members.filter(m => !m.user.bot);
  
  // Verified = members who have passed Discord's membership screening / have roles beyond @everyone
  const verified = humans.filter(m => !m.pending && m.roles.cache.size > 1).size;
  
  // Admins = members with Administrator permission (excluding bots)
  const admins = members.filter(m => !m.user.bot && m.permissions.has('Administrator')).size;
  
  // Moderators = members with mod-like permissions but not full admin (excluding bots)
  const mods = members.filter(m => {
    if (m.user.bot) return false;
    if (m.permissions.has('Administrator')) return false; // Don't double-count admins
    return m.permissions.has('ModerateMembers') || 
           m.permissions.has('KickMembers') || 
           m.permissions.has('BanMembers') || 
           m.permissions.has('ManageMessages') ||
           m.roles.cache.some(r => r.name.toLowerCase().includes('mod') || r.name.toLowerCase().includes('staff'));
  }).size;
  
  const stats = {
    total: members.size,
    members: humans.size,
    verified: verified,
    bots: members.filter(m => m.user.bot).size,
    admins: admins,
    mods: mods,
    roles: guild.roles.cache.map(r => ({ id: r.id, name: r.name, count: r.members.size }))
  };

  // Cache the stats
  setCachedMemberStats(guildId, stats);
  
  // Fetch fresh data in background (don't wait for it)
  guild.members.fetch().then(freshMembers => {
    const freshHumans = freshMembers.filter(m => !m.user.bot);
    const freshVerified = freshHumans.filter(m => !m.pending && m.roles.cache.size > 1).size;
    const freshAdmins = freshMembers.filter(m => !m.user.bot && m.permissions.has('Administrator')).size;
    const freshMods = freshMembers.filter(m => {
      if (m.user.bot) return false;
      if (m.permissions.has('Administrator')) return false;
      return m.permissions.has('ModerateMembers') || 
             m.permissions.has('KickMembers') || 
             m.permissions.has('BanMembers') || 
             m.permissions.has('ManageMessages') ||
             m.roles.cache.some(r => r.name.toLowerCase().includes('mod') || r.name.toLowerCase().includes('staff'));
    }).size;
    
    const freshStats = {
      total: freshMembers.size,
      members: freshHumans.size,
      verified: freshVerified,
      bots: freshMembers.filter(m => m.user.bot).size,
      admins: freshAdmins,
      mods: freshMods,
      roles: guild.roles.cache.map(r => ({ id: r.id, name: r.name, count: r.members.size }))
    };
    setCachedMemberStats(guildId, freshStats);
    console.log(`✅ Updated member stats cache for guild ${guildId}`);
  }).catch(err => {
    console.warn(`⚠️ Background member fetch failed for guild ${guildId}:`, err.message);
  });

  res.json(stats);
});

// Get member events (joins, leaves, boosts)
app.get("/api/member-events/:guildId", (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const config = loadConfig();
  const guildId = req.params.guildId;
  const events = config.guilds[guildId]?.memberEvents || [];
  
  res.json({ events });
});

// ============== QUICK SETUP ENDPOINTS ==============
app.post("/api/quick-setup/:setupType", express.json(), (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: "Not authenticated" });

  const setupType = req.params.setupType;
  const guildId = req.query.guildId || req.body.guildId;
  const guild = client.guilds.cache.get(guildId);
  
  if (!guild) return res.status(404).json({ error: "Guild not found" });

  // Get the default text channel to post messages
  const channel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
  if (!channel) return res.status(400).json({ error: "No suitable channel found to post message" });

  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

  try {
    switch(setupType) {
      case 'gaming':
        const gamingEmbed = new EmbedBuilder()
          .setColor(0x00D4FF)
          .setTitle("🎮 GAMING ROLE SELECTION")
          .setDescription("✨ Choose the games you play and join gaming communities!\n\n*Click the button below to see available gaming roles*")
          .addFields({ name: "What's this?", value: "Get roles for your favorite games and find other players!" })
          .setFooter({ text: "SPIDEY BOT • Gaming Community" });

        const gamingButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("claim_roles")
            .setLabel("🎮 SELECT GAMING ROLES")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🎯")
        );
        channel.send({ embeds: [gamingEmbed], components: [gamingButton] });
        return res.json({ success: true, message: "Gaming roles selector posted to #" + channel.name });

      case 'watchparty':
        const watchEmbed = new EmbedBuilder()
          .setColor(0x4ECDC4)
          .setTitle("🎬 WATCH PARTY ROLE SELECTION")
          .setDescription("✨ Join watch parties and stream together!\n\n*Click the button below to see available watch party roles*")
          .addFields({ name: "What's this?", value: "Get notified about watch parties and join streams with your community!" })
          .setFooter({ text: "SPIDEY BOT • Watch Party Community" });

        const watchButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("claim_watchparty")
            .setLabel("🎬 SELECT WATCH PARTY ROLES")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📺")
        );
        channel.send({ embeds: [watchEmbed], components: [watchButton] });
        return res.json({ success: true, message: "Watch party selector posted to #" + channel.name });

      case 'platform':
        const platformEmbed = new EmbedBuilder()
          .setColor(0x45B7D1)
          .setTitle("💻 PLATFORM ROLE SELECTION")
          .setDescription("✨ Select your gaming platforms!\n\n*Click the button below to see available platform roles*")
          .addFields({ name: "What's this?", value: "Tell everyone what platforms you game on and find crossplay buddies!" })
          .setFooter({ text: "SPIDEY BOT • Platform Community" });

        const platformButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("claim_platform")
            .setLabel("💻 SELECT PLATFORM ROLES")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🖥️")
        );
        channel.send({ embeds: [platformEmbed], components: [platformButton] });
        return res.json({ success: true, message: "Platform selector posted to #" + channel.name });

      case 'removeRoles':
        const removeEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle("🗑️ REMOVE ROLES")
          .setDescription("❌ Remove roles you no longer want!\n\n*Click the button below to manage your roles*")
          .addFields({ name: "What's this?", value: "Deselect roles and remove yourself from communities!" })
          .setFooter({ text: "SPIDEY BOT • Role Management" });

        const removeButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("remove_all_roles")
            .setLabel("🗑️ REMOVE ROLES")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("❌")
        );
        channel.send({ embeds: [removeEmbed], components: [removeButton] });
        return res.json({ success: true, message: "Remove roles message posted to #" + channel.name });

      case 'levelRoles':
        // Create 100 level roles with gradient colors
        const guildConfig = loadConfig().guilds[guildId] || {};
        const levelRoles = {};
        let created = 0;

        const botRole = guild.members.me?.roles.highest;
        
        // Color gradient function
        const colorGradient = (level) => {
          const hue = (level / 100) * 360;
          const h = hue / 60;
          const c = 255;
          const x = c * (1 - Math.abs((h % 2) - 1));
          let r = 0, g = 0, b = 0;
          if (h >= 0 && h < 1) [r, g, b] = [c, x, 0];
          else if (h >= 1 && h < 2) [r, g, b] = [x, c, 0];
          else if (h >= 2 && h < 3) [r, g, b] = [0, c, x];
          else if (h >= 3 && h < 4) [r, g, b] = [0, x, c];
          else if (h >= 4 && h < 5) [r, g, b] = [x, 0, c];
          else [r, g, b] = [c, 0, x];
          return (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b);
        };

        // Numbered emoji function
        const getNumberedEmoji = (num) => {
          const numbers = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'];
          if (num < 10) return numbers[num];
          const tens = Math.floor(num / 10);
          const ones = num % 10;
          return numbers[tens] + numbers[ones];
        };

        // Post initial status message
        const levelStatusEmbed = new EmbedBuilder()
          .setColor(0x00D4FF)
          .setTitle("🎖️ Creating Level Roles (1-100)")
          .setDescription("⏳ This may take a few moments...\n\nCreating roles with gradient colors...");
        
        channel.send({ embeds: [levelStatusEmbed] }).catch(() => {});

        // Create roles asynchronously
        (async () => {
          try {
            for (let level = 1; level <= 100; level++) {
              try {
                const emoji = getNumberedEmoji(level);
                const roleName = `${emoji} Level ${level}`;

                const role = await guild.roles.create({
                  name: roleName,
                  color: colorGradient(level),
                  position: botRole ? botRole.position - 1 : 1
                });

                levelRoles[`level_${level}`] = role.id;
                created++;

                if (created % 20 === 0) {
                  console.log(`✅ Created ${created}/100 level roles`);
                }
              } catch (err) {
                console.error(`Failed to create level ${level} role: ${err.message}`);
              }
            }

            // Save to config
            const config = loadConfig();
            if (!config.guilds[guildId]) config.guilds[guildId] = {};
            config.guilds[guildId].levelRoles = levelRoles;
            fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

            // Post completion message
            const completedEmbed = new EmbedBuilder()
              .setColor(0x00D4FF)
              .setTitle("✅ Level Roles Created")
              .setDescription(`Successfully created **${created}/100** level roles with gradient colors!\n\nMembers will display their level badge next to their name as they level up.`);
            
            channel.send({ embeds: [completedEmbed] }).catch(() => {});
          } catch (err) {
            console.error('Error creating level roles:', err);
            const errorEmbed = new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle("❌ Error Creating Roles")
              .setDescription(`Failed to create all roles. Created: ${created}/100`);
            channel.send({ embeds: [errorEmbed] }).catch(() => {});
          }
        })();

        return res.json({ success: true, message: `Starting to create 100 level roles... (will create ${created} roles)` });

      default:
        return res.status(400).json({ error: "Unknown setup type" });
    }
  } catch (err) {
    console.error('Quick setup error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Web server listening on port ${PORT}`);
  console.log(`🔗 Public URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
});

// ============== ERROR & DISCONNECT HANDLERS (KEEP BOT ONLINE) ==============
// Handle client errors
client.on('error', err => {
  console.error('❌ Discord client error:', err);
});

// Handle disconnections and attempt auto-reconnect
client.on('disconnect', () => {
  console.warn('⚠️  Bot disconnected from Discord. Attempting to reconnect...');
  setTimeout(() => {
    if (!client.isReady()) {
      client.login(token).catch(err => console.error('Reconnection failed:', err));
    }
  }, 5000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // Don't exit - keep process alive
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - keep process alive
});

// ============== LOGIN ==============
if (token && typeof token === 'string' && token.length > 0) {
  client.login(token).catch(err => {
    console.error('❌ Discord login error:', err);
    console.log('⏰ Retrying login in 10 seconds...');
    setTimeout(() => {
      client.login(token).catch(err => console.error('Second login attempt failed:', err));
    }, 10000);
  });
} else {
  console.log('⚠️  No Discord `TOKEN` provided — skipping bot login. Web server remains available.');
}
