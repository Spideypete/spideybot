// src/features/server-guard/server-guard.handler.cjs
// Server Guard Handler - Discord event handlers for security features

const {
  getServerGuardConfig,
  isFeatureEnabled,
  isWhitelisted
} = require('./server-guard.service.cjs');

const PHISH_DOMAINS = [
  'discord-nitro.gift',
  'discordgift.site',
  'steamcommunlty.com',
  'dlscord.gift',
  'dlscord-nitro.com',
  'free-nitro.com',
  'discord-airdrop.com',
  'discordapp.gift',
  'nitro-discord.com',
  'discordgift.ru',
  'discord- Nitro.com',
  'steamcomminity.com',
  'steamcornmunity.com',
  'discordsteam.com',
  'discord-airdrop.net',
  'discord-nitro.net',
  'free-discord-nitro.com'
];

function sendAuditLog(guild, guildConfig, title, description, color) {
  const al = guildConfig.auditLog || {};
  if (al.enabled === false) return;
  const ch = al.channel ? guild.channels.cache.get(al.channel) : null;
  if (!ch) return;
  
  const { EmbedBuilder } = require('discord.js');
  const embed = new EmbedBuilder()
    .setColor(color || 0xED4245)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
  
  ch.send({ embeds: [embed] }).catch(() => {});
}

function logModAction(guild, action, mod, target, reason) {
  const guildConfig = getServerGuardConfig(guild.id);
  const { EmbedBuilder } = require('discord.js');
  
  const modLogChannel = guild.channels.cache.find(
    ch => ch.name && ch.name.toLowerCase().includes('mod-log')
  );
  
  if (!modLogChannel) return;
  
  const colorMap = {
    WARN: 0xFFBD39,
    KICK: 0xFF6B6B,
    BAN: 0xED4245,
    MUTE: 0xFFBD39
  };
  
  const embed = new EmbedBuilder()
    .setColor(colorMap[action] || 0x5865F2)
    .setTitle(`🛡️ ${action}`)
    .addFields(
      { name: 'Moderator', value: mod.tag || mod, inline: true },
      { name: 'Target', value: target, inline: true },
      { name: 'Reason', value: reason || 'No reason' }
    )
    .setTimestamp();
  
  modLogChannel.send({ embeds: [embed] }).catch(() => {});
}

function handleAntiSpam(message, client) {
  if (!message.guild) return;
  
  const config = getServerGuardConfig(message.guild.id);
  const antiSpam = config.antiSpam || {};
  if (antiSpam.enabled === false) return;
  
  const guildConfig = getServerGuardConfig(message.guild.id);
  if (isWhitelisted(message.guild.id, message.author.id)) return;
  
  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  
  if (!client.spamTracker) client.spamTracker = new Map();
  if (!client.spamTracker.has(key)) {
    client.spamTracker.set(key, { timestamps: [], warned: false });
  }
  
  const tracker = client.spamTracker.get(key);
  tracker.timestamps.push(now);
  tracker.timestamps = tracker.timestamps.filter(t => now - t < 5000);
  
  const limit = antiSpam.messagesPerLimit || 5;
  
  if (tracker.timestamps.length > limit) {
    const action = (antiSpam.action || 'warn').toLowerCase();
    
    try {
      if (action === 'ban') {
        message.member.ban({ reason: 'SpideyBot Anti-Spam: exceeded message limit' })
          .then(() => {
            sendAuditLog(message.guild, guildConfig, '🛡️ Anti-Spam BAN', `${message.author.tag} was banned for spamming (${tracker.timestamps.length} msgs in 5s)`, 0xED4245);
            logModAction(message.guild, 'BAN', client.user, message.author.tag, 'Anti-Spam: exceeded message limit');
          })
          .catch(err => console.error('Anti-spam ban failed:', err.message));
      } else if (action === 'kick') {
        message.member.kick('SpideyBot Anti-Spam: exceeded message limit')
          .then(() => {
            sendAuditLog(message.guild, guildConfig, '🛡️ Anti-Spam KICK', `${message.author.tag} was kicked for spamming (${tracker.timestamps.length} msgs in 5s)`, 0xFF6B6B);
            logModAction(message.guild, 'KICK', client.user, message.author.tag, 'Anti-Spam: exceeded message limit');
          })
          .catch(err => console.error('Anti-spam kick failed:', err.message));
      } else if (action === 'mute') {
        message.member.timeout(5 * 60 * 1000, 'SpideyBot Anti-Spam: exceeded message limit')
          .then(() => {
            sendAuditLog(message.guild, guildConfig, '🛡️ Anti-Spam MUTE', `${message.author.tag} was timed out for spamming (${tracker.timestamps.length} msgs in 5s)`, 0xFFBD39);
            logModAction(message.guild, 'MUTE', client.user, message.author.tag, 'Anti-Spam: 5min timeout');
          })
          .catch(err => console.error('Anti-spam mute failed:', err.message));
      } else {
        if (!tracker.warned) {
          message.reply('⚠️ **Slow down!** You are sending messages too fast.')
            .then(() => {
              sendAuditLog(message.guild, guildConfig, '🛡️ Anti-Spam WARN', `${message.author.tag} warned for spamming (${tracker.timestamps.length} msgs in 5s)`, 0xFFBD39);
              logModAction(message.guild, 'WARN', client.user, message.author.tag, 'Anti-Spam: sending messages too fast');
            })
            .catch(() => {});
          tracker.warned = true;
          setTimeout(() => { tracker.warned = false; }, 10000);
        }
      }
    } catch (e) {
      console.error('Anti-spam action failed:', e.message);
    }
    
    tracker.timestamps = [];
  }
}

function handleLinkScanning(message, client) {
  if (!message.guild) return;
  
  const config = getServerGuardConfig(message.guild.id);
  const linkScanning = config.linkScanning || {};
  if (linkScanning.enabled === false) return;
  
  const guildConfig = getServerGuardConfig(message.guild.id);
  if (isWhitelisted(message.guild.id, message.author.id)) return;
  
  const urlRegex = /https?:\/\/([^\s\/]+)/gi;
  let match;
  
  while ((match = urlRegex.exec(message.content)) !== null) {
    const domain = match[1].toLowerCase();
    let blocked = false;
    let reason = '';
    
    if (linkScanning.detectPhishing !== false && PHISH_DOMAINS.some(p => domain.includes(p))) {
      blocked = true;
      reason = 'Phishing link detected';
    }
    
    if (linkScanning.blockScamSites !== false && (
      domain.includes('free-nitro') ||
      domain.includes('gift-discord') ||
      domain.includes('steam-community') ||
      domain.includes('robux-free') ||
      domain.includes('nitro-gift') ||
      domain.includes('discord-free')
    )) {
      blocked = true;
      reason = 'Scam site blocked';
    }
    
    if (linkScanning.blockScamSites !== false && (
      domain.includes('discord.gg') ||
      domain.includes('discordapp.com/invite') ||
      domain.includes('discord.com/invite')
    )) {
      blocked = true;
      reason = 'Unauthorized invite link';
    }
    
    if (blocked) {
      try {
        message.delete().catch(() => {});
        message.channel.send(`🚫 **Link blocked** — ${reason}. Message from ${message.author} was removed.`)
          .catch(() => {});
        sendAuditLog(message.guild, guildConfig, '🔗 Link Blocked', `**User:** ${message.author.tag}\n**Reason:** ${reason}\n**Domain:** ${domain}`, 0xED4245);
      } catch (e) {
        console.error('Link scan action failed:', e.message);
      }
      return true;
    }
  }
  
  return false;
}

function handleRateLimiting(message, client) {
  if (!message.guild) return;
  
  const config = getServerGuardConfig(message.guild.id);
  const rateLimiting = config.rateLimiting || {};
  if (rateLimiting.enabled === false) return;
  
  const guildConfig = getServerGuardConfig(message.guild.id);
  if (isWhitelisted(message.guild.id, message.author.id)) return;
  
  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  
  if (!client.userRateLimit) client.userRateLimit = new Map();
  if (!client.userRateLimit.has(key)) {
    client.userRateLimit.set(key, { timestamps: [] });
  }
  
  const rl = client.userRateLimit.get(key);
  rl.timestamps.push(now);
  rl.timestamps = rl.timestamps.filter(t => now - t < 60000);
  
  const perMin = rateLimiting.requestsPerMin || 100;
  
  if (rl.timestamps.length > perMin) {
    const action = (rateLimiting.action || 'throttle').toLowerCase();
    
    try {
      if (action === 'kick') {
        message.member.kick('SpideyBot Rate Limit exceeded')
          .then(() => {
            sendAuditLog(message.guild, guildConfig, '📊 Rate Limit KICK', `${message.author.tag} kicked for exceeding ${perMin} msgs/min`, 0xFF6B6B);
          })
          .catch(err => console.error('Rate limit kick failed:', err.message));
      } else if (action === 'block') {
        message.member.timeout(10 * 60 * 1000, 'SpideyBot Rate Limit: temp block')
          .then(() => {
            sendAuditLog(message.guild, guildConfig, '📊 Rate Limit BLOCK', `${message.author.tag} blocked 10min for exceeding ${perMin} msgs/min`, 0xFFBD39);
          })
          .catch(err => console.error('Rate limit block failed:', err.message));
      } else {
        message.member.timeout(60 * 1000, 'SpideyBot Rate Limit: throttle')
          .then(() => {
            sendAuditLog(message.guild, guildConfig, '📊 Rate Limit Throttle', `${message.author.tag} throttled for exceeding ${perMin} msgs/min`, 0xFFBD39);
          })
          .catch(err => console.error('Rate limit throttle failed:', err.message));
      }
    } catch (e) {
      console.error('Rate limit action failed:', e.message);
    }
    
    rl.timestamps = [];
  }
}

function handleProfanityFilter(message, client) {
  if (!message.guild) return;
  
  const config = getServerGuardConfig(message.guild.id);
  const profanityFilter = config.profanityFilter || {};
  if (profanityFilter.enabled === false) return;
  
  const guildConfig = getServerGuardConfig(message.guild.id);
  if (isWhitelisted(message.guild.id, message.author.id)) return;
  
  const badWords = config.badWords || [];
  if (badWords.length === 0) return;
  
  const contentLower = message.content.toLowerCase();
  const matchedWord = badWords.find(word => contentLower.includes(word.toLowerCase()));
  
  if (matchedWord) {
    const action = (profanityFilter.action || 'delete').toLowerCase();
    
    try {
      if (action === 'delete' || action === 'mute') {
        message.delete().catch(() => {});
      }
      
      if (action === 'mute') {
        message.member.timeout(5 * 60 * 1000, `SpideyBot Profanity Filter: used banned word`)
          .catch(err => console.error('Profanity mute failed:', err.message));
      }
      
      if (action === 'kick') {
        message.member.kick('SpideyBot Profanity Filter: used banned word')
          .catch(err => console.error('Profanity kick failed:', err.message));
      }
      
      if (action === 'ban') {
        message.member.ban({ reason: 'SpideyBot Profanity Filter: repeated banned words' })
          .catch(err => console.error('Profanity ban failed:', err.message));
      }
      
      message.channel.send(`⚠️ Profanity filter triggered. Your message was removed.`)
        .catch(() => {});
      
      sendAuditLog(message.guild, guildConfig, '🤬 Profanity Filter', `${message.author.tag} used banned word: "${matchedWord}"`, 0xFF6B6B);
    } catch (e) {
      console.error('Profanity filter action failed:', e.message);
    }
    
    return true;
  }
  
  return false;
}

async function handleAntiNukeRoleDelete(role, client) {
  if (!role.guild) return;
  
  const config = getServerGuardConfig(role.guild.id);
  const antiNuke = config.antiNuke || {};
  if (antiNuke.enabled === false) return;
  
  const guildConfig = getServerGuardConfig(role.guild.id);
  
  try {
    const auditLogs = await role.guild.fetchAuditLogs({ type: 32, limit: 1 });
    const entry = auditLogs.entries.first();
    
    if (entry && entry.executor && !entry.executor.bot) {
      const key = `${role.guild.id}:${entry.executor.id}`;
      const now = Date.now();
      
      if (!client.nukeTracker) client.nukeTracker = new Map();
      if (!client.nukeTracker.has(key)) {
        client.nukeTracker.set(key, { actions: [] });
      }
      
      const nt = client.nukeTracker.get(key);
      nt.actions.push(now);
      nt.actions = nt.actions.filter(t => now - t < 30000);
      
      const maxActions = antiNuke.maxActions || 10;
      
      if (nt.actions.length >= maxActions) {
        sendAuditLog(role.guild, guildConfig, '🚨 ANTI-NUKE TRIGGERED', `**${entry.executor.tag}** deleted ${nt.actions.length} roles in 30s!`, 0xED4245);
        
        if (antiNuke.mode === 'lockdown') {
          const member = role.guild.members.cache.get(entry.executor.id);
          if (member && member.manageable) {
            member.roles.set([], 'Anti-Nuke: mass role deletion')
              .then(() => member.timeout(24 * 60 * 60 * 1000, 'Anti-Nuke: mass role deletion'))
              .catch(err => console.error('Anti-nuke lockdown failed:', err.message));
          }
        }
        
        nt.actions = [];
      }
    }
  } catch (e) {
    console.error('Anti-nuke role delete check failed:', e.message);
  }
}

async function handleAntiNukeChannelDelete(channel, client) {
  if (!channel.guild) return;
  
  const config = getServerGuardConfig(channel.guild.id);
  const antiNuke = config.antiNuke || {};
  if (antiNuke.enabled === false) return;
  
  const guildConfig = getServerGuardConfig(channel.guild.id);
  
  try {
    const auditLogs = await channel.guild.fetchAuditLogs({ type: 12, limit: 1 });
    const entry = auditLogs.entries.first();
    
    if (entry && entry.executor && !entry.executor.bot) {
      const key = `${channel.guild.id}:${entry.executor.id}`;
      const now = Date.now();
      
      if (!client.nukeTracker) client.nukeTracker = new Map();
      if (!client.nukeTracker.has(key)) {
        client.nukeTracker.set(key, { actions: [] });
      }
      
      const nt = client.nukeTracker.get(key);
      nt.actions.push(now);
      nt.actions = nt.actions.filter(t => now - t < 30000);
      
      const maxActions = antiNuke.maxActions || 10;
      
      if (nt.actions.length >= maxActions) {
        sendAuditLog(channel.guild, guildConfig, '🚨 ANTI-NUKE TRIGGERED', `**${entry.executor.tag}** performed ${nt.actions.length} destructive actions in 30s!\nAction: Channel deletion`, 0xED4245);
        
        if (antiNuke.mode === 'lockdown') {
          const member = channel.guild.members.cache.get(entry.executor.id);
          if (member && member.manageable) {
            member.roles.set([], 'SpideyBot Anti-Nuke: lockdown')
              .then(() => member.timeout(24 * 60 * 60 * 1000, 'Anti-Nuke: mass destructive actions'))
              .catch(err => console.error('Anti-nuke lockdown failed:', err.message));
          }
        }
        
        nt.actions = [];
      }
    }
  } catch (e) {
    console.error('Anti-nuke channel delete check failed:', e.message);
  }
}

async function handleAntiNukeBanAdd(ban, client) {
  if (!ban.guild) return;
  
  const config = getServerGuardConfig(ban.guild.id);
  const antiNuke = config.antiNuke || {};
  if (antiNuke.enabled === false) return;
  
  const guildConfig = getServerGuardConfig(ban.guild.id);
  
  try {
    const auditLogs = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 });
    const entry = auditLogs.entries.first();
    
    if (entry && entry.executor && !entry.executor.bot) {
      const key = `${ban.guild.id}:${entry.executor.id}`;
      const now = Date.now();
      
      if (!client.nukeTracker) client.nukeTracker = new Map();
      if (!client.nukeTracker.has(key)) {
        client.nukeTracker.set(key, { actions: [] });
      }
      
      const nt = client.nukeTracker.get(key);
      nt.actions.push(now);
      nt.actions = nt.actions.filter(t => now - t < 30000);
      
      const maxActions = antiNuke.maxActions || 10;
      
      if (nt.actions.length >= maxActions) {
        sendAuditLog(ban.guild, guildConfig, '🚨 ANTI-NUKE: MASS BAN', `**${entry.executor.tag}** banned ${nt.actions.length} users in 30s!`, 0xED4245);
        
        if (antiNuke.mode === 'lockdown') {
          const member = ban.guild.members.cache.get(entry.executor.id);
          if (member && member.manageable) {
            member.roles.set([], 'Anti-Nuke: mass banning')
              .then(() => member.timeout(24 * 60 * 60 * 1000, 'Anti-Nuke: mass banning'))
              .catch(err => console.error('Anti-nuke lockdown failed:', err.message));
          }
        }
        
        nt.actions = [];
      }
    }
  } catch (e) {
    console.error('Anti-nuke ban check failed:', e.message);
  }
}

function handleJoinGate(member, client) {
  if (!member.guild) return;
  
  const config = getServerGuardConfig(member.guild.id);
  const joinGate = config.joinGate || {};
  if (joinGate.enabled === false) return;
  
  const guildConfig = getServerGuardConfig(member.guild.id);
  
  const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  const minAge = joinGate.minAccountAge || 3;
  let kicked = false;
  let reason = '';
  
  if (joinGate.accountAgeCheck !== false && accountAgeDays < minAge) {
    kicked = true;
    reason = `Account too new (${Math.floor(accountAgeDays)} days old, minimum: ${minAge})`;
  }
  
  if (!kicked && joinGate.suspiciousAvatars !== false && !member.user.avatar) {
    if (accountAgeDays < 7) {
      kicked = true;
      reason = 'Suspicious: new account with no avatar';
    }
  }
  
  if (!kicked && joinGate.usernameAnalysis !== false) {
    const uname = member.user.username.toLowerCase();
    if (
      uname.includes('discord.gg') ||
      uname.includes('http') ||
      /^[a-z]{1,2}\d{6,}$/.test(uname) ||
      uname.includes('free nitro') ||
      uname.includes('nitro') && uname.includes('free')
    ) {
      kicked = true;
      reason = 'Suspicious username pattern detected';
    }
  }
  
  if (kicked) {
    try {
      member.kick(reason)
        .then(() => {
          sendAuditLog(member.guild, guildConfig, '🚪 Join Gate KICK', `**${member.user.tag}** was kicked\n**Reason:** ${reason}`, 0xFF6B6B);
        })
        .catch(err => console.error('Join gate kick failed:', err.message));
    } catch (e) {
      console.error('Join gate action failed:', e.message);
    }
    
    return true;
  }
  
  return false;
}

function initialize(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    const config = getServerGuardConfig(message.guild.id);
    
    if (message.member && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      handleAntiSpam(message, client);
      handleLinkScanning(message, client);
      handleRateLimiting(message, client);
      handleProfanityFilter(message, client);
    }
  });
  
  client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;
    await handleJoinGate(member, client);
  });
  
  client.on('roleDelete', async (role) => {
    await handleAntiNukeRoleDelete(role, client);
  });
  
  client.on('channelDelete', async (channel) => {
    if (channel.isDMBased()) return;
    await handleAntiNukeChannelDelete(channel, client);
  });
  
  client.on('guildBanAdd', async (ban) => {
    await handleAntiNukeBanAdd(ban, client);
  });
}

module.exports = {
  initialize,
  handleAntiSpam,
  handleLinkScanning,
  handleRateLimiting,
  handleProfanityFilter,
  handleAntiNukeRoleDelete,
  handleAntiNukeChannelDelete,
  handleAntiNukeBanAdd,
  handleJoinGate
};
