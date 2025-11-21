// index.cjs - SPIDEY BOT - Multi-Server Configurable Discord Bot

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require("discord.js");
const { Player } = require("discord-player");
const { DefaultExtractors } = require("@discord-player/extractor");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const axios = require("axios");

// ============== DISCORD OAUTH CONFIG ==============
// Render URL: https://spideybot-90sr.onrender.com/auth/discord/callback
const DISCORD_CLIENT_ID = process.env.CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "default_secret";
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.RENDER_DEPLOY_URL;
const REPLIT_URL = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS}` : null;
const REDIRECT_URI = RENDER_URL ? `${RENDER_URL}/auth/discord/callback` : (REPLIT_URL ? `${REPLIT_URL}/auth/discord/callback` : "http://localhost:5000/auth/discord/callback");

console.log(`🔐 OAuth Redirect URI: ${REDIRECT_URI}`);

// ============== CONFIG MANAGEMENT ==============
const configFile = path.join(__dirname, "config.json");

function logModAction(guild, action, mod, target, reason) {
  const config = loadConfig();
  const guildConfig = config.guilds[guild.id];
  if (!guildConfig?.modLogChannelId) return;
  
  const modLogChannel = guild.channels.cache.get(guildConfig.modLogChannelId);
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
      prefix: "//",
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

// ============== CLIENT SETUP ==============
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
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
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity("🎵 Music & Roles", { type: "WATCHING" });
  player.on("error", (queue, error) => {
    console.error("Music player error:", error);
  });
});

// ============== WELCOME NEW MEMBERS ==============
client.on("guildMemberAdd", async (member) => {
  console.log(`New member joined: ${member.user.tag} in ${member.guild.name}`);
  
  const guildConfig = getGuildConfig(member.guild.id);
  if (!guildConfig.welcomeChannelId) return;

  const welcomeChannel = member.guild.channels.cache.get(guildConfig.welcomeChannelId);
  if (welcomeChannel) {
    try {
      let message = guildConfig.welcomeMessage || "Welcome to our server! 🎉";
      message = message
        .replace(/{user}/g, member.toString())
        .replace(/{username}/g, member.user.username)
        .replace(/{displayname}/g, member.displayName)
        .replace(/{server}/g, member.guild.name)
        .replace(/{membercount}/g, member.guild.memberCount);
      
      await welcomeChannel.send(message);
      console.log(`Welcome message sent to ${member.user.tag}`);
    } catch (error) {
      console.error(`Failed to send welcome: ${error.message}`);
    }
  }
});

// ============== MESSAGE COMMANDS ==============
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  const guildConfig = getGuildConfig(msg.guild.id);

  // ============== AUTO XP GAIN ==============
  if (!msg.content.startsWith("//")) {
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
          console.error(`Failed to manage level roles: ${err.message}`);
        }
      }
      
      updateGuildConfig(msg.guild.id, { levels });
    }
  }

  // Bot Status
  if (msg.content === "//ping") {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const guilds = client.guilds.cache.size;
    const activeQueues = player.queues.size;
    
    const statusEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
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
  if (msg.content === "//list-roles") {
    const categories = guildConfig.roleCategories || {};
    if (Object.keys(categories).length === 0) {
      return msg.reply("❌ No role categories created yet! Use `//create-category [name]` to get started.");
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
      .setColor(0x5865F2)
      .setTitle("📋 Active Role Categories")
      .setDescription("🎬 = Has a banner image")
      .addFields(...fields)
      .setFooter({ text: "SPIDEY BOT" });
    return msg.reply({ embeds: [rolesEmbed] });
  }

  // Create a new category
  if (msg.content.startsWith("//create-category ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can create categories!");
    }
    const categoryName = msg.content.slice(18).trim();
    if (!categoryName) return msg.reply("Usage: //create-category [name]");
    const categories = guildConfig.roleCategories || {};
    if (categories[categoryName]) return msg.reply(`❌ Category "${categoryName}" already exists!`);
    categories[categoryName] = { roles: [], banner: null };
    updateGuildConfig(msg.guild.id, { roleCategories: categories });
    return msg.reply(`✅ Created category: **${categoryName}**\n\n*Tip: Use \`//set-category-banner ${categoryName} [gif-url]\` to add a banner!*`);
  }

  // Add a role to a category
  if (msg.content.startsWith("//add-role ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const args = msg.content.slice(11).trim().split(" ");
    const categoryName = args[0];
    const roleName = args[1];
    const roleId = args[2];
    if (!categoryName || !roleName || !roleId) {
      return msg.reply("Usage: //add-role [category] [role name] [role ID]\n\nExample: //add-role Gaming Minecraft 123456789");
    }
    const categories = guildConfig.roleCategories || {};
    if (!categories[categoryName]) return msg.reply(`❌ Category "${categoryName}" doesn't exist! Use //create-category first.`);
    const catData = Array.isArray(categories[categoryName]) ? { roles: categories[categoryName], banner: null } : categories[categoryName];
    if (catData.roles.some(r => r.name === roleName)) {
      return msg.reply(`❌ Role "${roleName}" already in this category!`);
    }
    catData.roles.push({ name: roleName, id: roleId });
    categories[categoryName] = catData;
    updateGuildConfig(msg.guild.id, { roleCategories: categories });
    return msg.reply(`✅ Added **${roleName}** to category **${categoryName}**`);
  }

  // Remove a role from a category
  if (msg.content.startsWith("//remove-role ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const args = msg.content.slice(14).trim().split(" ");
    const categoryName = args[0];
    const roleName = args[1];
    if (!categoryName || !roleName) {
      return msg.reply("Usage: //remove-role [category] [role name]");
    }
    const categories = guildConfig.roleCategories || {};
    if (!categories[categoryName]) return msg.reply(`❌ Category "${categoryName}" not found!`);
    const catData = Array.isArray(categories[categoryName]) ? { roles: categories[categoryName], banner: null } : categories[categoryName];
    const index = catData.roles.findIndex(r => r.name === roleName);
    if (index === -1) return msg.reply(`❌ Role "${roleName}" not found in this category!`);
    catData.roles.splice(index, 1);
    categories[categoryName] = catData;
    updateGuildConfig(msg.guild.id, { roleCategories: categories });
    return msg.reply(`✅ Removed **${roleName}** from **${categoryName}**`);
  }

  // Set category banner
  if (msg.content.startsWith("//set-category-banner ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set banners!");
    }
    const args = msg.content.slice(22).trim().split(" ");
    const categoryName = args[0];
    const bannerUrl = args.slice(1).join(" ");
    if (!categoryName || !bannerUrl) {
      return msg.reply("Usage: //set-category-banner [category] [gif-url]\n\nExample: //set-category-banner Gaming https://example.com/gaming.gif");
    }
    const categories = guildConfig.roleCategories || {};
    if (!categories[categoryName]) return msg.reply(`❌ Category "${categoryName}" not found!`);
    const catData = Array.isArray(categories[categoryName]) ? { roles: categories[categoryName], banner: null } : categories[categoryName];
    catData.banner = bannerUrl;
    categories[categoryName] = catData;
    updateGuildConfig(msg.guild.id, { roleCategories: categories });
    return msg.reply(`✅ Banner set for **${categoryName}**!\n\n*Use \`//setup-category ${categoryName}\` to see it in action!*`);
  }

  // Delete a category
  if (msg.content.startsWith("//delete-category ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can delete categories!");
    }
    const categoryName = msg.content.slice(18).trim();
    if (!categoryName) return msg.reply("Usage: //delete-category [name]");
    const categories = guildConfig.roleCategories || {};
    if (!categories[categoryName]) return msg.reply(`❌ Category "${categoryName}" not found!`);
    delete categories[categoryName];
    updateGuildConfig(msg.guild.id, { roleCategories: categories });
    return msg.reply(`✅ Deleted category: **${categoryName}**`);
  }

  // ============== ECONOMY SYSTEM ==============
  if (msg.content === "//balance") {
    const economy = guildConfig.economy || {};
    const balance = economy[msg.author.id] || 0;
    const balanceEmbed = new EmbedBuilder()
      .setColor(0x9146FF)
      .setTitle("💰 Your Balance")
      .setDescription(`You have **${balance} coins** 🪙`)
      .setFooter({ text: "SPIDEY BOT Economy" });
    return msg.reply({ embeds: [balanceEmbed] });
  }

  if (msg.content === "//daily") {
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

  if (msg.content.startsWith("//work")) {
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

  if (msg.content.startsWith("//transfer ")) {
    const args = msg.content.slice(11).trim().split(" ");
    const target = msg.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target || !amount || amount <= 0) return msg.reply("Usage: //transfer @user [amount]");
    const economy = guildConfig.economy || {};
    const senderBalance = economy[msg.author.id] || 0;
    if (senderBalance < amount) return msg.reply(`❌ Insufficient funds! You only have ${senderBalance} coins.`);
    economy[msg.author.id] = senderBalance - amount;
    economy[target.id] = (economy[target.id] || 0) + amount;
    updateGuildConfig(msg.guild.id, { economy });
    return msg.reply(`✅ Transferred **${amount} coins** to ${target.toString()}! 🪙`);
  }

  // ============== LEVELING SYSTEM ==============
  if (msg.content === "//level") {
    const levels = guildConfig.levels || {};
    const level = levels[msg.author.id] || 0;
    const xp = levels[msg.author.id + "_xp"] || 0;
    const levelEmbed = new EmbedBuilder()
      .setColor(0x9146FF)
      .setTitle("📊 Your Level")
      .addFields(
        { name: "Level", value: `${level}`, inline: true },
        { name: "XP", value: `${xp} / ${(level + 1) * 100}`, inline: true }
      )
      .setFooter({ text: "SPIDEY BOT Leveling" });
    return msg.reply({ embeds: [levelEmbed] });
  }

  if (msg.content === "//leaderboard") {
    const levels = guildConfig.levels || {};
    const sorted = Object.entries(levels)
      .filter(([k, v]) => !k.includes("_"))
      .map(([userId, level]) => ({ userId, level }))
      .sort((a, b) => b.level - a.level)
      .slice(0, 10);
    
    const leaderboardEmbed = new EmbedBuilder()
      .setColor(0x9146FF)
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
  if (msg.content.startsWith("//filter-toggle")) {
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
  if (msg.content.startsWith("//link-filter ")) {
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
  if (msg.content === "//ticket") {
    if (!guildConfig.ticketsEnabled) return msg.reply("❌ Ticket system is not enabled! Admin use: `//ticket-setup #channel`");
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
        .setColor(0x9146FF)
        .setTitle("🎫 Support Ticket Created")
        .setDescription(`Support team will be with you shortly!`)
        .addFields({ name: "User", value: msg.author.toString(), inline: true });
      
      ticketChannel.send({ embeds: [ticketEmbed] });
      return msg.reply(`✅ Ticket created: ${ticketChannel.toString()}`);
    } catch (error) {
      return msg.reply("❌ Failed to create ticket!");
    }
  }

  if (msg.content === "//close-ticket") {
    if (!msg.channel.name.startsWith("ticket-")) return msg.reply("❌ This is not a ticket channel!");
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) return msg.reply("❌ Only admins can close tickets!");
    msg.channel.delete().catch(() => {});
  }

  if (msg.content.startsWith("//ticket-setup ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can setup tickets!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: //ticket-setup #channel");
    updateGuildConfig(msg.guild.id, { ticketsEnabled: true, ticketChannelId: channel.id });
    return msg.reply(`✅ Ticket system enabled! Users can create tickets with \`//ticket\``);
  }

  // ============== CUSTOM COMMANDS ==============
  if (msg.content.startsWith("//addcmd ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can create custom commands!");
    }
    const args = msg.content.slice(9).trim().split("|");
    const cmdName = args[0]?.trim();
    const cmdResponse = args[1]?.trim();
    if (!cmdName || !cmdResponse) return msg.reply("Usage: //addcmd [command] | [response]\nExample: //addcmd hello | Hey there!");
    
    const customCmds = guildConfig.customCommands || {};
    customCmds[cmdName] = cmdResponse;
    updateGuildConfig(msg.guild.id, { customCommands: customCmds });
    return msg.reply(`✅ Custom command **${cmdName}** created! Use \`//${cmdName}\` to trigger it.`);
  }

  if (msg.content.startsWith("//delcmd ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can delete custom commands!");
    }
    const cmdName = msg.content.slice(9).trim();
    if (!cmdName) return msg.reply("Usage: //delcmd [command]");
    
    const customCmds = guildConfig.customCommands || {};
    if (!customCmds[cmdName]) return msg.reply(`❌ Custom command **${cmdName}** not found!`);
    delete customCmds[cmdName];
    updateGuildConfig(msg.guild.id, { customCommands: customCmds });
    return msg.reply(`✅ Custom command **${cmdName}** deleted!`);
  }

  // Trigger custom commands
  const customCmds = guildConfig.customCommands || {};
  if (msg.content.startsWith("//") && msg.content.length > 2) {
    const cmdName = msg.content.slice(2).split(" ")[0];
    if (customCmds[cmdName]) {
      return msg.reply(customCmds[cmdName]);
    }
  }

  // ============== COMMUNITY TOOLS ==============
  if (msg.content === "//suggest") {
    return msg.reply("Usage: //suggest [your suggestion]");
  }

  if (msg.content.startsWith("//suggest ")) {
    const suggestion = msg.content.slice(10).trim();
    if (!suggestion) return msg.reply("Usage: //suggest [your suggestion]");
    const suggestionsChannel = guildConfig.suggestionsChannelId ? msg.guild.channels.cache.get(guildConfig.suggestionsChannelId) : null;
    if (!suggestionsChannel) return msg.reply("❌ Suggestions channel not configured! Admin needs to set it with `//config-suggestions #channel`");
    
    const suggestionEmbed = new EmbedBuilder()
      .setColor(0x9146FF)
      .setTitle("📝 New Suggestion")
      .setDescription(suggestion)
      .setAuthor({ name: msg.author.username, iconURL: msg.author.displayAvatarURL() })
      .setFooter({ text: "React with 👍 or 👎 to vote" });
    
    const suggestionMsg = await suggestionsChannel.send({ embeds: [suggestionEmbed] });
    await suggestionMsg.react("👍");
    await suggestionMsg.react("👎");
    return msg.reply("✅ Suggestion submitted!");
  }

  if (msg.content.startsWith("//config-suggestions ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure channels!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: //config-suggestions #channel");
    updateGuildConfig(msg.guild.id, { suggestionsChannelId: channel.id });
    return msg.reply(`✅ Suggestions channel set to ${channel}`);
  }

  if (msg.content.startsWith("//giveaway ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can create giveaways!");
    }
    const args = msg.content.slice(11).trim().split(" ");
    const prize = args[0];
    const duration = parseInt(args[1]) || 60;
    if (!prize) return msg.reply("Usage: //giveaway [prize] [duration in seconds]");
    
    const giveawayEmbed = new EmbedBuilder()
      .setColor(0x9146FF)
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
  if (msg.content === "//8ball") {
    const responses = ["Yes! 🎯", "No! ❌", "Maybe... 🤔", "Absolutely! ✅", "Not likely! 😅", "Ask again later 🔮", "Definitely! 💯", "I don't think so 👎"];
    return msg.reply(responses[Math.floor(Math.random() * responses.length)]);
  }

  if (msg.content === "//dice") {
    const roll = Math.floor(Math.random() * 6) + 1;
    return msg.reply(`🎲 You rolled a **${roll}**!`);
  }

  if (msg.content === "//coin") {
    const flip = Math.random() < 0.5 ? "Heads" : "Tails";
    return msg.reply(`🪙 **${flip}**!`);
  }

  if (msg.content === "//trivia") {
    const trivia = [
      { question: "What is the capital of France?", answer: "Paris" },
      { question: "What is 2 + 2?", answer: "4" },
      { question: "What is the largest planet?", answer: "Jupiter" }
    ];
    const q = trivia[Math.floor(Math.random() * trivia.length)];
    const triviaEmbed = new EmbedBuilder()
      .setColor(0x9146FF)
      .setTitle("🧠 Trivia Question")
      .setDescription(q.question)
      .setFooter({ text: `Answer: ${q.answer}` });
    return msg.reply({ embeds: [triviaEmbed] });
  }

  if (msg.content === "//rps") {
    return msg.reply("Usage: //rps [rock/paper/scissors]");
  }

  if (msg.content.startsWith("//rps ")) {
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
  if (msg.content === "//developers") {
    const developersEmbed = new EmbedBuilder()
      .setColor(0x9146FF)
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

  // Help - List general user commands
  if (msg.content === "//help") {
    const mainEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🤖 SPIDEY BOT - User Commands")
      .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✨ **General User Commands** ✨\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      .addFields(
        { name: "🎯 Admin?", value: "Use `//adminhelp` to see all administrator commands", inline: false }
      );

    const musicEmbed = new EmbedBuilder()
      .setColor(0x00D084)
      .setTitle("🎵 MUSIC PLAYER (5 commands)")
      .addFields(
        { name: "🎶 //play [song/url]", value: "Search & play from YouTube", inline: true },
        { name: "📊 //queue", value: "Show next 10 songs", inline: true },
        { name: "🔄 //loop", value: "Toggle queue repeat", inline: true },
        { name: "🔀 //shuffle", value: "Randomize the queue", inline: true },
        { name: "🔊 //volume [0-200]", value: "Adjust volume level", inline: true },
        { name: "🎛️ Button Controls", value: "⏮ Back | ⏸ Pause | ▶ Resume | ⏭ Skip | ⏹ Stop", inline: false }
      );

    const utilityEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle("📞 UTILITIES (5 commands)")
      .addFields(
        { name: "✅ //remove-roles", value: "Remove any roles you have", inline: true },
        { name: "🏓 //ping", value: "Check bot status & stats", inline: true },
        { name: "👑 //adminhelp", value: "View all admin commands (admins only)", inline: true },
        { name: "👨‍💻 //developers", value: "Meet the dev team & join Discord", inline: true },
        { name: "🎫 //ticket", value: "Create a support ticket", inline: true }
      );

    const economyEmbed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle("💰 ECONOMY (4 commands)")
      .addFields(
        { name: "💰 //balance", value: "Check your coin balance", inline: true },
        { name: "📅 //daily", value: "Claim 100 coins daily", inline: true },
        { name: "💼 //work", value: "Work for coins (5 min cooldown)", inline: true },
        { name: "🔄 //transfer @user [amount]", value: "Send coins to others", inline: true }
      );

    const levelEmbed = new EmbedBuilder()
      .setColor(0x00D084)
      .setTitle("📊 LEVELING (3 commands)")
      .addFields(
        { name: "📈 //level", value: "Check your level & XP", inline: true },
        { name: "🏆 //xpleaderboard", value: "View top members by level", inline: true },
        { name: "💡 Passive", value: "Gain 10-30 XP per minute chatting!", inline: true }
      );

    const funEmbed = new EmbedBuilder()
      .setColor(0xFF6B9D)
      .setTitle("🎮 FUN GAMES (5 commands)")
      .addFields(
        { name: "🎱 //8ball", value: "Ask the magic 8ball", inline: true },
        { name: "🎲 //dice", value: "Roll a dice (1-6)", inline: true },
        { name: "🪙 //coin", value: "Flip a coin", inline: true },
        { name: "🧠 //trivia", value: "Random trivia question", inline: true },
        { name: "✂️ //rps [rock/paper/scissors]", value: "Rock paper scissors", inline: true }
      )
      .setFooter({ text: "💡 Admins: Use //adminhelp for full command list" });

    return msg.reply({ 
      embeds: [mainEmbed, musicEmbed, utilityEmbed, economyEmbed, levelEmbed, funEmbed],
      content: "** **"
    });
  }

  // Admin Help - List only admin commands
  if (msg.content === "//adminhelp") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can view admin help!");
    }

    const adminMainEmbed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle("👑 ADMIN COMMAND GUIDE")
      .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🔐 **Administrator-Only Commands** 🔐\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      .addFields(
        { name: "📊 Admin Categories", value: "**5 Sections** with full server management tools", inline: false }
      );

    const adminRoleEmbed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle("🎭 ROLE CATEGORIES (7 commands)")
      .addFields(
        { name: "📌 //create-category [name]", value: "Create a custom role category", inline: true },
        { name: "➕ //add-role [cat] [name] [ID]", value: "Add role to category", inline: true },
        { name: "➖ //remove-role [cat] [name]", value: "Remove role from category", inline: true },
        { name: "🎬 //set-category-banner [cat] [url]", value: "Add GIF banner", inline: true },
        { name: "🔘 //setup-category [name]", value: "Post selector button with banner", inline: true },
        { name: "📋 //list-roles", value: "View all categories & roles", inline: true },
        { name: "🗑️ //delete-category [name]", value: "Delete entire category", inline: true }
      );

    const adminWelcomeEmbed = new EmbedBuilder()
      .setColor(0xE91E63)
      .setTitle("👋 WELCOME MESSAGES (2 commands)")
      .addFields(
        { name: "💬 //config-welcome-channel #channel", value: "Set welcome message channel", inline: true },
        { name: "✍️ //config-welcome-message [text]", value: "Create custom welcome message", inline: true },
        { name: "📝 Placeholders", value: "`{user}` `{username}` `{displayname}` `{server}` `{membercount}`", inline: false }
      );

    const adminConfigEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("⚙️ CONFIGURATION (2 commands)")
      .addFields(
        { name: "🔤 //set-prefix [prefix]", value: "Change command prefix", inline: true },
        { name: "📝 //config-modlog #channel", value: "Set moderation log channel", inline: true }
      );

    const adminSocialEmbed = new EmbedBuilder()
      .setColor(0xFF1493)
      .setTitle("📱 SOCIAL MEDIA (12 commands + API)")
      .addFields(
        { name: "🎮 //add-twitch-user [user]", value: "Add Twitch creator to monitor", inline: true },
        { name: "➖ //remove-twitch-user [user]", value: "Remove Twitch creator", inline: true },
        { name: "📋 //list-twitch-users", value: "View monitored Twitch creators", inline: true },
        { name: "📢 //config-twitch-channel #ch", value: "Set Twitch alert channel", inline: true },
        { name: "🎵 //add-tiktok-user [user]", value: "Add TikTok creator to monitor", inline: true },
        { name: "➖ //remove-tiktok-user [user]", value: "Remove TikTok creator", inline: true },
        { name: "📋 //list-tiktok-users", value: "View monitored TikTok creators", inline: true },
        { name: "📢 //config-tiktok-channel #ch", value: "Set TikTok alert channel", inline: true },
        { name: "🎮 //add-kick-user [user]", value: "Add Kick streamer to monitor", inline: true },
        { name: "➖ //remove-kick-user [user]", value: "Remove Kick streamer", inline: true },
        { name: "📋 //list-kick-users", value: "View monitored Kick streamers", inline: true },
        { name: "📢 //config-kick-channel #ch", value: "Set Kick alert channel", inline: true },
        { name: "🌐 WEB API", value: "Admin dashboard at `/admin` • 3 REST endpoints", inline: false }
      );

    const adminEconomyEmbed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle("💰 ECONOMY MANAGEMENT (3 commands)")
      .addFields(
        { name: "➕ //addmoney @user [amount]", value: "Give coins to member", inline: true },
        { name: "➖ //removemoney @user [amount]", value: "Remove coins from member", inline: true },
        { name: "🏆 //leaderboard", value: "View top richest members", inline: true }
      );

    const adminLevelEmbed = new EmbedBuilder()
      .setColor(0x00D084)
      .setTitle("📊 LEVEL ROLES (1 command)")
      .addFields(
        { name: "🎖️ //setup-level-roles", value: "Create 100 auto-assigned level roles (1-100) with emoji badges", inline: false },
        { name: "💡 How it works", value: "Members earn XP by chatting → Auto-get level role → Badge shows next to their name! Level badges have gradient colors", inline: false }
      );

    const adminProtectionEmbed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle("🛡️ PROTECTION & TOOLS (7 commands)")
      .addFields(
        { name: "🔗 //link-filter [on/off]", value: "Toggle link filtering", inline: true },
        { name: "🎫 //ticket-setup #channel", value: "Enable ticket system", inline: true },
        { name: "🎫 //ticket", value: "Create support ticket", inline: true },
        { name: "🔒 //close-ticket", value: "Close ticket channel", inline: true },
        { name: "➕ //addcmd [cmd] | [response]", value: "Create custom command", inline: true },
        { name: "➖ //delcmd [command]", value: "Delete custom command", inline: true },
        { name: "📂 Custom Commands", value: "Use //[yourcommand] to trigger", inline: true }
      );

    const adminModEmbed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle("🛡️ MODERATION (6 commands)")
      .addFields(
        { name: "👢 //kick @user [reason]", value: "Remove member from server", inline: true },
        { name: "🔨 //ban @user [reason]", value: "Permanently ban member", inline: true },
        { name: "⚠️ //warn @user [reason]", value: "Warn member (tracked!)", inline: true },
        { name: "🔇 //mute @user", value: "Timeout for 1 hour", inline: true },
        { name: "🔊 //unmute @user", value: "Remove timeout", inline: true },
        { name: "📋 //warnings @user", value: "View member's warning history", inline: true }
      )
      .setFooter({ text: "💡 All actions are auto-logged to your modlog channel" });

    return msg.reply({ 
      embeds: [adminMainEmbed, adminRoleEmbed, adminWelcomeEmbed, adminConfigEmbed, adminSocialEmbed, adminEconomyEmbed, adminLevelEmbed, adminModEmbed, adminProtectionEmbed],
      content: "** **"
    });
  }

  // ============== CONFIG COMMANDS ==============
  if (msg.content.startsWith("//config-welcome-channel ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure the bot!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Mention a channel: //config-welcome-channel #channel");
    updateGuildConfig(msg.guild.id, { welcomeChannelId: channel.id });
    return msg.reply(`✅ Welcome channel set to ${channel}`);
  }

  if (msg.content.startsWith("//config-welcome-message ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure the bot!");
    }
    const welcomeMsg = msg.content.slice(26).trim();
    if (!welcomeMsg) return msg.reply("Provide a message: //config-welcome-message Your message here\n\n**Available placeholders:**\n`{user}` - Member mention\n`{username}` - Username\n`{displayname}` - Display name\n`{server}` - Server name\n`{membercount}` - Total member count");
    updateGuildConfig(msg.guild.id, { welcomeMessage: welcomeMsg });
    return msg.reply(`✅ Welcome message updated!\n\n**Available placeholders:**\n\`{user}\` - ${msg.member.toString()}\n\`{username}\` - ${msg.author.username}\n\`{displayname}\` - ${msg.member.displayName}\n\`{server}\` - ${msg.guild.name}\n\`{membercount}\` - ${msg.guild.memberCount}`);
  }

  // Add game role
  if (msg.content.startsWith("//add-game-role ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const args = msg.content.slice(16).trim().split(" ");
    const roleName = args[0];
    const roleId = args[1];
    if (!roleName || !roleId) return msg.reply("Usage: //add-game-role [role name] [role ID]\n\nExample: //add-game-role Minecraft 123456789");
    const config = getGuildConfig(msg.guild.id);
    if (config.gameRoles.some(r => r.name === roleName)) return msg.reply("❌ Role already added!");
    config.gameRoles.push({ name: roleName, id: roleId });
    updateGuildConfig(msg.guild.id, { gameRoles: config.gameRoles });
    return msg.reply(`✅ Added game role: **${roleName}** (ID: ${roleId})`);
  }

  // Remove game role
  if (msg.content.startsWith("//remove-game-role ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const roleName = msg.content.slice(19).trim();
    if (!roleName) return msg.reply("Usage: //remove-game-role [role name]");
    const config = getGuildConfig(msg.guild.id);
    const index = config.gameRoles.findIndex(r => r.name === roleName);
    if (index === -1) return msg.reply("❌ Role not found!");
    config.gameRoles.splice(index, 1);
    updateGuildConfig(msg.guild.id, { gameRoles: config.gameRoles });
    return msg.reply(`✅ Removed game role: **${roleName}**`);
  }

  // Add watch party role
  if (msg.content.startsWith("//add-watchparty-role ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const args = msg.content.slice(22).trim().split(" ");
    const roleName = args[0];
    const roleId = args[1];
    if (!roleName || !roleId) return msg.reply("Usage: //add-watchparty-role [role name] [role ID]");
    const config = getGuildConfig(msg.guild.id);
    if (config.watchPartyRoles.some(r => r.name === roleName)) return msg.reply("❌ Role already added!");
    config.watchPartyRoles.push({ name: roleName, id: roleId });
    updateGuildConfig(msg.guild.id, { watchPartyRoles: config.watchPartyRoles });
    return msg.reply(`✅ Added watch party role: **${roleName}** (ID: ${roleId})`);
  }

  // Remove watch party role
  if (msg.content.startsWith("//remove-watchparty-role ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const roleName = msg.content.slice(25).trim();
    if (!roleName) return msg.reply("Usage: //remove-watchparty-role [role name]");
    const config = getGuildConfig(msg.guild.id);
    const index = config.watchPartyRoles.findIndex(r => r.name === roleName);
    if (index === -1) return msg.reply("❌ Role not found!");
    config.watchPartyRoles.splice(index, 1);
    updateGuildConfig(msg.guild.id, { watchPartyRoles: config.watchPartyRoles });
    return msg.reply(`✅ Removed watch party role: **${roleName}**`);
  }

  // Add platform role
  if (msg.content.startsWith("//add-platform-role ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const args = msg.content.slice(20).trim().split(" ");
    const roleName = args[0];
    const roleId = args[1];
    if (!roleName || !roleId) return msg.reply("Usage: //add-platform-role [role name] [role ID]");
    const config = getGuildConfig(msg.guild.id);
    if (config.platformRoles.some(r => r.name === roleName)) return msg.reply("❌ Role already added!");
    config.platformRoles.push({ name: roleName, id: roleId });
    updateGuildConfig(msg.guild.id, { platformRoles: config.platformRoles });
    return msg.reply(`✅ Added platform role: **${roleName}** (ID: ${roleId})`);
  }

  // Remove platform role
  if (msg.content.startsWith("//remove-platform-role ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can manage roles!");
    }
    const roleName = msg.content.slice(23).trim();
    if (!roleName) return msg.reply("Usage: //remove-platform-role [role name]");
    const config = getGuildConfig(msg.guild.id);
  // Setup category selector
  if (msg.content.startsWith("//setup-category ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set up roles!");
    }
    const categoryName = msg.content.slice(17).trim();
    if (!categoryName) return msg.reply("Usage: //setup-category [category name]");
    const categories = guildConfig.roleCategories || {};
    if (!categories[categoryName]) {
      return msg.reply(`❌ Category "${categoryName}" does not exist!`);
    }
    
    const catData = Array.isArray(categories[categoryName]) ? { roles: categories[categoryName], banner: null } : categories[categoryName];
    if (catData.roles.length === 0) {
      return msg.reply(`❌ Add roles with //add-role first!`);
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
    return msg.reply(`✅ Removed platform role: **${roleName}**`);
  }

  // Setup roles
  if (msg.content === "//setup-roles") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set up roles!");
    }
    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
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

  if (msg.content === "//setup-watchparty") {
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

  if (msg.content === "//setup-platform") {
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

  if (msg.content === "//remove-roles") {
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
  if (msg.content.startsWith("//play ")) {
    const query = msg.content.slice(7).trim();
    if (!query) return msg.reply("Usage: //play [song name or YouTube link]");

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
        .setColor(0x00FF00)
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

  if (msg.content === "//queue") {
    const queue = player.queues.get(msg.guild);
    if (!queue || !queue.isPlaying()) {
      return msg.reply("❌ No music is playing!");
    }

    const tracks = queue.tracks.slice(0, 10);
    const queueStr = tracks.length > 0 
      ? tracks.map((t, i) => `${i + 1}. [${t.title}](${t.url})`).join("\n")
      : "Queue is empty";

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🎵 Music Queue")
      .setDescription(queueStr);

    msg.reply({ embeds: [embed] });
  }

  // Music enhancements
  if (msg.content === "//loop") {
    const queue = player.queues.get(msg.guild);
    if (!queue || !queue.isPlaying()) {
      return msg.reply("❌ No music playing!");
    }
    const isLooping = queue.repeatMode === 2;
    queue.setRepeatMode(isLooping ? 0 : 2);
    return msg.reply(isLooping ? "🔄 Loop disabled" : "🔄 Loop enabled - queue will repeat!");
  }

  if (msg.content === "//shuffle") {
    const queue = player.queues.get(msg.guild);
    if (!queue || !queue.isPlaying()) {
      return msg.reply("❌ No music playing!");
    }
    queue.tracks.sort(() => Math.random() - 0.5);
    return msg.reply("🔀 Queue shuffled!");
  }

  if (msg.content.startsWith("//volume ")) {
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
  if (msg.content.startsWith("//kick ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return msg.reply("❌ You need kick permissions!");
    }
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: //kick @user [reason]");
    const reason = msg.content.slice(6).split(" ").slice(1).join(" ") || "No reason";
    try {
      await user.kick(reason);
      msg.reply(`✅ Kicked ${user.user.tag} - ${reason}`);
      logModAction(msg.guild, "KICK", msg.author, user.user.tag, reason);
    } catch (err) {
      msg.reply(`❌ Failed to kick: ${err.message}`);
    }
  }

  if (msg.content.startsWith("//ban ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return msg.reply("❌ You need ban permissions!");
    }
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: //ban @user [reason]");
    const reason = msg.content.slice(5).split(" ").slice(1).join(" ") || "No reason";
    try {
      await user.ban({ reason });
      msg.reply(`✅ Banned ${user.user.tag} - ${reason}`);
      logModAction(msg.guild, "BAN", msg.author, user.user.tag, reason);
    } catch (err) {
      msg.reply(`❌ Failed to ban: ${err.message}`);
    }
  }

  if (msg.content.startsWith("//warn ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return msg.reply("❌ You need moderation permissions!");
    }
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: //warn @user [reason]");
    const reason = msg.content.slice(6).split(" ").slice(1).join(" ") || "No reason";
    
    const warnings = guildConfig.warnings || {};
    if (!warnings[user.id]) warnings[user.id] = [];
    warnings[user.id].push({ reason, warnedBy: msg.author.tag, timestamp: new Date() });
    updateGuildConfig(msg.guild.id, { warnings });
    
    msg.reply(`⚠️ Warned ${user.user.tag} (${warnings[user.id].length} warnings) - ${reason}`);
    logModAction(msg.guild, "WARN", msg.author, user.user.tag, reason);
  }

  if (msg.content.startsWith("//mute ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return msg.reply("❌ You need moderation permissions!");
    }
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: //mute @user");
    try {
      await user.timeout(60 * 60 * 1000);
      msg.reply(`🔇 Muted ${user.user.tag} for 1 hour`);
      logModAction(msg.guild, "MUTE", msg.author, user.user.tag, "1 hour timeout");
    } catch (err) {
      msg.reply(`❌ Failed to mute: ${err.message}`);
    }
  }

  if (msg.content.startsWith("//unmute ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return msg.reply("❌ You need moderation permissions!");
    }
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: //unmute @user");
    try {
      await user.timeout(null);
      msg.reply(`🔊 Unmuted ${user.user.tag}`);
      logModAction(msg.guild, "UNMUTE", msg.author, user.user.tag, "Timeout removed");
    } catch (err) {
      msg.reply(`❌ Failed to unmute: ${err.message}`);
    }
  }

  if (msg.content.startsWith("//warnings ")) {
    const user = msg.mentions.members.first();
    if (!user) return msg.reply("Usage: //warnings @user");
    const warnings = guildConfig.warnings?.[user.id] || [];
    const warningList = warnings.map((w, i) => `${i+1}. ${w.reason} (by ${w.warnedBy})`).join("\n") || "No warnings";
    msg.reply(`⚠️ ${user.user.tag} has ${warnings.length} warning(s):\n${warningList}`);
  }

  // Config commands
  if (msg.content.startsWith("//set-prefix ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set prefix!");
    }
    const prefix = msg.content.slice(13).trim();
    if (!prefix || prefix.length > 5) return msg.reply("Usage: //set-prefix [prefix] (max 5 chars)");
    updateGuildConfig(msg.guild.id, { prefix });
    return msg.reply(`✅ Prefix changed to \`${prefix}\``);
  }

  if (msg.content.startsWith("//config-modlog")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure modlog!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: //config-modlog #channel");
    updateGuildConfig(msg.guild.id, { modLogChannelId: channel.id });
    return msg.reply(`✅ Modlog channel set to ${channel}`);
  }

  // Twitch & TikTok config
  if (msg.content.startsWith("//config-twitch-channel ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: //config-twitch-channel #channel");
    updateGuildConfig(msg.guild.id, { twitchChannelId: channel.id });
    return msg.reply(`✅ Twitch live notifications will post to ${channel}\n\n💡 *Note: Configure your Twitch webhook at: https://dev.twitch.tv/console*`);
  }

  if (msg.content.startsWith("//config-tiktok-channel ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: //config-tiktok-channel #channel");
    updateGuildConfig(msg.guild.id, { tiktokChannelId: channel.id });
    return msg.reply(`✅ TikTok post notifications will post to ${channel}\n\n💡 *Note: Configure your TikTok webhook at: https://developer.tiktok.com*`);
  }

  if (msg.content.startsWith("//add-twitch-user ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const twitchUser = msg.content.slice(18).trim().toLowerCase();
    if (!twitchUser) return msg.reply("Usage: //add-twitch-user [username]\nExample: //add-twitch-user xqc");
    const users = guildConfig.twitchUsers || [];
    if (users.includes(twitchUser)) return msg.reply(`❌ **${twitchUser}** is already being monitored!`);
    users.push(twitchUser);
    updateGuildConfig(msg.guild.id, { twitchUsers: users });
    return msg.reply(`✅ Added **${twitchUser}** to Twitch monitoring! (${users.length} total)`);
  }

  if (msg.content.startsWith("//remove-twitch-user ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const twitchUser = msg.content.slice(21).trim().toLowerCase();
    if (!twitchUser) return msg.reply("Usage: //remove-twitch-user [username]");
    const users = guildConfig.twitchUsers || [];
    const index = users.indexOf(twitchUser);
    if (index === -1) return msg.reply(`❌ **${twitchUser}** is not being monitored!`);
    users.splice(index, 1);
    updateGuildConfig(msg.guild.id, { twitchUsers: users });
    return msg.reply(`✅ Removed **${twitchUser}** from Twitch monitoring!`);
  }

  if (msg.content === "//list-twitch-users") {
    const users = guildConfig.twitchUsers || [];
    if (users.length === 0) return msg.reply("❌ No Twitch users being monitored! Use `//add-twitch-user [username]`");
    return msg.reply(`🎮 **Twitch Users Being Monitored:**\n${users.map((u, i) => `${i+1}. ${u}`).join("\n")}`);
  }

  if (msg.content.startsWith("//add-tiktok-user ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const tiktokUser = msg.content.slice(18).trim().toLowerCase();
    if (!tiktokUser) return msg.reply("Usage: //add-tiktok-user [username]\nExample: //add-tiktok-user charlidamelio");
    const users = guildConfig.tiktokUsers || [];
    if (users.includes(tiktokUser)) return msg.reply(`❌ **${tiktokUser}** is already being monitored!`);
    users.push(tiktokUser);
    updateGuildConfig(msg.guild.id, { tiktokUsers: users });
    return msg.reply(`✅ Added **${tiktokUser}** to TikTok monitoring! (${users.length} total)`);
  }

  if (msg.content.startsWith("//remove-tiktok-user ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const tiktokUser = msg.content.slice(21).trim().toLowerCase();
    if (!tiktokUser) return msg.reply("Usage: //remove-tiktok-user [username]");
    const users = guildConfig.tiktokUsers || [];
    const index = users.indexOf(tiktokUser);
    if (index === -1) return msg.reply(`❌ **${tiktokUser}** is not being monitored!`);
    users.splice(index, 1);
    updateGuildConfig(msg.guild.id, { tiktokUsers: users });
    return msg.reply(`✅ Removed **${tiktokUser}** from TikTok monitoring!`);
  }

  if (msg.content === "//list-tiktok-users") {
    const users = guildConfig.tiktokUsers || [];
    if (users.length === 0) return msg.reply("❌ No TikTok users being monitored! Use `//add-tiktok-user [username]`");
    return msg.reply(`📱 **TikTok Users Being Monitored:**\n${users.map((u, i) => `${i+1}. ${u}`).join("\n")}`);
  }

  if (msg.content.startsWith("//config-kick-channel ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const channel = msg.mentions.channels.first();
    if (!channel) return msg.reply("Usage: //config-kick-channel #channel");
    updateGuildConfig(msg.guild.id, { kickChannelId: channel.id });
    return msg.reply(`✅ Kick live notifications will post to ${channel}\n\n💡 *Note: Configure your Kick webhook at: https://developers.kick.com*`);
  }

  if (msg.content.startsWith("//add-kick-user ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const kickUser = msg.content.slice(16).trim().toLowerCase();
    if (!kickUser) return msg.reply("Usage: //add-kick-user [username]\nExample: //add-kick-user xqc");
    const users = guildConfig.kickUsers || [];
    if (users.includes(kickUser)) return msg.reply(`❌ **${kickUser}** is already being monitored!`);
    users.push(kickUser);
    updateGuildConfig(msg.guild.id, { kickUsers: users });
    return msg.reply(`✅ Added **${kickUser}** to Kick monitoring! (${users.length} total)`);
  }

  if (msg.content.startsWith("//remove-kick-user ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can configure!");
    }
    const kickUser = msg.content.slice(19).trim().toLowerCase();
    if (!kickUser) return msg.reply("Usage: //remove-kick-user [username]");
    const users = guildConfig.kickUsers || [];
    const index = users.indexOf(kickUser);
    if (index === -1) return msg.reply(`❌ **${kickUser}** is not being monitored!`);
    users.splice(index, 1);
    updateGuildConfig(msg.guild.id, { kickUsers: users });
    return msg.reply(`✅ Removed **${kickUser}** from Kick monitoring!`);
  }

  if (msg.content === "//list-kick-users") {
    const users = guildConfig.kickUsers || [];
    if (users.length === 0) return msg.reply("❌ No Kick users being monitored! Use `//add-kick-user [username]`");
    return msg.reply(`🎮 **Kick Users Being Monitored:**\n${users.map((u, i) => `${i+1}. ${u}`).join("\n")}`);
  }

  // ============== ECONOMY COMMANDS ==============
  if (msg.content === "//balance") {
    const economy = guildConfig.economy || {};
    const balance = economy[msg.author.id] || 0;
    return msg.reply(`💰 **${msg.author.username}** has **${balance}** coins!`);
  }

  if (msg.content === "//daily") {
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

  if (msg.content === "//work") {
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

  if (msg.content.startsWith("//transfer ")) {
    const target = msg.mentions.members.first();
    const amountStr = msg.content.split(" ").pop();
    const amount = parseInt(amountStr);
    
    if (!target) return msg.reply("Usage: //transfer @user [amount]");
    if (isNaN(amount) || amount <= 0) return msg.reply("Usage: //transfer @user [amount]\nAmount must be a positive number!");
    if (target.id === msg.author.id) return msg.reply("❌ You can't transfer to yourself!");
    
    const economy = guildConfig.economy || {};
    const senderBalance = economy[msg.author.id] || 0;
    
    if (senderBalance < amount) return msg.reply(`❌ You only have **${senderBalance}** coins! Need **${amount}**`);
    
    economy[msg.author.id] = senderBalance - amount;
    economy[target.id] = (economy[target.id] || 0) + amount;
    updateGuildConfig(msg.guild.id, { economy });
    
    return msg.reply(`✅ Transferred **${amount}** coins to ${target.user.tag}!\nYour new balance: **${economy[msg.author.id]}** 💰`);
  }

  if (msg.content.startsWith("//addmoney ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can add money!");
    }
    const target = msg.mentions.members.first();
    const amountStr = msg.content.split(" ").pop();
    const amount = parseInt(amountStr);
    
    if (!target) return msg.reply("Usage: //addmoney @user [amount]");
    if (isNaN(amount) || amount <= 0) return msg.reply("Amount must be a positive number!");
    
    const economy = guildConfig.economy || {};
    economy[target.id] = (economy[target.id] || 0) + amount;
    updateGuildConfig(msg.guild.id, { economy });
    
    return msg.reply(`✅ Added **${amount}** coins to ${target.user.tag}!\nNew balance: **${economy[target.id]}** 💰`);
  }

  if (msg.content.startsWith("//removemoney ")) {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can remove money!");
    }
    const target = msg.mentions.members.first();
    const amountStr = msg.content.split(" ").pop();
    const amount = parseInt(amountStr);
    
    if (!target) return msg.reply("Usage: //removemoney @user [amount]");
    if (isNaN(amount) || amount <= 0) return msg.reply("Amount must be a positive number!");
    
    const economy = guildConfig.economy || {};
    const currentBalance = economy[target.id] || 0;
    economy[target.id] = Math.max(0, currentBalance - amount);
    updateGuildConfig(msg.guild.id, { economy });
    
    return msg.reply(`✅ Removed **${amount}** coins from ${target.user.tag}!\nNew balance: **${economy[target.id]}** 💰`);
  }

  if (msg.content === "//leaderboard") {
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
  if (msg.content === "//level") {
    const levels = guildConfig.levels || {};
    const userXp = levels[msg.author.id] || 0;
    const level = Math.floor(userXp / 500) + 1;
    const xpInLevel = userXp % 500;
    const nextLevelXp = 500;
    
    const levelEmbed = new EmbedBuilder()
      .setColor(0x00D084)
      .setTitle(`📊 ${msg.author.username}'s Level`)
      .addFields(
        { name: "Level", value: `${level}`, inline: true },
        { name: "Total XP", value: `${userXp}`, inline: true },
        { name: "Progress", value: `${xpInLevel}/${nextLevelXp} XP`, inline: false }
      )
      .setThumbnail(msg.author.displayAvatarURL());
    
    return msg.reply({ embeds: [levelEmbed] });
  }

  if (msg.content === "//xpleaderboard") {
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
  if (msg.content === "//setup-level-roles") {
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
});

// ============== INTERACTIONS (BUTTONS & DROPDOWNS) ==============
client.on("interactionCreate", async (interaction) => {
  const guildConfig = getGuildConfig(interaction.guild.id);
  autoMigrateRoles(interaction.guild.id, interaction.guild, guildConfig);

  // Gaming roles
  if (interaction.isButton() && interaction.customId === "claim_roles") {
    const allRoles = Array.from(interaction.guild.roles.cache.values())
      .filter(r => !r.managed && r.name !== "@everyone")
      .sort((a, b) => b.position - a.position)
      .slice(0, 25)
      .map(r => ({ label: r.name, value: r.id }));
    
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

    let response = addedRoles.length > 0 ? `✅ Added: ${addedRoles.join(", ")}` : "";
    if (failedRoles.length > 0) response += `\n⚠️ Failed: ${failedRoles.join(", ")}`;

    return interaction.update({ content: response || "No roles added.", components: [] });
  }

  // Platform roles
  if (interaction.isButton() && interaction.customId === "claim_platform") {
    const config = getGuildConfig(interaction.guild.id);
    if (config.platformRoles.length === 0) {
      return interaction.reply({ content: "❌ No platform roles configured! Admin: use //add-platform-role [name] [roleID]", ephemeral: true });
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
  // Handle custom category role selections
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
          const roleData = config.roleCategories[categoryName].find(r => r.id === roleId);
          addedRoles.push(roleData.name);
        } catch (error) {
          failedRoles.push(roleId);
          console.error(`Failed to add role ${roleId}: ${error.message}`);
        }
      }
    }
    let response = addedRoles.length > 0 ? `✅ Added: ${addedRoles.join(", ")}` : "";
    if (failedRoles.length > 0) response += `
⚠️ Failed: ${failedRoles.length} roles`;
    return interaction.update({ content: response || "No roles added.", components: [] });
  }
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

    return interaction.update({ content: `✅ Removed: ${removedRoles.join(", ")}`, components: [] });
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
const app = express();
app.use(express.static('public'));
app.use(express.json());

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

// Support Chat Widget HTML with AI
const supportWidget = `
<style>
  .support-btn { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background: #9146FF; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 12px rgba(145, 70, 255, 0.4); z-index: 999; transition: all 0.3s; }
  .support-btn:hover { transform: scale(1.1); box-shadow: 0 6px 16px rgba(145, 70, 255, 0.6); }
  .support-modal { display: none; position: fixed; bottom: 100px; right: 20px; width: 380px; max-width: 90vw; background: #1a1a1a; border: 2px solid #9146FF; border-radius: 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 999; max-height: 600px; overflow: hidden; flex-direction: column; }
  .support-modal.active { display: flex !important; animation: slideUp 0.3s ease; }
  .support-modal.minimized { display: none !important; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .support-header { background: #9146FF; padding: 15px; color: white; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
  .support-header-buttons { display: flex; gap: 8px; }
  .support-header button { background: none; border: none; color: white; cursor: pointer; font-size: 18px; transition: all 0.3s; padding: 4px 8px; }
  .support-header button:hover { transform: scale(1.2); }
  .support-messages { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
  .support-message { padding: 10px 12px; border-radius: 8px; max-width: 85%; word-wrap: break-word; }
  .support-message.user { background: #9146FF; color: white; align-self: flex-end; }
  .support-message.bot { background: #333; color: #ddd; align-self: flex-start; }
  .support-input-area { padding: 12px; border-top: 1px solid #333; display: flex; gap: 8px; }
  .support-input-area input { flex: 1; background: #222; color: white; border: 1px solid #9146FF; border-radius: 5px; padding: 8px 12px; font-size: 0.9rem; }
  .support-input-area button { background: #9146FF; color: white; border: none; border-radius: 5px; padding: 8px 15px; cursor: pointer; font-weight: bold; transition: all 0.3s; }
  .support-input-area button:hover { background: #7C3AED; }
</style>
<div class="support-modal" id="supportModal">
  <div class="support-header">
    <span>🤖 SPIDEY Support AI</span>
    <div class="support-header-buttons">
      <button onclick="minimizeSupportModal()" title="Minimize">−</button>
      <button onclick="closeSupportModal()" title="Close">✕</button>
    </div>
  </div>
  <div class="support-messages" id="supportMessages">
    <div class="support-message bot">👋 Hey! I'm SPIDEY's AI assistant. Ask me anything about the bot!</div>
  </div>
  <div class="support-input-area">
    <input type="text" id="supportInput" placeholder="Ask me about SPIDEY BOT..." onkeypress="if(event.key==='Enter') sendSupportMessage()">
    <button onclick="sendSupportMessage()">Send</button>
  </div>
</div>
<button class="support-btn" onclick="toggleSupportModal()">💬</button>
<script>
let inactivityTimer = null;
function toggleSupportModal() { 
  const modal = document.getElementById('supportModal');
  if (modal.classList.contains('minimized')) {
    modal.classList.remove('minimized');
    modal.classList.add('active');
  } else {
    modal.classList.toggle('active');
  }
  resetInactivityTimer();
}
function minimizeSupportModal() { 
  document.getElementById('supportModal').classList.remove('active');
  document.getElementById('supportModal').classList.add('minimized');
}
function closeSupportModal() { 
  document.getElementById('supportModal').classList.remove('active');
  document.getElementById('supportModal').classList.add('minimized');
}
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    const modal = document.getElementById('supportModal');
    if (modal.classList.contains('active')) {
      minimizeSupportModal();
    }
  }, 300000);
}
async function sendSupportMessage() {
  const input = document.getElementById('supportInput');
  const message = input.value.trim();
  if (!message) return;
  const messagesDiv = document.getElementById('supportMessages');
  messagesDiv.innerHTML += '<div class="support-message user">' + escapeHtml(message) + '</div>';
  input.value = '';
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  resetInactivityTimer();
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
    const data = await res.json();
    messagesDiv.innerHTML += '<div class="support-message bot">' + escapeHtml(data.reply) + '</div>';
  } catch (e) {
    messagesDiv.innerHTML += '<div class="support-message bot">Sorry, I had an issue. Try again!</div>';
  }
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
function escapeHtml(text) { const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }; return text.replace(/[&<>"']/g, m => map[m]); }
document.addEventListener('click', (e) => {
  if (!e.target.closest('.support-modal') && !e.target.closest('.support-btn')) {
    resetInactivityTimer();
  }
});
</script>
`;

// Landing Page
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>SPIDEY BOT - Complete Discord Bot for Communities</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="SPIDEY BOT: Music player, moderation, economy, leveling, role management, social media monitoring, and 40+ commands. All-in-one Discord bot trusted by servers worldwide.">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html { scroll-behavior: smooth; }
          body { font-family: 'Inter', sans-serif; background: #0f0f0f; color: #fff; line-height: 1.6; }
          nav { background: rgba(20, 20, 20, 0.95); border-bottom: 1px solid #222; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; backdrop-filter: blur(10px); }
          nav img { height: 40px; }
          nav a { color: #999; text-decoration: none; margin: 0 1.5rem; transition: color 0.3s; font-weight: 500; }
          nav a:hover { color: #9146FF; }
          .hero { background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); padding: 6rem 2rem; text-align: center; position: relative; overflow: hidden; }
          .hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 20% 50%, rgba(145, 70, 255, 0.15) 0%, transparent 50%); }
          .hero > * { position: relative; z-index: 2; }
          .hero h1 { font-size: 3.5rem; font-weight: 700; margin-bottom: 1rem; background: linear-gradient(135deg, #fff 0%, #9146FF 50%, #FF1493 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
          .hero p { font-size: 1.25rem; color: #ccc; margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; }
          .btn-group { margin: 2rem 0; }
          .btn { display: inline-block; padding: 0.9rem 2rem; background: #9146FF; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 0.5rem; transition: all 0.3s; border: 2px solid #9146FF; cursor: pointer; box-shadow: 0 0 20px rgba(145, 70, 255, 0.3); }
          .btn:hover { background: #a855ff; border-color: #a855ff; transform: translateY(-2px); box-shadow: 0 0 30px rgba(145, 70, 255, 0.6); }
          .btn-outline { background: transparent; color: #9146FF; border-color: #9146FF; }
          .btn-outline:hover { background: #9146FF; color: #fff; border-color: #9146FF; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          .plugins { padding: 5rem 2rem; background: #1a1a1a; }
          .section-title { text-align: center; font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem; }
          .section-subtitle { text-align: center; color: #999; font-size: 1.1rem; margin-bottom: 3rem; }
          .plugin-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; }
          .plugin-card { background: #222; padding: 2rem; border-radius: 12px; border: 1px solid #333; transition: all 0.3s; }
          .plugin-card:hover { border-color: #9146FF; transform: translateY(-5px); }
          .plugin-icon { font-size: 3rem; margin-bottom: 1rem; }
          .plugin-card h3 { font-size: 1.3rem; margin-bottom: 0.8rem; font-weight: 600; }
          .plugin-card p { color: #bbb; font-size: 0.95rem; }
          .features-showcase { padding: 5rem 2rem; }
          .showcase-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
          .showcase-item { background: #1a1a1a; padding: 2rem; border-radius: 12px; border-left: 4px solid #9146FF; }
          .showcase-item h3 { margin-bottom: 1rem; font-size: 1.2rem; }
          .showcase-item p { color: #aaa; line-height: 1.8; }
          .stats { padding: 3rem 2rem; background: #1a1a1a; text-align: center; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 2rem; max-width: 800px; margin: 2rem auto 0; }
          .stat-item h2 { font-size: 2.5rem; color: #9146FF; margin-bottom: 0.5rem; }
          .stat-item p { color: #999; }
          .cta { padding: 4rem 2rem; background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%); text-align: center; }
          .cta h2 { font-size: 2.2rem; margin-bottom: 1rem; }
          .cta p { color: #ccc; margin-bottom: 2rem; font-size: 1.1rem; }
          footer { background: #0a0a0a; padding: 3rem 2rem; text-align: center; border-top: 1px solid #222; }
          footer a { color: #9146FF; text-decoration: none; margin: 0 1rem; }
          footer a:hover { text-decoration: underline; }
          @media (max-width: 768px) {
            .hero h1 { font-size: 2.5rem; }
            nav { flex-direction: column; gap: 1rem; }
            .section-title { font-size: 2rem; }
          }
        </style>
      </head>
      <body>
        <nav>
          <div style="display: flex; align-items: center; gap: 1rem;">
            <img src="/assets/spidey-logo.png" alt="SPIDEY BOT">
            <span style="font-weight: 700; font-size: 1.2rem;">SPIDEY BOT</span>
          </div>
          <div>
            <a href="/">Home</a>
            <a href="/features">Features</a>
            <a href="/commands">Commands</a>
            <a href="#invite">Invite</a>
            <a href="/auth/discord" class="btn" style="padding: 0.6rem 1.2rem; margin: 0; font-size: 0.9rem;">🔐 Login with Discord</a>
          </div>
        </nav>

        <div class="hero">
          <h1>The best all-in-one bot for Discord</h1>
          <p>SPIDEY BOT is a complete Discord bot trusted by servers worldwide. Music, moderation, economy, leveling, and 40+ commands to manage and entertain your community.</p>
          <div class="btn-group">
            <a href="${botInviteURL}" target="_blank" class="btn">Add to Discord</a>
            <a href="/features" class="btn btn-outline">See Features</a>
          </div>
        </div>

        <div class="plugins">
          <div class="container">
            <h2 class="section-title">Plugins & Features</h2>
            <p class="section-subtitle">Everything you need to manage, protect, and grow your Discord community</p>
            <div class="plugin-grid">
              <div class="plugin-card">
                <div class="plugin-icon">🎵</div>
                <h3>Music & Entertainment</h3>
                <p>Advanced music player with YouTube search, queue management, loop, shuffle, volume control, and interactive buttons</p>
              </div>
              <div class="plugin-card">
                <div class="plugin-icon">🛡️</div>
                <h3>Moderation & Management</h3>
                <p>Kick, ban, warn, mute with automatic logging. Link filtering, profanity filter, and warning tracking</p>
              </div>
              <div class="plugin-card">
                <div class="plugin-icon">🎭</div>
                <h3>Role Management</h3>
                <p>Create custom role categories with GIF banners. Interactive role selectors for easy member management</p>
              </div>
              <div class="plugin-card">
                <div class="plugin-icon">📱</div>
                <h3>Social Media Monitoring</h3>
                <p>Monitor unlimited Twitch, TikTok, and Kick streamers. Auto-announce live streams and new posts to your server</p>
              </div>
              <div class="plugin-card">
                <div class="plugin-icon">💰</div>
                <h3>Economy System</h3>
                <p>Currency system with daily rewards, work commands, transfers, and leaderboards. Admin controls for money management</p>
              </div>
              <div class="plugin-card">
                <div class="plugin-icon">📈</div>
                <h3>Leveling & XP</h3>
                <p>Passive XP gains from chatting. Auto-assigned level roles with emoji badges (1-100) and leaderboards</p>
              </div>
              <div class="plugin-card">
                <div class="plugin-icon">👋</div>
                <h3>Welcome Messages</h3>
                <p>Custom welcome messages with placeholders. Personalize greetings for every new member</p>
              </div>
              <div class="plugin-card">
                <div class="plugin-icon">🎫</div>
                <h3>Ticket Support</h3>
                <p>Support ticket system for member assistance. Easy ticket creation and management</p>
              </div>
            </div>
          </div>
        </div>

        <div class="features-showcase">
          <div class="container">
            <h2 class="section-title">Why Choose SPIDEY BOT?</h2>
            <div class="showcase-grid">
              <div class="showcase-item">
                <h3>✨ All-in-One Solution</h3>
                <p>40+ commands covering music, moderation, economy, leveling, social media, and more. Everything in one bot.</p>
              </div>
              <div class="showcase-item">
                <h3>🔧 Per-Server Configuration</h3>
                <p>Each server has independent settings, custom prefix, role categories, and configurations. Total control.</p>
              </div>
              <div class="showcase-item">
                <h3>⚡ Easy to Use</h3>
                <p>Simple commands, intuitive interface, and helpful documentation. Get started in minutes, not hours.</p>
              </div>
              <div class="showcase-item">
                <h3>🌐 Unlimited Creators</h3>
                <p>Monitor unlimited Twitch, TikTok, and Kick streamers per server. No limits on social media monitoring.</p>
              </div>
              <div class="showcase-item">
                <h3>🎖️ Gamification</h3>
                <p>Level roles with gradient colors, economy system, and leaderboards to keep members engaged.</p>
              </div>
              <div class="showcase-item">
                <h3>24/7 Uptime</h3>
                <p>Deployed on Render for reliable 24/7 operation. Your community always has the tools it needs.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="stats">
          <div class="container">
            <h2 class="section-title">Trusted by Communities</h2>
            <div class="stats-grid">
              <div class="stat-item">
                <h2>40+</h2>
                <p>Commands</p>
              </div>
              <div class="stat-item">
                <h2>∞</h2>
                <p>Servers</p>
              </div>
              <div class="stat-item">
                <h2>8</h2>
                <p>Feature Categories</p>
              </div>
            </div>
          </div>
        </div>

        <div class="cta" id="invite">
          <div class="container">
            <h2>Ready to add SPIDEY BOT to your server?</h2>
            <p>Join thousands of communities already using SPIDEY BOT</p>
            <a href="${botInviteURL}" target="_blank" class="btn">Add SPIDEY BOT Now</a>
          </div>
        </div>

        <footer>
          <img src="/assets/spidey-logo.png" alt="SPIDEY BOT" style="height: 40px; margin-bottom: 1rem;">
          <p>SPIDEY BOT © 2025 • The complete Discord bot for your community</p>
          <p style="margin: 1rem 0; color: #666; font-size: 0.9rem;">Use <strong>//help</strong> in Discord for commands • <strong>//adminhelp</strong> for admin features</p>
          <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #222;">
            <a href="/tos">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/features">Features</a>
            <a href="/commands">Commands</a>
          </div>
        </footer>
        ${supportWidget}
      </body>
    </html>
  `);
});

// Features Page
app.get("/features", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Features - SPIDEY BOT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Fredoka+One&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Fredoka', sans-serif; background: linear-gradient(135deg, #1a0033 0%, #2d0052 25%, #0d0015 50%, #3d1573 75%, #1a0033 100%); background-attachment: fixed; color: white; position: relative; }
          body::before { content: ''; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-image: radial-gradient(circle, rgba(145, 70, 255, 0.1) 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; z-index: -1; }
          nav { background: rgba(17, 17, 17, 0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #9146FF; backdrop-filter: blur(10px); }
          nav a { color: white; text-decoration: none; margin: 0 1rem; }
          nav a:hover { color: #FF1493; text-shadow: 0 0 10px #FF1493; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          h1 { text-align: center; font-size: 2.5rem; margin: 2rem 0; color: #FF1493; text-shadow: 0 0 20px rgba(255, 20, 147, 0.5); font-family: 'Fredoka One', sans-serif; }
          .feature-section { background: rgba(26, 26, 26, 0.8); padding: 2rem; margin: 2rem 0; border-radius: 10px; border-left: 4px solid #9146FF; backdrop-filter: blur(10px); }
          .feature-section h2 { color: #9146FF; margin-bottom: 1rem; font-family: 'Fredoka One', sans-serif; }
          .feature-section ul { margin-left: 2rem; }
          .feature-section li { margin: 0.5rem 0; color: white; }
          .btn { display: inline-block; padding: 0.8rem 1.5rem; background: #9146FF; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 1rem 0; }
          .btn:hover { background: #7C3AED; }
        </style>
      </head>
      <body>
        <nav>
          <img src="/assets/spidey-logo.png" alt="SPIDEY BOT" style="height: 50px; margin-right: 1rem;">
          <div style="font-size: 1.5rem; font-weight: bold; flex: 1;">SPIDEY BOT</div>
          <div>
            <a href="/">Home</a>
            <a href="/features">Features</a>
            <a href="/commands">Commands</a>
          </div>
        </nav>

        <img src="/assets/spidey-banner.png" alt="SPIDEY BOT Banner" style="width: 100%; max-height: 250px; object-fit: cover; display: block;">
        <div class="container">
          <img src="/assets/spidey-logo.png" alt="SPIDEY BOT" style="height: 80px; display: block; margin: 1rem auto;">
          <h1>✨ Features</h1>

          <div class="feature-section">
            <h2>🎵 Advanced Music Player</h2>
            <ul>
              <li>Search and play songs from YouTube</li>
              <li>Queue management (view next 10 songs)</li>
              <li>Loop entire queue or single songs</li>
              <li>Shuffle randomization</li>
              <li>Volume control (0-200%)</li>
              <li>Interactive button controls (prev, pause, resume, skip, stop)</li>
            </ul>
          </div>

          <div class="feature-section">
            <h2>🎭 Role Categories with GIF Banners</h2>
            <ul>
              <li>Create unlimited custom role categories</li>
              <li>Add GIF banners for visual appeal</li>
              <li>Interactive role selector buttons</li>
              <li>Users can add/remove roles themselves</li>
              <li>Fully customizable per server</li>
            </ul>
          </div>

          <div class="feature-section">
            <h2>🛡️ Complete Moderation Suite</h2>
            <ul>
              <li>Kick members with reasons</li>
              <li>Ban members permanently</li>
              <li>Warn system with tracking</li>
              <li>Mute/timeout (1 hour default)</li>
              <li>Automatic logging to modlog channel</li>
              <li>Warning history per member</li>
            </ul>
          </div>

          <div class="feature-section">
            <h2>📱 Unlimited Social Media Monitoring</h2>
            <ul>
              <li>Monitor multiple Twitch streamers per server</li>
              <li>Monitor multiple TikTok creators per server</li>
              <li>Auto-announce when streamers go live</li>
              <li>Auto-announce TikTok posts</li>
              <li>Customizable alert channels</li>
              <li>Web admin dashboard for easy management</li>
            </ul>
          </div>

          <div class="feature-section">
            <h2>👋 Welcome System</h2>
            <ul>
              <li>Custom welcome messages per server</li>
              <li>Placeholder support: {user}, {username}, {displayname}, {server}, {membercount}</li>
              <li>Set specific channel for welcomes</li>
              <li>Personalized for every new member</li>
            </ul>
          </div>

          <div class="feature-section">
            <h2>⚙️ Per-Server Configuration</h2>
            <ul>
              <li>Custom command prefix per server</li>
              <li>Independent modlog channels</li>
              <li>Individual role categories</li>
              <li>Separate music settings</li>
              <li>All settings completely isolated</li>
            </ul>
          </div>

          <div class="feature-section">
            <h2>🌐 Web Admin Dashboard</h2>
            <ul>
              <li>Access all servers at a glance</li>
              <li>View current configurations</li>
              <li>Manage multiple servers from web interface</li>
              <li>REST API for automation</li>
              <li>Secure token-based access</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 3rem;">
            <a href="${botInviteURL}" target="_blank" class="btn">➕ Add SPIDEY BOT to Your Server</a>
          </div>

          <div style="text-align: center; padding: 2rem; background: #1a1a1a; border-top: 2px solid #9146FF; margin-top: 3rem;">
            <h2 style="color: #9146FF; margin-bottom: 1rem;">☕ Support SPIDEY BOT</h2>
            <p style="margin-bottom: 1.5rem; opacity: 0.8;">Enjoy SPIDEY BOT? Support development!</p>
            <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=peterburke122000@gmail.com&item_name=Support+SPIDEY+BOT&amount=10.00&currency_code=USD" target="_blank" class="btn" style="background: #9146FF;">💜 Donate via PayPal</a>
          </div>

          <footer style="text-align: center; padding: 2rem; color: #999; border-top: 2px solid #9146FF; margin-top: 3rem;">
            <p>© 2025 SPIDEY BOT. All rights reserved.</p>
            <div style="margin-top: 1rem;">
              <a href="/tos" style="color: white; text-decoration: none; margin: 0 1rem; font-size: 0.9rem;">⚖️ Terms of Service</a>
              <a href="/privacy" style="color: white; text-decoration: none; margin: 0 1rem; font-size: 0.9rem;">📋 Privacy Policy</a>
            </div>
          </footer>
        </div>
        ${supportWidget}
      </body>
    </html>
  `);
});

// Commands Page
app.get("/commands", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Commands - SPIDEY BOT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Fredoka+One&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Fredoka', sans-serif; background: linear-gradient(135deg, #1a0033 0%, #2d0052 25%, #0d0015 50%, #3d1573 75%, #1a0033 100%); background-attachment: fixed; color: white; position: relative; }
          body::before { content: ''; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-image: radial-gradient(circle, rgba(145, 70, 255, 0.1) 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; z-index: -1; }
          nav { background: rgba(17, 17, 17, 0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #9146FF; backdrop-filter: blur(10px); }
          nav a { color: white; text-decoration: none; margin: 0 1rem; }
          nav a:hover { color: #FF1493; text-shadow: 0 0 10px #FF1493; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          h1 { text-align: center; font-size: 2.5rem; margin: 2rem 0; color: #FF1493; text-shadow: 0 0 20px rgba(255, 20, 147, 0.5); font-family: 'Fredoka One', sans-serif; }
          h2 { color: #00FFFF; margin: 2rem 0 1rem 0; border-bottom: 2px solid #9146FF; padding-bottom: 0.5rem; text-shadow: 0 0 10px rgba(0, 255, 255, 0.3); font-family: 'Fredoka One', sans-serif; }
          .cmd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
          .cmd-card { background: rgba(26, 26, 26, 0.8); padding: 1rem; border-radius: 5px; border-left: 3px solid #9146FF; backdrop-filter: blur(10px); }
          .cmd-card code { background: #333; padding: 0.2rem 0.5rem; border-radius: 3px; color: #9146FF; }
          .cmd-card p { opacity: 0.8; margin-top: 0.5rem; font-size: 0.9rem; color: white; }
          .btn { display: inline-block; padding: 0.8rem 1.5rem; background: #9146FF; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 1rem 0; }
          .btn:hover { background: #7C3AED; }
          .note { background: #1a1a1a; border-left: 3px solid #9146FF; padding: 1rem; border-radius: 5px; margin: 1rem 0; color: white; }
        </style>
      </head>
      <body>
        <nav>
          <img src="/assets/spidey-logo.png" alt="SPIDEY BOT" style="height: 50px; margin-right: 1rem;">
          <div style="font-size: 1.5rem; font-weight: bold; flex: 1;">SPIDEY BOT</div>
          <div>
            <a href="/">Home</a>
            <a href="/features">Features</a>
            <a href="/commands">Commands</a>
          </div>
        </nav>

        <img src="/assets/spidey-banner.png" alt="SPIDEY BOT Banner" style="width: 100%; max-height: 250px; object-fit: cover; display: block;">
        <div class="container">
          <img src="/assets/spidey-logo.png" alt="SPIDEY BOT" style="height: 80px; display: block; margin: 1rem auto;">
          <h1>📚 Commands</h1>
          
          <div class="note">
            <strong>💡 Tip:</strong> In your Discord server, use <code>//help</code> for user commands and <code>//adminhelp</code> for admin commands (requires Administrator permission)
          </div>

          <h2>🎵 Music Commands</h2>
          <div class="cmd-grid">
            <div class="cmd-card"><code>//play [song]</code><p>Search & play from YouTube</p></div>
            <div class="cmd-card"><code>//queue</code><p>View next 10 songs</p></div>
            <div class="cmd-card"><code>//loop</code><p>Toggle queue repeat</p></div>
            <div class="cmd-card"><code>//shuffle</code><p>Randomize playlist</p></div>
            <div class="cmd-card"><code>//volume [0-200]</code><p>Adjust volume</p></div>
          </div>

          <h2>🎭 Role Categories (Admin)</h2>
          <div class="cmd-grid">
            <div class="cmd-card"><code>//create-category [name]</code><p>Create role category</p></div>
            <div class="cmd-card"><code>//add-role [cat] [name] [ID]</code><p>Add role to category</p></div>
            <div class="cmd-card"><code>//remove-role [cat] [name]</code><p>Remove role</p></div>
            <div class="cmd-card"><code>//set-category-banner [cat] [url]</code><p>Add GIF banner</p></div>
            <div class="cmd-card"><code>//setup-category [name]</code><p>Post selector button</p></div>
            <div class="cmd-card"><code>//list-roles</code><p>View all roles</p></div>
          </div>

          <h2>🛡️ Moderation (Admin)</h2>
          <div class="cmd-grid">
            <div class="cmd-card"><code>//kick @user [reason]</code><p>Remove member</p></div>
            <div class="cmd-card"><code>//ban @user [reason]</code><p>Permanently ban</p></div>
            <div class="cmd-card"><code>//warn @user [reason]</code><p>Warn member</p></div>
            <div class="cmd-card"><code>//mute @user</code><p>Timeout 1 hour</p></div>
            <div class="cmd-card"><code>//unmute @user</code><p>Remove timeout</p></div>
            <div class="cmd-card"><code>//warnings @user</code><p>View history</p></div>
          </div>

          <h2>📱 Social Media (Admin)</h2>
          <div class="cmd-grid">
            <div class="cmd-card"><code>//add-twitch-user [user]</code><p>Monitor Twitch streamer</p></div>
            <div class="cmd-card"><code>//remove-twitch-user [user]</code><p>Stop monitoring</p></div>
            <div class="cmd-card"><code>//list-twitch-users</code><p>View monitored streamers</p></div>
            <div class="cmd-card"><code>//config-twitch-channel #ch</code><p>Set alert channel</p></div>
            <div class="cmd-card"><code>//add-tiktok-user [user]</code><p>Monitor TikTok creator</p></div>
            <div class="cmd-card"><code>//remove-tiktok-user [user]</code><p>Stop monitoring</p></div>
            <div class="cmd-card"><code>//list-tiktok-users</code><p>View monitored creators</p></div>
            <div class="cmd-card"><code>//config-tiktok-channel #ch</code><p>Set alert channel</p></div>
            <div class="cmd-card"><code>//add-kick-user [user]</code><p>Monitor Kick streamer</p></div>
            <div class="cmd-card"><code>//remove-kick-user [user]</code><p>Stop monitoring</p></div>
            <div class="cmd-card"><code>//list-kick-users</code><p>View monitored streamers</p></div>
            <div class="cmd-card"><code>//config-kick-channel #ch</code><p>Set alert channel</p></div>
          </div>

          <h2>⚙️ Configuration (Admin)</h2>
          <div class="cmd-grid">
            <div class="cmd-card"><code>//set-prefix [prefix]</code><p>Change command prefix</p></div>
            <div class="cmd-card"><code>//config-modlog #channel</code><p>Set moderation log</p></div>
            <div class="cmd-card"><code>//config-welcome-channel #ch</code><p>Set welcome channel</p></div>
            <div class="cmd-card"><code>//config-welcome-message [text]</code><p>Custom welcome</p></div>
          </div>

          <h2>📞 Utilities</h2>
          <div class="cmd-grid">
            <div class="cmd-card"><code>//help</code><p>User command guide</p></div>
            <div class="cmd-card"><code>//adminhelp</code><p>Admin command guide</p></div>
            <div class="cmd-card"><code>//ping</code><p>Bot status</p></div>
            <div class="cmd-card"><code>//remove-roles</code><p>Remove your roles</p></div>
          </div>

          <div style="text-align: center; margin-top: 3rem;">
            <a href="${botInviteURL}" target="_blank" class="btn">➕ Add SPIDEY BOT Now</a>
          </div>
        </div>
        ${supportWidget}
      </body>
    </html>
  `);
});

// Admin Dashboard
app.get("/admin", (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN || "spidey123";
  const token = req.query.token;
  if (token !== adminToken) {
    return res.send(`
      <html>
        <head>
          <title>Admin Login</title>
          <style>
            body { background: #5865F2; color: white; font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { text-align: center; background: #4752C4; padding: 40px; border-radius: 10px; }
            input { padding: 10px; width: 200px; border: none; border-radius: 5px; }
            button { padding: 10px 20px; background: #9146FF; color: black; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Admin Login</h1>
            <form>
              <input type="password" id="token" placeholder="Enter Admin Token" required>
              <button type="button" onclick="login()">Login</button>
            </form>
            <script>
              function login() {
                const token = document.getElementById('token').value;
                window.location.href = '/admin?token=' + token;
              }
            </script>
          </div>
        </body>
      </html>
    `);
  }

  const config = loadConfig();
  const guilds = config.guilds || {};
  
  let guildRows = "";
  for (const [guildId, guildConfig] of Object.entries(guilds)) {
    const twitchUsers = (guildConfig.twitchUsers || []).join(", ") || "None";
    const tiktokUsers = (guildConfig.tiktokUsers || []).join(", ") || "None";
    guildRows += `
      <tr style="border-bottom: 1px solid #ccc;">
        <td style="padding: 10px;"><code>${guildId}</code></td>
        <td style="padding: 10px;">${guildConfig.prefix || "//"}</td>
        <td style="padding: 10px;">${twitchUsers}</td>
        <td style="padding: 10px;">${tiktokUsers}</td>
        <td style="padding: 10px;"><button onclick="editGuild('${guildId}')">Edit</button></td>
      </tr>
    `;
  }

  res.send(`
    <html>
      <head>
        <title>SPIDEY BOT Admin Dashboard</title>
        <style>
          body { background: #5865F2; color: white; font-family: Arial; margin: 0; padding: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; background: #4752C4; border-radius: 5px; overflow: hidden; }
          th { background: #36393F; padding: 10px; text-align: left; }
          td { padding: 10px; }
          button { background: #7289DA; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; }
          button:hover { background: #5B7FBD; }
          .logout { float: right; background: #FF6B6B; }
          .logout:hover { background: #EE5A52; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 SPIDEY BOT Admin Dashboard</h1>
          <button class="logout" onclick="logout()">Logout</button>
          <br><br>
          <table>
            <tr style="background: #36393F;">
              <th>Server ID</th>
              <th>Prefix</th>
              <th>Twitch Users</th>
              <th>TikTok Users</th>
              <th>Action</th>
            </tr>
            ${guildRows || "<tr><td colspan='5' style='text-align: center; padding: 20px;'>No servers configured yet</td></tr>"}
          </table>
        </div>
        <script>
          function logout() {
            window.location.href = '/';
          }
          function editGuild(guildId) {
            window.location.href = '/admin/edit?guildId=' + guildId + '&token=spidey123';
          }
        </script>
      </body>
    </html>
  `);
});

// API: Get guild config
app.get("/api/guild/:guildId", verifyAdmin, (req, res) => {
  const config = loadConfig();
  const guildConfig = config.guilds[req.params.guildId];
  if (!guildConfig) {
    return res.status(404).json({ error: "Guild not found" });
  }
  res.json(guildConfig);
});

// API: Update guild config
app.post("/api/guild/:guildId", verifyAdmin, express.json(), (req, res) => {
  const config = loadConfig();
  const guildId = req.params.guildId;
  if (!config.guilds[guildId]) {
    config.guilds[guildId] = {};
  }
  config.guilds[guildId] = { ...config.guilds[guildId], ...req.body };
  saveConfig(config);
  res.json({ success: true, config: config.guilds[guildId] });
});

// API: List all guilds
app.get("/api/guilds", verifyAdmin, (req, res) => {
  const config = loadConfig();
  res.json(config.guilds || {});
});

// Twitch webhook
app.post("/webhooks/twitch", (req, res) => {
  const body = req.body;
  if (body.subscription?.type === "stream.online") {
    const config = loadConfig();
    const broadcasterName = body.event?.broadcaster_user_login?.toLowerCase();
    
    for (const [guildId, guildConfig] of Object.entries(config.guilds || {})) {
      const monitoredUsers = guildConfig.twitchUsers || [];
      if (monitoredUsers.some(u => u.toLowerCase() === broadcasterName) && guildConfig.twitchChannelId) {
        const channel = client.channels.cache.get(guildConfig.twitchChannelId);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(0x9146FF)
            .setTitle("🎮 TWITCH LIVE!")
            .setDescription(`**${body.event?.broadcaster_user_login}** is live! Please support and follow thanks!`)
            .setURL(`https://twitch.tv/${body.event?.broadcaster_user_login}`)
            .addFields(
              { name: "Title", value: body.event?.title || "No title", inline: false }
            )
            .setThumbnail(`https://static-cdn.jtvnw.net/jtv_user_pictures/${body.event?.broadcaster_user_id}.png`);
          channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }
  }
  res.status(200).json({ status: "ok" });
});

// TikTok webhook
app.post("/webhooks/tiktok", (req, res) => {
  const body = req.body;
  if (body.event === "post.publish" || body.type === "video") {
    const config = loadConfig();
    const tiktokUser = (body.data?.author_username || body.creator)?.toLowerCase();
    
    for (const [guildId, guildConfig] of Object.entries(config.guilds || {})) {
      const monitoredUsers = guildConfig.tiktokUsers || [];
      if (monitoredUsers.some(u => u.toLowerCase() === tiktokUser) && guildConfig.tiktokChannelId) {
        const channel = client.channels.cache.get(guildConfig.tiktokChannelId);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle("📱 NEW TIKTOK POST!")
            .setDescription(`**${body.data?.author_username || body.creator}** just posted on TikTok!`)
            .setURL(`https://www.tiktok.com/@${body.data?.author_username || body.creator}`)
            .addFields(
              { name: "Caption", value: body.data?.caption || "No caption", inline: false }
            );
          channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }
  }
  res.status(200).json({ status: "ok" });
});

// Kick webhook
app.post("/webhooks/kick", (req, res) => {
  const body = req.body;
  if (body.event_type === "live" || body.type === "stream_online") {
    const config = loadConfig();
    const kickUser = (body.data?.username || body.streamer)?.toLowerCase();
    const viewers = body.data?.viewers || body.viewer_count || 0;
    
    for (const [guildId, guildConfig] of Object.entries(config.guilds || {})) {
      const monitoredUsers = guildConfig.kickUsers || [];
      if (monitoredUsers.some(u => u.toLowerCase() === kickUser) && guildConfig.kickChannelId) {
        const channel = client.channels.cache.get(guildConfig.kickChannelId);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(0x00FFA3)
            .setTitle("🎮 KICK LIVE!")
            .setDescription(`**${body.data?.username || body.streamer}** is live with ${viewers} viewers please support and follow thanks!`)
            .setURL(`https://kick.com/${body.data?.username || body.streamer}`)
            .addFields(
              { name: "Viewers", value: `${viewers}`, inline: true }
            );
          channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    }
  }
  res.status(200).json({ status: "ok" });
});

// AI Chat Endpoint
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ reply: "Please ask me something!" });
  
  try {
    const { Configuration, OpenAIApi } = await import("openai");
    const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const openai = new OpenAIApi(configuration);
    
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are SPIDEY BOT's helpful AI assistant. Answer questions about SPIDEY BOT's features: music player, moderation, role management, leveling system, economy, social media monitoring (Twitch/TikTok), link filtering, profanity filter, ticket support, custom commands. Be friendly and concise. Use emojis. If asked about something unrelated, politely redirect to SPIDEY BOT topics." },
        { role: "user", content: message }
      ],
      max_tokens: 150,
      temperature: 0.7
    });
    
    res.json({ reply: completion.data.choices[0].message.content });
  } catch (e) {
    console.error("Chat error:", e);
    res.json({ reply: "🕷️ I'm having trouble right now. Try asking about our features!" });
  }
});

// Interactions Endpoint (Discord Interactions)
app.get("/interactions", (req, res) => {
  res.status(200).json({ type: 1, message: "SPIDEY BOT Interactions Endpoint" });
});

app.post("/interactions", (req, res) => {
  res.status(200).json({ type: 1 });
});

// Terms of Service Page
app.get("/tos", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Terms of Service - SPIDEY BOT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Fredoka+One&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Fredoka', sans-serif; background: linear-gradient(135deg, #1a0033 0%, #2d0052 25%, #0d0015 50%, #3d1573 75%, #1a0033 100%); background-attachment: fixed; color: white; position: relative; }
          body::before { content: ''; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-image: radial-gradient(circle, rgba(145, 70, 255, 0.1) 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; z-index: -1; }
          nav { background: rgba(17, 17, 17, 0.9); padding: 1rem 2rem; border-bottom: 2px solid #9146FF; backdrop-filter: blur(10px); }
          nav a { color: white; text-decoration: none; margin: 0 1rem; }
          nav a:hover { color: #FF1493; text-shadow: 0 0 10px #FF1493; }
          .container { max-width: 900px; margin: 0 auto; padding: 2rem; background: rgba(26, 26, 26, 0.8); border-radius: 10px; margin-top: 2rem; margin-bottom: 2rem; border: 2px solid #9146FF; }
          h1 { color: #FF1493; text-shadow: 0 0 20px rgba(255, 20, 147, 0.5); margin-bottom: 2rem; }
          h2 { color: #00FFFF; margin-top: 2rem; margin-bottom: 1rem; text-shadow: 0 0 10px rgba(0, 255, 255, 0.3); }
          p { line-height: 1.8; margin-bottom: 1rem; color: #ddd; }
          li { margin-left: 2rem; margin-bottom: 0.5rem; color: #ddd; }
          footer { text-align: center; padding: 2rem; color: #999; border-top: 2px solid #9146FF; margin-top: 3rem; }
        </style>
      </head>
      <body>
        <nav>
          <a href="/">🏠 Home</a>
          <a href="/privacy">📋 Privacy Policy</a>
        </nav>
        <div class="container">
          <h1 style="font-family: 'Fredoka One', sans-serif;">🕷️ SPIDEY BOT - Terms of Service</h1>
          <p><strong>Last Updated: November 21, 2025</strong></p>
          
          <h2 style="font-family: 'Fredoka One', sans-serif;">1. Acceptance of Terms</h2>
          <p>By adding SPIDEY BOT to your Discord server, you agree to comply with these Terms of Service. If you do not agree, do not use the bot.</p>
          
          <h2>2. Use License</h2>
          <p>SPIDEY BOT is provided as-is for use in Discord servers. You are granted a non-exclusive, non-transferable license to use the bot in accordance with these terms.</p>
          
          <h2>3. User Responsibilities</h2>
          <ul>
            <li>You are responsible for all content and commands executed through SPIDEY BOT</li>
            <li>You agree not to use the bot for harassment, spam, or illegal activities</li>
            <li>You must comply with Discord's Terms of Service</li>
            <li>You are responsible for configuring the bot appropriately for your server</li>
          </ul>
          
          <h2>4. Prohibited Activities</h2>
          <ul>
            <li>Using the bot to harass, threaten, or abuse other users</li>
            <li>Sending spam or unsolicited messages through the bot</li>
            <li>Attempting to hack, bypass, or exploit the bot</li>
            <li>Using the bot for commercial purposes without permission</li>
          </ul>
          
          <h2>5. Disclaimer of Warranties</h2>
          <p>SPIDEY BOT is provided "AS IS" without any warranties, expressed or implied. We do not guarantee uninterrupted service or error-free operation.</p>
          
          <h2>6. Limitation of Liability</h2>
          <p>In no event shall SPIDEY BOT be liable for any indirect, incidental, or consequential damages arising from the use of the bot.</p>
          
          <h2>7. Modifications</h2>
          <p>We reserve the right to modify, suspend, or discontinue the bot at any time without notice.</p>
          
          <h2>8. Contact</h2>
          <p>For questions about these Terms of Service, please contact us through our Discord support server.</p>
        </div>
        <footer style="text-align: center; padding: 2rem; color: #999; border-top: 2px solid #9146FF; margin-top: 3rem;">
          <p>© 2025 SPIDEY BOT. All rights reserved.</p>
          <div style="margin-top: 1rem;">
            <a href="/" style="color: white; text-decoration: none; margin: 0 1rem; font-size: 0.9rem;">🏠 Home</a>
            <a href="/privacy" style="color: white; text-decoration: none; margin: 0 1rem; font-size: 0.9rem;">📋 Privacy Policy</a>
          </div>
        </footer>
      </body>
    </html>
  `);
});

// Privacy Policy Page
app.get("/privacy", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Privacy Policy - SPIDEY BOT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #1a0033 0%, #2d0052 25%, #0d0015 50%, #3d1573 75%, #1a0033 100%); background-attachment: fixed; color: white; position: relative; }
          body::before { content: ''; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-image: radial-gradient(circle, rgba(145, 70, 255, 0.1) 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; z-index: -1; }
          nav { background: rgba(17, 17, 17, 0.9); padding: 1rem 2rem; border-bottom: 2px solid #9146FF; backdrop-filter: blur(10px); }
          nav a { color: white; text-decoration: none; margin: 0 1rem; }
          nav a:hover { color: #FF1493; text-shadow: 0 0 10px #FF1493; }
          .container { max-width: 900px; margin: 0 auto; padding: 2rem; background: rgba(26, 26, 26, 0.8); border-radius: 10px; margin-top: 2rem; margin-bottom: 2rem; border: 2px solid #9146FF; }
          h1 { color: #FF1493; text-shadow: 0 0 20px rgba(255, 20, 147, 0.5); margin-bottom: 2rem; }
          h2 { color: #00FFFF; margin-top: 2rem; margin-bottom: 1rem; text-shadow: 0 0 10px rgba(0, 255, 255, 0.3); }
          p { line-height: 1.8; margin-bottom: 1rem; color: #ddd; }
          li { margin-left: 2rem; margin-bottom: 0.5rem; color: #ddd; }
          footer { text-align: center; padding: 2rem; color: #999; border-top: 2px solid #9146FF; margin-top: 3rem; }
        </style>
      </head>
      <body>
        <nav>
          <a href="/">🏠 Home</a>
          <a href="/tos">⚖️ Terms of Service</a>
        </nav>
        <div class="container">
          <h1 style="font-family: 'Fredoka One', sans-serif;">🕷️ SPIDEY BOT - Privacy Policy</h1>
          <p><strong>Last Updated: November 21, 2025</strong></p>
          
          <h2 style="font-family: 'Fredoka One', sans-serif;">1. Information We Collect</h2>
          <p>SPIDEY BOT collects the following information to provide its services:</p>
          <ul>
            <li>Discord User IDs and Server IDs</li>
            <li>Server configuration data (prefix, channels, settings)</li>
            <li>User economy and leveling data</li>
            <li>Messages and commands executed through the bot</li>
          </ul>
          
          <h2>2. How We Use Your Information</h2>
          <ul>
            <li>To provide and improve bot functionality</li>
            <li>To personalize your experience with per-server configuration</li>
            <li>To store your economy, levels, and other game data</li>
            <li>To enforce our Terms of Service</li>
          </ul>
          
          <h2>3. Data Storage</h2>
          <p>Your data is stored securely in our database and is not shared with third parties except as required by law.</p>
          
          <h2>4. Data Retention</h2>
          <p>We retain your data for as long as you use the bot. Upon bot removal from your server, data may be retained for backup purposes.</p>
          
          <h2>5. Your Rights</h2>
          <ul>
            <li>You have the right to request your data through our support server</li>
            <li>You have the right to have your data deleted upon request</li>
            <li>You have the right to opt-out of data collection for specific features</li>
          </ul>
          
          <h2>6. Third-Party Services</h2>
          <p>SPIDEY BOT integrates with Discord, YouTube, Twitch, and TikTok APIs. Please review their privacy policies for information on how they handle your data.</p>
          
          <h2>7. Security</h2>
          <p>We take reasonable measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>
          
          <h2>8. Contact</h2>
          <p>For privacy concerns, please contact us through our Discord support server or visit our GitHub repository.</p>
        </div>
        <footer style="text-align: center; padding: 2rem; color: #999; border-top: 2px solid #9146FF; margin-top: 3rem;">
          <p>© 2025 SPIDEY BOT. All rights reserved.</p>
          <div style="margin-top: 1rem;">
            <a href="/" style="color: white; text-decoration: none; margin: 0 1rem; font-size: 0.9rem;">🏠 Home</a>
            <a href="/tos" style="color: white; text-decoration: none; margin: 0 1rem; font-size: 0.9rem;">⚖️ Terms of Service</a>
          </div>
        </footer>
      </body>
    </html>
  `);
});

// ============== DISCORD OAUTH ROUTES ==============
app.get("/auth/discord", (req, res) => {
  const scopes = ["identify", "guilds"];
  const discordAuthURL = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scopes.join("%20")}`;
  res.redirect(discordAuthURL);
});

app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect("/");
  
  try {
    const tokenResponse = await axios.post("https://discord.com/api/oauth2/token", {
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      scope: "identify guilds"
    });

    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
    });

    const guildsResponse = await axios.get("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
    });

    req.session.user = userResponse.data;
    req.session.accessToken = tokenResponse.data.access_token;
    req.session.guilds = guildsResponse.data;
    res.redirect("/dashboard");
  } catch (error) {
    console.error("OAuth error:", error.message);
    res.redirect("/?error=oauth_failed");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// ============== ADMIN DASHBOARD ==============
app.get("/dashboard", (req, res) => {
  if (!req.session.user) return res.redirect("/auth/discord");

  const config = loadConfig();
  const userGuilds = req.session.guilds || [];
  
  let guildRows = "";
  userGuilds.forEach(guild => {
    const guildConfig = config.guilds[guild.id] || {};
    guildRows += `
      <tr style="border-bottom: 1px solid #333;">
        <td style="padding: 12px;"><strong>${guild.name}</strong></td>
        <td style="padding: 12px;">${guildConfig.prefix || "//"}</td>
        <td style="padding: 12px;"><a href="/dashboard/server/${guild.id}" style="color: #9146FF; text-decoration: none;">⚙️ Configure</a></td>
      </tr>
    `;
  });

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>SPIDEY BOT - Admin Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: #0f0f0f; color: #fff; }
          nav { background: rgba(20, 20, 20, 0.95); border-bottom: 1px solid #222; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
          nav a { color: #9146FF; text-decoration: none; margin: 0 1rem; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          h1 { color: #9146FF; margin-bottom: 2rem; }
          h2 { color: #9146FF; margin: 2rem 0 1rem 0; }
          .user-info { background: #1a1a1a; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #9146FF; margin-bottom: 2rem; }
          table { width: 100%; background: #1a1a1a; border-radius: 8px; overflow: hidden; border: 1px solid #333; }
          th { background: #222; padding: 12px; text-align: left; border-bottom: 1px solid #333; }
          .btn { display: inline-block; padding: 0.8rem 1.5rem; background: #9146FF; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 1rem; border: none; cursor: pointer; }
          .btn:hover { background: #a855ff; }
          .btn-danger { background: #ff4444; }
          .btn-danger:hover { background: #ff2222; }
        </style>
      </head>
      <body>
        <nav>
          <div style="font-weight: 700;">🕷️ SPIDEY BOT Admin</div>
          <div>
            <a href="/">Home</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/logout">Logout</a>
          </div>
        </nav>

        <div class="container">
          <h1>👑 Admin Dashboard</h1>
          
          <div class="user-info">
            <h3>${req.session.user.username}#${req.session.user.discriminator}</h3>
            <p style="color: #999; margin-top: 0.5rem;">Manage your server settings and configurations below</p>
          </div>

          <h2>🖥️ Your Servers</h2>
          <table>
            <thead>
              <tr style="background: #222;">
                <th>Server Name</th>
                <th>Prefix</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${guildRows || "<tr><td colspan='3' style='padding: 20px; text-align: center; color: #999;'>No servers found. Add SPIDEY BOT to your server first!</td></tr>"}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `);
});

// ============== SERVER CONFIGURATION PAGE ==============
app.get("/dashboard/server/:guildId", (req, res) => {
  if (!req.session.user) return res.redirect("/auth/discord");

  const guildId = req.params.guildId;
  const userGuilds = req.session.guilds || [];
  const hasAccess = userGuilds.some(g => g.id === guildId);
  
  if (!hasAccess) return res.status(403).send("❌ You don't have access to this server");

  const config = loadConfig();
  const guildConfig = config.guilds[guildId] || {};

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>SPIDEY BOT - Server Config</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; background: #0f0f0f; color: #fff; }
          nav { background: rgba(20, 20, 20, 0.95); border-bottom: 1px solid #222; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
          nav a { color: #9146FF; text-decoration: none; margin: 0 1rem; }
          .container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
          h1 { color: #9146FF; margin-bottom: 2rem; }
          .section { background: #1a1a1a; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #9146FF; margin-bottom: 2rem; }
          .section h2 { color: #9146FF; margin-bottom: 1rem; font-size: 1.2rem; }
          .form-group { margin-bottom: 1rem; }
          label { display: block; margin-bottom: 0.5rem; color: #ddd; font-weight: 500; }
          input, textarea { width: 100%; padding: 0.8rem; background: #222; border: 1px solid #333; border-radius: 6px; color: #fff; font-family: Inter, sans-serif; }
          input:focus, textarea:focus { outline: none; border-color: #9146FF; }
          .btn { display: inline-block; padding: 0.8rem 1.5rem; background: #9146FF; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 1rem; border: none; cursor: pointer; }
          .btn:hover { background: #a855ff; }
          .info { background: #222; padding: 1rem; border-radius: 6px; color: #aaa; font-size: 0.9rem; margin-top: 0.5rem; }
        </style>
      </head>
      <body>
        <nav>
          <div style="font-weight: 700;">🕷️ SPIDEY BOT Admin</div>
          <div>
            <a href="/">Home</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/logout">Logout</a>
          </div>
        </nav>

        <div class="container">
          <h1>⚙️ Server Configuration</h1>

          <div class="section">
            <h2>🔤 Prefix Settings</h2>
            <form onsubmit="savePrefix(event)">
              <div class="form-group">
                <label>Command Prefix</label>
                <input type="text" id="prefix" value="${guildConfig.prefix || "//"}" maxlength="5">
                <div class="info">Default: //</div>
              </div>
              <button type="submit" class="btn">💾 Save Prefix</button>
            </form>
          </div>

          <div class="section">
            <h2>👋 Welcome Message</h2>
            <form onsubmit="saveWelcome(event)">
              <div class="form-group">
                <label>Welcome Message Text</label>
                <textarea id="welcomeMsg" rows="4">${guildConfig.welcomeMessage || "Welcome to our server! 🎉"}</textarea>
                <div class="info">Available: {user} {username} {displayname} {server} {membercount}</div>
              </div>
              <div class="form-group">
                <label>Welcome Channel ID</label>
                <input type="text" id="welcomeChannel" value="${guildConfig.welcomeChannelId || ""}" placeholder="Leave empty to disable">
              </div>
              <button type="submit" class="btn">💾 Save Welcome</button>
            </form>
          </div>

          <div class="section">
            <h2>📱 Social Media Monitoring</h2>
            <form onsubmit="saveSocial(event)">
              <div class="form-group">
                <label>Twitch Channel ID (for alerts)</label>
                <input type="text" id="twitchChannel" value="${guildConfig.twitchChannelId || ""}" placeholder="Leave empty to disable">
              </div>
              <div class="form-group">
                <label>TikTok Channel ID (for alerts)</label>
                <input type="text" id="tiktokChannel" value="${guildConfig.tiktokChannelId || ""}" placeholder="Leave empty to disable">
              </div>
              <div class="form-group">
                <label>Kick Channel ID (for alerts)</label>
                <input type="text" id="kickChannel" value="${guildConfig.kickChannelId || ""}" placeholder="Leave empty to disable">
              </div>
              <button type="submit" class="btn">💾 Save Channels</button>
            </form>
          </div>

          <div class="section">
            <h2>🛡️ Moderation</h2>
            <form onsubmit="saveMod(event)">
              <div class="form-group">
                <label>Modlog Channel ID</label>
                <input type="text" id="modlogChannel" value="${guildConfig.modLogChannelId || ""}" placeholder="Leave empty to disable">
              </div>
              <button type="submit" class="btn">💾 Save Moderation</button>
            </form>
          </div>
        </div>

        <script>
          async function savePrefix(e) {
            e.preventDefault();
            const prefix = document.getElementById('prefix').value;
            await saveSetting({ prefix });
          }

          async function saveWelcome(e) {
            e.preventDefault();
            const welcomeMessage = document.getElementById('welcomeMsg').value;
            const welcomeChannelId = document.getElementById('welcomeChannel').value;
            await saveSetting({ welcomeMessage, welcomeChannelId });
          }

          async function saveSocial(e) {
            e.preventDefault();
            const twitchChannelId = document.getElementById('twitchChannel').value;
            const tiktokChannelId = document.getElementById('tiktokChannel').value;
            const kickChannelId = document.getElementById('kickChannel').value;
            await saveSetting({ twitchChannelId, tiktokChannelId, kickChannelId });
          }

          async function saveMod(e) {
            e.preventDefault();
            const modLogChannelId = document.getElementById('modlogChannel').value;
            await saveSetting({ modLogChannelId });
          }

          async function saveSetting(data) {
            try {
              const res = await fetch('/api/config/${guildId}', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              const result = await res.json();
              if (result.success) {
                alert('✅ Settings saved successfully!');
              } else {
                alert('❌ Failed to save settings');
              }
            } catch (error) {
              alert('❌ Error: ' + error.message);
            }
          }
        </script>
      </body>
    </html>
  `);
});

// ============== API: UPDATE CONFIG ==============
app.post("/api/config/:guildId", express.json(), (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, error: "Not authenticated" });

  const guildId = req.params.guildId;
  const userGuilds = req.session.guilds || [];
  const hasAccess = userGuilds.some(g => g.id === guildId);
  
  if (!hasAccess) return res.status(403).json({ success: false, error: "No access" });

  updateGuildConfig(guildId, req.body);
  res.json({ success: true, config: getGuildConfig(guildId) });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server running on port ${PORT}`);
});

// ============== LOGIN ==============
client.login(token);
