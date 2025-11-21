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

  // Help - List all commands
  if (msg.content === "//help") {
    const mainEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🤖 SPIDEY BOT v2.0 - Complete Command Guide")
      .setDescription("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✨ **Multi-Server Discord Bot with Roles • Music • Moderation** ✨\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
      .addFields(
        { name: "📊 Total Commands", value: "**35+ Commands** organized in 7 categories", inline: false },
        { name: "🎯 Features", value: "✅ Custom role categories with GIF banners\n✅ Advanced music player with loop/shuffle\n✅ Full moderation with logging\n✅ Per-server configuration", inline: false }
      );

    const roleEmbed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle("🎭 ROLE CATEGORIES (7 commands)")
      .addFields(
        { name: "📌 //create-category [name]", value: "Create a custom role category", inline: true },
        { name: "➕ //add-role [cat] [name] [ID]", value: "Add role to category", inline: true },
        { name: "➖ //remove-role [cat] [name]", value: "Remove role from category", inline: true },
        { name: "🎬 //set-category-banner [cat] [url]", value: "Add GIF banner (makes it pretty!)", inline: true },
        { name: "🔘 //setup-category [name]", value: "Post selector button with banner", inline: true },
        { name: "📋 //list-roles", value: "View all categories & roles", inline: true },
        { name: "🗑️ //delete-category [name]", value: "Delete entire category", inline: true }
      );

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0xE91E63)
      .setTitle("👋 WELCOME MESSAGES (2 commands)")
      .addFields(
        { name: "💬 //config-welcome-channel #channel", value: "Set where welcome messages go", inline: true },
        { name: "✍️ //config-welcome-message [text]", value: "Create custom welcome message", inline: true },
        { name: "📝 Available Placeholders", value: "`{user}` `{username}` `{displayname}` `{server}` `{membercount}`", inline: false }
      );

    const musicEmbed = new EmbedBuilder()
      .setColor(0x00D084)
      .setTitle("🎵 MUSIC PLAYER (8 commands)")
      .addFields(
        { name: "🎶 //play [song/url]", value: "Search & play from YouTube", inline: true },
        { name: "📊 //queue", value: "Show next 10 songs", inline: true },
        { name: "🔄 //loop", value: "Toggle queue repeat", inline: true },
        { name: "🔀 //shuffle", value: "Randomize the queue", inline: true },
        { name: "🔊 //volume [0-200]", value: "Adjust volume level", inline: true },
        { name: "🎛️ Button Controls", value: "⏮ Back | ⏸ Pause | ▶ Resume | ⏭ Skip | ⏹ Stop", inline: false }
      );

    const modEmbed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle("🛡️ MODERATION (6 commands - with auto-logging!)")
      .addFields(
        { name: "👢 //kick @user [reason]", value: "Remove member from server", inline: true },
        { name: "🔨 //ban @user [reason]", value: "Permanently ban member", inline: true },
        { name: "⚠️ //warn @user [reason]", value: "Warn member (tracked!)", inline: true },
        { name: "🔇 //mute @user", value: "Timeout for 1 hour", inline: true },
        { name: "🔊 //unmute @user", value: "Remove timeout", inline: true },
        { name: "📋 //warnings @user", value: "View member's warning history", inline: true }
      );

    const configEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("⚙️ CONFIGURATION (2 commands)")
      .addFields(
        { name: "🔤 //set-prefix [prefix]", value: "Change command prefix (e.g., ! or $)", inline: true },
        { name: "📝 //config-modlog #channel", value: "Set moderation log channel", inline: true }
      );

    const utilityEmbed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle("📞 UTILITIES (2 commands)")
      .addFields(
        { name: "✅ //remove-roles", value: "Remove any roles you have", inline: true },
        { name: "🏓 //ping", value: "Check bot status & stats", inline: true }
      )
      .setFooter({ text: "💡 Tip: All admin commands require Administrator permission • Moderation actions are auto-logged" });

    return msg.reply({ 
      embeds: [mainEmbed, roleEmbed, welcomeEmbed, musicEmbed, modEmbed, configEmbed, utilityEmbed],
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

// ============== WEB SERVER FOR UPTIME ==============
const app = express();
app.get("/", (req, res) => {
  const uptime = Math.floor(process.uptime());
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  res.send(`
    <html>
      <head>
        <title>SPIDEY BOT Status</title>
        <style>
          body { background: #5865F2; color: white; font-family: Arial; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .container { text-align: center; }
          h1 { font-size: 3em; }
          p { font-size: 1.2em; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 SPIDEY BOT</h1>
          <p>✅ BOT IS ALIVE AND RUNNING</p>
          <p>⏱️ Uptime: ${hours}h ${minutes}m ${seconds}s</p>
        </div>
      </body>
    </html>
  `);
});

const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Web server running on port ${PORT}`);
});

// ============== LOGIN ==============
client.login(token);
