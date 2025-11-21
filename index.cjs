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
      musicLoopMode: false,
      musicShuffle: false,
      musicVolume: 100,
      warnings: {}
    };
    saveConfig(config);
  }
  return config.guilds[guildId];
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
      .setTitle("📞 UTILITIES (3 commands)")
      .addFields(
        { name: "✅ //remove-roles", value: "Remove any roles you have", inline: true },
        { name: "🏓 //ping", value: "Check bot status & stats", inline: true },
        { name: "👑 //adminhelp", value: "View all admin commands (admins only)", inline: true }
      )
      .setFooter({ text: "💡 Admins: Use //adminhelp for full command list" });

    return msg.reply({ 
      embeds: [mainEmbed, musicEmbed, utilityEmbed],
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
      .setTitle("📱 SOCIAL MEDIA (8 commands + API)")
      .addFields(
        { name: "🎮 //add-twitch-user [user]", value: "Add Twitch creator to monitor", inline: true },
        { name: "➖ //remove-twitch-user [user]", value: "Remove Twitch creator", inline: true },
        { name: "📋 //list-twitch-users", value: "View monitored Twitch creators", inline: true },
        { name: "📢 //config-twitch-channel #ch", value: "Set Twitch alert channel", inline: true },
        { name: "🎵 //add-tiktok-user [user]", value: "Add TikTok creator to monitor", inline: true },
        { name: "➖ //remove-tiktok-user [user]", value: "Remove TikTok creator", inline: true },
        { name: "📋 //list-tiktok-users", value: "View monitored TikTok creators", inline: true },
        { name: "📢 //config-tiktok-channel #ch", value: "Set TikTok alert channel", inline: true },
        { name: "🌐 WEB API", value: "Admin dashboard at `/admin` • 3 REST endpoints", inline: false }
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
      embeds: [adminMainEmbed, adminRoleEmbed, adminWelcomeEmbed, adminConfigEmbed, adminSocialEmbed, adminModEmbed],
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

// Landing Page
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>SPIDEY BOT - Advanced Discord Bot</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #000000; color: white; line-height: 1.6; }
          nav { background: #111111; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
          nav a { color: white; text-decoration: none; margin: 0 1rem; }
          nav a:hover { color: #FFD700; }
          .hero { text-align: center; padding: 6rem 2rem; }
          .hero h1 { font-size: 3.5rem; margin-bottom: 1rem; color: white; }
          .hero p { font-size: 1.3rem; margin-bottom: 2rem; opacity: 0.9; color: white; }
          .btn { display: inline-block; padding: 1rem 2rem; background: #FFD700; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0.5rem; transition: all 0.3s; border: none; cursor: pointer; font-size: 1rem; }
          .btn:hover { background: #FFC700; transform: scale(1.05); }
          .btn-secondary { background: transparent; color: #FFD700; border: 2px solid #FFD700; }
          .btn-secondary:hover { background: #FFD700; color: #000; }
          .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; }
          .feature { background: #1a1a1a; padding: 2rem; border-radius: 10px; border: 1px solid #333; }
          .feature h3 { font-size: 1.5rem; margin-bottom: 1rem; color: white; }
          .feature-icon { font-size: 2.5rem; margin-bottom: 1rem; }
          .stats { background: #111111; padding: 2rem; text-align: center; }
          .stat { display: inline-block; margin: 1rem 2rem; }
          .stat h2 { font-size: 2rem; color: #FFD700; }
          .commands { max-width: 1200px; margin: 3rem auto; padding: 2rem; }
          .command-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
          .command-card { background: #1a1a1a; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #FFD700; }
          .command-card h4 { margin-bottom: 0.5rem; color: white; }
          .command-card p { opacity: 0.8; font-size: 0.9rem; color: white; }
          footer { background: #111111; text-align: center; padding: 2rem; margin-top: 3rem; border-top: 1px solid #333; }
        </style>
      </head>
      <body>
        <nav>
          <div style="font-size: 1.5rem; font-weight: bold;">🤖 SPIDEY BOT</div>
          <div>
            <a href="/">Home</a>
            <a href="/features">Features</a>
            <a href="/commands">Commands</a>
            <a href="#invite">Invite</a>
          </div>
        </nav>

        <div class="hero">
          <h1>🤖 SPIDEY BOT</h1>
          <p>The Ultimate Discord Bot for Music, Moderation & Community Management</p>
          <a href="${botInviteURL}" target="_blank" class="btn">➕ Add to Discord</a>
          <a href="/commands" class="btn btn-secondary">📚 View Commands</a>
        </div>

        <div class="stats">
          <div class="stat">
            <h2>35+</h2>
            <p>Commands</p>
          </div>
          <div class="stat">
            <h2>∞</h2>
            <p>Servers</p>
          </div>
          <div class="stat">
            <h2>5</h2>
            <p>Feature Categories</p>
          </div>
        </div>

        <div class="features">
          <div class="feature">
            <div class="feature-icon">🎵</div>
            <h3>Advanced Music</h3>
            <p>Search YouTube, create playlists, loop/shuffle, volume control with button controls</p>
          </div>
          <div class="feature">
            <div class="feature-icon">🎭</div>
            <h3>Role Management</h3>
            <p>Custom role categories with GIF banners, interactive role selectors</p>
          </div>
          <div class="feature">
            <div class="feature-icon">🛡️</div>
            <h3>Moderation</h3>
            <p>Kick, ban, warn with automatic logging. Track member warnings</p>
          </div>
          <div class="feature">
            <div class="feature-icon">📱</div>
            <h3>Social Media</h3>
            <p>Monitor unlimited Twitch streamers and TikTok creators with auto-alerts</p>
          </div>
          <div class="feature">
            <div class="feature-icon">👋</div>
            <h3>Welcome System</h3>
            <p>Custom welcome messages with placeholders for user info and server details</p>
          </div>
          <div class="feature">
            <div class="feature-icon">⚙️</div>
            <h3>Per-Server Config</h3>
            <p>Each server gets independent settings, prefix, and customization</p>
          </div>
        </div>

        <div class="commands">
          <h2 style="text-align: center; margin-bottom: 2rem;">🎯 Core Features</h2>
          <div class="command-row">
            <div class="command-card">
              <h4>🎵 Music Player</h4>
              <p>//play [song] • //queue • //loop • //shuffle • //volume [0-200]</p>
            </div>
            <div class="command-card">
              <h4>🎭 Role Categories</h4>
              <p>//create-category • //add-role • //setup-category • //list-roles</p>
            </div>
            <div class="command-card">
              <h4>🛡️ Moderation</h4>
              <p>//kick • //ban • //warn • //mute • //unmute • //warnings</p>
            </div>
            <div class="command-card">
              <h4>📱 Social Media</h4>
              <p>//add-twitch-user • //add-tiktok-user • //config-twitch-channel</p>
            </div>
            <div class="command-card">
              <h4>👋 Welcome</h4>
              <p>//config-welcome-channel • //config-welcome-message</p>
            </div>
            <div class="command-card">
              <h4>⚙️ Configuration</h4>
              <p>//set-prefix • //config-modlog • Unlimited per-server customization</p>
            </div>
          </div>
        </div>

        <div id="invite" style="text-align: center; padding: 3rem 2rem; background: rgba(0,0,0,0.3);">
          <h2>Ready to Add SPIDEY BOT?</h2>
          <p style="margin: 1rem 0;">Get your server powered up with music, moderation & more!</p>
          <a href="${botInviteURL}" target="_blank" class="btn">➕ Invite SPIDEY BOT Now</a>
        </div>

        <footer>
          <p>🤖 SPIDEY BOT © 2025 • Multi-Server Discord Bot</p>
          <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">Use //help in Discord to see all commands • Admins use //adminhelp</p>
        </footer>
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
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #000000; color: white; }
          nav { background: #111111; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
          nav a { color: white; text-decoration: none; margin: 0 1rem; }
          nav a:hover { color: #FFD700; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          h1 { text-align: center; font-size: 2.5rem; margin: 2rem 0; color: white; }
          .feature-section { background: #1a1a1a; padding: 2rem; margin: 2rem 0; border-radius: 10px; border-left: 4px solid #FFD700; }
          .feature-section h2 { color: #FFD700; margin-bottom: 1rem; }
          .feature-section ul { margin-left: 2rem; }
          .feature-section li { margin: 0.5rem 0; color: white; }
          .btn { display: inline-block; padding: 0.8rem 1.5rem; background: #FFD700; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 1rem 0; }
          .btn:hover { background: #FFC700; }
        </style>
      </head>
      <body>
        <nav>
          <div style="font-size: 1.5rem; font-weight: bold;">🤖 SPIDEY BOT</div>
          <div>
            <a href="/">Home</a>
            <a href="/features">Features</a>
            <a href="/commands">Commands</a>
          </div>
        </nav>

        <div class="container">
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
        </div>
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
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #000000; color: white; }
          nav { background: #111111; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
          nav a { color: white; text-decoration: none; margin: 0 1rem; }
          nav a:hover { color: #FFD700; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          h1 { text-align: center; font-size: 2.5rem; margin: 2rem 0; color: white; }
          h2 { color: #FFD700; margin: 2rem 0 1rem 0; border-bottom: 2px solid #FFD700; padding-bottom: 0.5rem; }
          .cmd-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
          .cmd-card { background: #1a1a1a; padding: 1rem; border-radius: 5px; border-left: 3px solid #FFD700; }
          .cmd-card code { background: #333; padding: 0.2rem 0.5rem; border-radius: 3px; color: #FFD700; }
          .cmd-card p { opacity: 0.8; margin-top: 0.5rem; font-size: 0.9rem; color: white; }
          .btn { display: inline-block; padding: 0.8rem 1.5rem; background: #FFD700; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 1rem 0; }
          .btn:hover { background: #FFC700; }
          .note { background: #1a1a1a; border-left: 3px solid #FFD700; padding: 1rem; border-radius: 5px; margin: 1rem 0; color: white; }
        </style>
      </head>
      <body>
        <nav>
          <div style="font-size: 1.5rem; font-weight: bold;">🤖 SPIDEY BOT</div>
          <div>
            <a href="/">Home</a>
            <a href="/features">Features</a>
            <a href="/commands">Commands</a>
          </div>
        </nav>

        <div class="container">
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
            button { padding: 10px 20px; background: #FFD700; color: black; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px; font-weight: bold; }
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
            .setDescription(`**${body.event?.broadcaster_user_login}** is now live on Twitch!`)
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

const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server running on port ${PORT}`);
});

// ============== LOGIN ==============
client.login(token);
