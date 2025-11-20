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
      gameRoles: [],
      watchPartyRoles: [],
      platformRoles: ["PC", "PS", "XBOX"]
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

// ============== REACTIONS & DEFAULTS ==============
const reactions = {
  hug: [
    "https://media.giphy.com/media/l2QDM9Jnim1YVILXa/giphy.gif",
    "https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif"
  ],
  dance: [
    "https://media.giphy.com/media/3o6ZtaO9BZHcOjmErm/giphy.gif",
    "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif"
  ],
  wink: [
    "https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif",
    "https://media.giphy.com/media/3oKIPwoeGErMmaI43C/giphy.gif"
  ]
};

const defaultGameRoles = [
  "Valorant", "Minecraft", "Call Of Duty", "Dying Light 2", "FiveM",
  "Golf With Friends", "Need For Speed", "Fortnite", "Rust", "CarX",
  "HellDivers", "Assetto Corsa (Competizione)", "Formula 1", "Rocket league",
  "Overwatch", "Doom", "League Of Legends", "GTA", "CSGO", "Apex", "Destiny", "Sons Of The Forest"
];

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
  enableLavalink: false
});
player.extractors.loadMulti(DefaultExtractors);

// ============== READY EVENT ==============
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
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
      await welcomeChannel.send(`${member} - ${guildConfig.welcomeMessage}`);
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

  // Ping
  if (msg.content === "//ping") {
    return msg.reply("Pong!");
  }

  // Help - List all commands
  if (msg.content === "//help") {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🤖 SPIDEY BOT Commands")
      .setDescription("**ADMIN COMMANDS (Server Setup):**")
      .addFields(
        { name: "//config-welcome-channel #channel", value: "Set welcome message channel", inline: false },
        { name: "//config-welcome-message [text]", value: "Set custom welcome message", inline: false },
        { name: "//setup-roles", value: "Create gaming role selector", inline: false },
        { name: "//setup-watchparty", value: "Create watch party role selector", inline: false },
        { name: "//setup-platform", value: "Create platform role selector (PC/PS/XBOX)", inline: false },
        { name: "//remove-roles", value: "Show role remover", inline: false },
        { name: "\n**FUN COMMANDS:**", value: "", inline: false },
        { name: "//reactions", value: "Random reaction GIFs (hug, dance, wink)", inline: false },
        { name: "\n**MUSIC COMMANDS:**", value: "", inline: false },
        { name: "//play [song/url]", value: "Play music from YouTube", inline: false },
        { name: "//queue", value: "Show current queue", inline: false },
        { name: "Controls: ⏮ ⏸ ▶ ⏭ ⏹", value: "Previous, Pause, Resume, Skip, Stop", inline: false }
      )
      .setFooter({ text: "SPIDEY BOT - Multi-Server Ready" });
    return msg.reply({ embeds: [helpEmbed] });
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
    if (!welcomeMsg) return msg.reply("Provide a message: //config-welcome-message Your message here");
    updateGuildConfig(msg.guild.id, { welcomeMessage: welcomeMsg });
    return msg.reply(`✅ Welcome message updated!`);
  }

  // Reactions
  if (msg.content === "//reactions") {
    const options = Object.keys(reactions).map((key) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: key,
      emoji: key === "hug" ? "🤗" : key === "dance" ? "💃" : "😉"
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("reaction_menu")
        .setPlaceholder("Choose a reaction...")
        .addOptions(options)
    );
    return msg.channel.send({ content: "Pick a reaction!", components: [row] });
  }

  // Setup roles
  if (msg.content === "//setup-roles") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set up roles!");
    }
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Gaming Role Selection")
      .setDescription("Select the games you play")
      .setFooter({ text: "SPIDEY BOT" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_roles")
        .setLabel("🔔 Claim Gaming Roles")
        .setStyle(ButtonStyle.Primary)
    );
    return msg.channel.send({ embeds: [embed], components: [button] });
  }

  if (msg.content === "//setup-watchparty") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set up roles!");
    }
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Watch Party Role Selection")
      .setDescription("Select watch parties to join")
      .setFooter({ text: "SPIDEY BOT" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_watchparty")
        .setLabel("🔔 Claim Watch Party Roles")
        .setStyle(ButtonStyle.Primary)
    );
    return msg.channel.send({ embeds: [embed], components: [button] });
  }

  if (msg.content === "//setup-platform") {
    if (!msg.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return msg.reply("❌ Only admins can set up roles!");
    }
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Platform Role Selection")
      .setDescription("Select your gaming platform")
      .setFooter({ text: "SPIDEY BOT" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_platform")
        .setLabel("🔔 Claim Platform Roles")
        .setStyle(ButtonStyle.Primary)
    );
    return msg.channel.send({ embeds: [embed], components: [button] });
  }

  if (msg.content === "//remove-roles") {
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("Remove Roles")
      .setDescription("Select roles to remove from yourself")
      .setFooter({ text: "SPIDEY BOT" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("remove_all_roles")
        .setLabel("🔔 Remove Roles")
        .setStyle(ButtonStyle.Danger)
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
});

// ============== INTERACTIONS (BUTTONS & DROPDOWNS) ==============
client.on("interactionCreate", async (interaction) => {
  const guildConfig = getGuildConfig(interaction.guild.id);

  // Gaming roles
  if (interaction.isButton() && interaction.customId === "claim_roles") {
    const gameRoles = defaultGameRoles.map(r => ({ label: r, value: r }));
    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("game_roles")
        .setPlaceholder("Select games...")
        .setMinValues(1)
        .setMaxValues(gameRoles.length)
        .addOptions(gameRoles)
    );
    return interaction.reply({ content: "Select gaming roles:", components: [selectMenu], ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "game_roles") {
    const member = interaction.member;
    const addedRoles = [];
    const notFoundRoles = [];

    for (const roleName of interaction.values) {
      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (role) {
        try {
          await member.roles.add(role);
          addedRoles.push(roleName);
        } catch (error) {
          console.error(`Failed to add role ${roleName}: ${error.message}`);
        }
      } else {
        notFoundRoles.push(roleName);
      }
    }

    let response = addedRoles.length > 0 ? `✅ Added: ${addedRoles.join(", ")}` : "";
    if (notFoundRoles.length > 0) response += `\n⚠️ Not found: ${notFoundRoles.join(", ")}`;

    return interaction.update({ content: response || "No roles added.", components: [] });
  }

  // Watch party roles
  if (interaction.isButton() && interaction.customId === "claim_watchparty") {
    const watchPartyRoles = [
      { label: "Anime", value: "Anime" },
      { label: "Formula 1 WP", value: "Formula 1 WP" }
    ];
    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("watchparty_roles")
        .setPlaceholder("Select watch parties...")
        .setMinValues(1)
        .setMaxValues(watchPartyRoles.length)
        .addOptions(watchPartyRoles)
    );
    return interaction.reply({ content: "Select watch party roles:", components: [selectMenu], ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === "watchparty_roles") {
    const member = interaction.member;
    const addedRoles = [];

    for (const roleName of interaction.values) {
      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (role) {
        try {
          await member.roles.add(role);
          addedRoles.push(roleName);
        } catch (error) {
          console.error(`Failed to add role ${roleName}: ${error.message}`);
        }
      }
    }

    return interaction.update({ content: `✅ Added: ${addedRoles.join(", ")}`, components: [] });
  }

  // Platform roles
  if (interaction.isButton() && interaction.customId === "claim_platform") {
    const platformRoles = [
      { label: "PC", value: "PC" },
      { label: "PS", value: "PS" },
      { label: "XBOX", value: "XBOX" }
    ];
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
    const addedRoles = [];

    for (const roleName of interaction.values) {
      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (role) {
        try {
          await member.roles.add(role);
          addedRoles.push(roleName);
        } catch (error) {
          console.error(`Failed to add role ${roleName}: ${error.message}`);
        }
      }
    }

    return interaction.update({ content: `✅ Added: ${addedRoles.join(", ")}`, components: [] });
  }

  // Remove roles
  if (interaction.isButton() && interaction.customId === "remove_all_roles") {
    const allRoles = defaultGameRoles.concat(["Anime", "Formula 1 WP", "PC", "PS", "XBOX"]).map(r => ({ label: r, value: r }));
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
    const removedRoles = [];

    for (const roleName of interaction.values) {
      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (role && member.roles.cache.has(role.id)) {
        try {
          await member.roles.remove(role);
          removedRoles.push(roleName);
        } catch (error) {
          console.error(`Failed to remove role ${roleName}: ${error.message}`);
        }
      }
    }

    return interaction.update({ content: `✅ Removed: ${removedRoles.join(", ")}`, components: [] });
  }

  // Reactions
  if (interaction.isStringSelectMenu() && interaction.customId === "reaction_menu") {
    const choice = interaction.values[0];
    const gifs = reactions[choice];
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
    return interaction.reply({ content: `${interaction.user} chose **${choice}**! ${randomGif}`, ephemeral: false });
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
app.get("/", (req, res) => res.send("🤖 SPIDEY BOT is alive!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// ============== LOGIN ==============
client.login(token);
