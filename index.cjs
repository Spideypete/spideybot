// index.cjs - Discord bot with dropdown reactions + 24/7 uptime server

// ------------------ Imports ------------------
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
require("dotenv").config(); // Loads TOKEN from .env
const express = require("express"); // For web server

// ------------------ Reaction GIFs ------------------
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

// ------------------ Client Setup ------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
});

const token = process.env.TOKEN;

// ------------------ Ready Event ------------------
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ------------------ Welcome New Members ------------------
client.on("guildMemberAdd", async (member) => {
  console.log(`New member joined: ${member.user.tag}`);

  // Send welcome message to the specific welcome channel
  const welcomeChannelId = "1235015412035358721";
  const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

  if (welcomeChannel) {
    const welcomeMessage = `Hello ${member}
Welcome to our community! We're thrilled to have you here. Before you begin your journey with us, we kindly ask that you take a moment to familiarize yourself with our community guidelines by reading our <#1235015412035358723>. This ensures that everyone has a positive and enjoyable experience.

Next, please <#1235015412035358720> yourself to gain access to all the features and channels within our server. Verification helps us maintain a safe and welcoming environment for all members.

Once you're verified, don't forget to check out our <#1235015412035358726>! These allow you to personalize your experience and join specific channels tailored to your interests. Whether you're a gamer, an artist, or a music enthusiast, there's a role for you.

Thank you for joining us, and we hope you have a fantastic time connecting with fellow members and exploring everything our community has to offer!`;

    try {
      await welcomeChannel.send(welcomeMessage);
      console.log(`Sent welcome message for ${member.user.tag} to welcome channel`);
    } catch (error) {
      console.error(`Failed to send welcome message: ${error.message}`);
    }
  } else {
    console.log(`Welcome channel not found (ID: ${welcomeChannelId})`);
  }
});

// ------------------ Message Commands ------------------
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  // Ping command
  if (msg.content.toLowerCase() === "!ping") {
    msg.reply("Pong!");
  }

  // Trigger dropdown menu
  if (msg.content.toLowerCase() === "!reactions") {
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

    await msg.channel.send({ content: "Pick a reaction!", components: [row] });
  }

  // Setup gaming role selection message
  if (msg.content.toLowerCase() === "!setup-roles") {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Trippy Webs Role Selection")
      .setDescription(
        "By choosing self-roles, you'll have access to all the gaming voice and text channels.\n\n" +
        "**Available Roles:**\n\n" +
        ">Valorant\n" +
        ">Minecraft\n" +
        ">Call Of Duty\n" +
        ">Dying Light 2\n" +
        ">FiveM\n" +
        ">Golf With Friends\n" +
        ">Need For Speed\n" +
        ">Fortnite\n" +
        ">Rust\n" +
        ">CarX\n" +
        ">HellDivers\n" +
        ">Assetto Corsa (Competizione)\n" +
        ">Formula 1\n" +
        ">Rocket league\n" +
        ">Overwatch\n" +
        ">Doom\n" +
        ">League Of Legends\n" +
        ">GTA\n" +
        ">CSGO\n" +
        ">Apex\n" +
        ">Destiny\n" +
        ">Sons Of The Forest\n\n" +
        "Expect more server notifications upon claiming roles!"
      )
      .setFooter({ text: "Spidey" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_roles")
        .setLabel("🔔 Claim Self-Roles")
        .setStyle(ButtonStyle.Primary)
    );

    await msg.channel.send({ embeds: [embed], components: [button] });
  }

  // Setup watch party role selection message
  if (msg.content.toLowerCase() === "!setup-watchparty") {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Trippy Webs Role Selection")
      .setDescription(
        "By choosing self-roles, you'll have access to all the Watch Party voice and text channels.\n\n" +
        "**Available Roles:**\n\n" +
        ">Anime\n" +
        ">Formula 1 WP\n\n" +
        "Expect more server notifications upon claiming roles!"
      )
      .setFooter({ text: "Spidey" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_watchparty")
        .setLabel("🔔 Claim Self-Roles")
        .setStyle(ButtonStyle.Primary)
    );

    await msg.channel.send({ embeds: [embed], components: [button] });
  }

  // Setup platform role selection message
  if (msg.content.toLowerCase() === "!setup-platform") {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("Trippy Webs Role Selection")
      .setDescription(
        "By choosing self-roles, it will show what platform you use.\n\n" +
        "**Available Roles:**\n\n" +
        ">PC\n" +
        ">PS\n" +
        ">XBOX\n\n" +
        "Expect more server notifications upon claiming roles!"
      )
      .setFooter({ text: "Spidey" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("claim_platform")
        .setLabel("🔔 Claim Self-Roles")
        .setStyle(ButtonStyle.Primary)
    );

    await msg.channel.send({ embeds: [embed], components: [button] });
  }

  // Remove gaming roles command
  if (msg.content.toLowerCase() === "!remove-roles") {
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("Remove Gaming Roles")
      .setDescription(
        "Select the gaming roles you want to remove from your profile.\n\n" +
        "Click the button below to see your available roles to remove."
      )
      .setFooter({ text: "Spidey" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("remove_game_roles")
        .setLabel("🗑️ Remove Gaming Roles")
        .setStyle(ButtonStyle.Danger)
    );

    await msg.channel.send({ embeds: [embed], components: [button] });
  }

  // Remove watch party roles command
  if (msg.content.toLowerCase() === "!remove-watchparty") {
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("Remove Watch Party Roles")
      .setDescription(
        "Select the watch party roles you want to remove from your profile.\n\n" +
        "Click the button below to see your available roles to remove."
      )
      .setFooter({ text: "Spidey" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("remove_watchparty_roles")
        .setLabel("🗑️ Remove Watch Party Roles")
        .setStyle(ButtonStyle.Danger)
    );

    await msg.channel.send({ embeds: [embed], components: [button] });
  }

  // Remove platform roles command
  if (msg.content.toLowerCase() === "!remove-platform") {
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("Remove Platform Roles")
      .setDescription(
        "Select the platform roles you want to remove from your profile.\n\n" +
        "Click the button below to see your available roles to remove."
      )
      .setFooter({ text: "Spidey" });

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("remove_platform_roles")
        .setLabel("🗑️ Remove Platform Roles")
        .setStyle(ButtonStyle.Danger)
    );

    await msg.channel.send({ embeds: [embed], components: [button] });
  }
});

// ------------------ Handle Button & Dropdown Interactions ------------------
client.on("interactionCreate", async (interaction) => {
  // Handle role selection button
  if (interaction.isButton() && interaction.customId === "claim_roles") {
    const gameRoles = [
      { label: "Valorant", value: "Valorant" },
      { label: "Minecraft", value: "Minecraft" },
      { label: "Call Of Duty", value: "Call Of Duty" },
      { label: "Dying Light 2", value: "Dying Light 2" },
      { label: "FiveM", value: "FiveM" },
      { label: "Golf With Friends", value: "Golf With Friends" },
      { label: "Need For Speed", value: "Need For Speed" },
      { label: "Fortnite", value: "Fortnite" },
      { label: "Rust", value: "Rust" },
      { label: "CarX", value: "CarX" },
      { label: "HellDivers", value: "HellDivers" },
      { label: "Assetto Corsa (Competizione)", value: "Assetto Corsa (Competizione)" },
      { label: "Formula 1", value: "Formula 1" },
      { label: "Rocket league", value: "Rocket league" },
      { label: "Overwatch", value: "Overwatch" },
      { label: "Doom", value: "Doom" },
      { label: "League Of Legends", value: "League Of Legends" },
      { label: "GTA", value: "GTA" },
      { label: "CSGO", value: "CSGO" },
      { label: "Apex", value: "Apex" },
      { label: "Destiny", value: "Destiny" },
      { label: "Sons Of The Forest", value: "Sons Of The Forest" }
    ];

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("game_roles")
        .setPlaceholder("Select your game roles...")
        .setMinValues(1)
        .setMaxValues(gameRoles.length)
        .addOptions(gameRoles)
    );

    await interaction.reply({
      content: "Select the game roles you want to claim:",
      components: [selectMenu],
      ephemeral: true
    });
  }

  // Handle watch party button
  if (interaction.isButton() && interaction.customId === "claim_watchparty") {
    const watchPartyRoles = [
      { label: "Anime", value: "Anime" },
      { label: "Formula 1 WP", value: "Formula 1 WP" }
    ];

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("watchparty_roles")
        .setPlaceholder("Select your watch party roles...")
        .setMinValues(1)
        .setMaxValues(watchPartyRoles.length)
        .addOptions(watchPartyRoles)
    );

    await interaction.reply({
      content: "Select the watch party roles you want to claim:",
      components: [selectMenu],
      ephemeral: true
    });
  }

  // Handle platform button
  if (interaction.isButton() && interaction.customId === "claim_platform") {
    const platformRoles = [
      { label: "PC", value: "PC" },
      { label: "PS", value: "PS" },
      { label: "XBOX", value: "XBOX" }
    ];

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("platform_roles")
        .setPlaceholder("Select your platform...")
        .setMinValues(1)
        .setMaxValues(platformRoles.length)
        .addOptions(platformRoles)
    );

    await interaction.reply({
      content: "Select the platform roles you want to claim:",
      components: [selectMenu],
      ephemeral: true
    });
  }

  // Handle remove game roles button
  if (interaction.isButton() && interaction.customId === "remove_game_roles") {
    const gameRoles = [
      { label: "Valorant", value: "Valorant" },
      { label: "Minecraft", value: "Minecraft" },
      { label: "Call Of Duty", value: "Call Of Duty" },
      { label: "Dying Light 2", value: "Dying Light 2" },
      { label: "FiveM", value: "FiveM" },
      { label: "Golf With Friends", value: "Golf With Friends" },
      { label: "Need For Speed", value: "Need For Speed" },
      { label: "Fortnite", value: "Fortnite" },
      { label: "Rust", value: "Rust" },
      { label: "CarX", value: "CarX" },
      { label: "HellDivers", value: "HellDivers" },
      { label: "Assetto Corsa (Competizione)", value: "Assetto Corsa (Competizione)" },
      { label: "Formula 1", value: "Formula 1" },
      { label: "Rocket league", value: "Rocket league" },
      { label: "Overwatch", value: "Overwatch" },
      { label: "Doom", value: "Doom" },
      { label: "League Of Legends", value: "League Of Legends" },
      { label: "GTA", value: "GTA" },
      { label: "CSGO", value: "CSGO" },
      { label: "Apex", value: "Apex" },
      { label: "Destiny", value: "Destiny" },
      { label: "Sons Of The Forest", value: "Sons Of The Forest" }
    ];

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("remove_game_roles_select")
        .setPlaceholder("Select roles to remove...")
        .setMinValues(1)
        .setMaxValues(gameRoles.length)
        .addOptions(gameRoles)
    );

    await interaction.reply({
      content: "Select the gaming roles you want to remove:",
      components: [selectMenu],
      ephemeral: true
    });
  }

  // Handle remove watch party roles button
  if (interaction.isButton() && interaction.customId === "remove_watchparty_roles") {
    const watchPartyRoles = [
      { label: "Anime", value: "Anime" },
      { label: "Formula 1 WP", value: "Formula 1 WP" }
    ];

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("remove_watchparty_roles_select")
        .setPlaceholder("Select roles to remove...")
        .setMinValues(1)
        .setMaxValues(watchPartyRoles.length)
        .addOptions(watchPartyRoles)
    );

    await interaction.reply({
      content: "Select the watch party roles you want to remove:",
      components: [selectMenu],
      ephemeral: true
    });
  }

  // Handle remove platform roles button
  if (interaction.isButton() && interaction.customId === "remove_platform_roles") {
    const platformRoles = [
      { label: "PC", value: "PC" },
      { label: "PS", value: "PS" },
      { label: "XBOX", value: "XBOX" }
    ];

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("remove_platform_roles_select")
        .setPlaceholder("Select roles to remove...")
        .setMinValues(1)
        .setMaxValues(platformRoles.length)
        .addOptions(platformRoles)
    );

    await interaction.reply({
      content: "Select the platform roles you want to remove:",
      components: [selectMenu],
      ephemeral: true
    });
  }

  // Handle game role selection
  if (interaction.isStringSelectMenu() && interaction.customId === "game_roles") {
    const selectedRoles = interaction.values;
    const member = interaction.member;
    const addedRoles = [];
    const notFoundRoles = [];

    for (const roleName of selectedRoles) {
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

    let response = "";
    if (addedRoles.length > 0) {
      response += `✅ Successfully added: ${addedRoles.join(", ")}`;
    }
    if (notFoundRoles.length > 0) {
      response += `\n⚠️ Roles not found on server: ${notFoundRoles.join(", ")}`;
    }

    await interaction.update({
      content: response || "No roles were added.",
      components: []
    });
  }

  // Handle watch party role selection
  if (interaction.isStringSelectMenu() && interaction.customId === "watchparty_roles") {
    const selectedRoles = interaction.values;
    const member = interaction.member;
    const addedRoles = [];
    const notFoundRoles = [];

    for (const roleName of selectedRoles) {
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

    let response = "";
    if (addedRoles.length > 0) {
      response += `✅ Successfully added: ${addedRoles.join(", ")}`;
    }
    if (notFoundRoles.length > 0) {
      response += `\n⚠️ Roles not found on server: ${notFoundRoles.join(", ")}`;
    }

    await interaction.update({
      content: response || "No roles were added.",
      components: []
    });
  }

  // Handle platform role selection
  if (interaction.isStringSelectMenu() && interaction.customId === "platform_roles") {
    const selectedRoles = interaction.values;
    const member = interaction.member;
    const addedRoles = [];
    const notFoundRoles = [];

    for (const roleName of selectedRoles) {
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

    let response = "";
    if (addedRoles.length > 0) {
      response += `✅ Successfully added: ${addedRoles.join(", ")}`;
    }
    if (notFoundRoles.length > 0) {
      response += `\n⚠️ Roles not found on server: ${notFoundRoles.join(", ")}`;
    }

    await interaction.update({
      content: response || "No roles were added.",
      components: []
    });
  }

  // Handle remove game roles selection
  if (interaction.isStringSelectMenu() && interaction.customId === "remove_game_roles_select") {
    const selectedRoles = interaction.values;
    const member = interaction.member;
    const removedRoles = [];
    const notFoundRoles = [];

    for (const roleName of selectedRoles) {
      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (role && member.roles.cache.has(role.id)) {
        try {
          await member.roles.remove(role);
          removedRoles.push(roleName);
        } catch (error) {
          console.error(`Failed to remove role ${roleName}: ${error.message}`);
        }
      } else if (!role) {
        notFoundRoles.push(roleName);
      }
    }

    let response = "";
    if (removedRoles.length > 0) {
      response += `✅ Successfully removed: ${removedRoles.join(", ")}`;
    }
    if (notFoundRoles.length > 0) {
      response += `\n⚠️ Roles not found on server: ${notFoundRoles.join(", ")}`;
    }
    if (removedRoles.length === 0 && notFoundRoles.length === 0) {
      response = "You don't have any of the selected roles.";
    }

    await interaction.update({
      content: response,
      components: []
    });
  }

  // Handle remove watch party roles selection
  if (interaction.isStringSelectMenu() && interaction.customId === "remove_watchparty_roles_select") {
    const selectedRoles = interaction.values;
    const member = interaction.member;
    const removedRoles = [];
    const notFoundRoles = [];

    for (const roleName of selectedRoles) {
      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (role && member.roles.cache.has(role.id)) {
        try {
          await member.roles.remove(role);
          removedRoles.push(roleName);
        } catch (error) {
          console.error(`Failed to remove role ${roleName}: ${error.message}`);
        }
      } else if (!role) {
        notFoundRoles.push(roleName);
      }
    }

    let response = "";
    if (removedRoles.length > 0) {
      response += `✅ Successfully removed: ${removedRoles.join(", ")}`;
    }
    if (notFoundRoles.length > 0) {
      response += `\n⚠️ Roles not found on server: ${notFoundRoles.join(", ")}`;
    }
    if (removedRoles.length === 0 && notFoundRoles.length === 0) {
      response = "You don't have any of the selected roles.";
    }

    await interaction.update({
      content: response,
      components: []
    });
  }

  // Handle remove platform roles selection
  if (interaction.isStringSelectMenu() && interaction.customId === "remove_platform_roles_select") {
    const selectedRoles = interaction.values;
    const member = interaction.member;
    const removedRoles = [];
    const notFoundRoles = [];

    for (const roleName of selectedRoles) {
      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (role && member.roles.cache.has(role.id)) {
        try {
          await member.roles.remove(role);
          removedRoles.push(roleName);
        } catch (error) {
          console.error(`Failed to remove role ${roleName}: ${error.message}`);
        }
      } else if (!role) {
        notFoundRoles.push(roleName);
      }
    }

    let response = "";
    if (removedRoles.length > 0) {
      response += `✅ Successfully removed: ${removedRoles.join(", ")}`;
    }
    if (notFoundRoles.length > 0) {
      response += `\n⚠️ Roles not found on server: ${notFoundRoles.join(", ")}`;
    }
    if (removedRoles.length === 0 && notFoundRoles.length === 0) {
      response = "You don't have any of the selected roles.";
    }

    await interaction.update({
      content: response,
      components: []
    });
  }

  // Handle reaction menu
  if (interaction.isStringSelectMenu() && interaction.customId === "reaction_menu") {
    const choice = interaction.values[0];
    const gifs = reactions[choice];
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

    await interaction.reply({
      content: `${interaction.user} chose **${choice}**! ${randomGif}`,
      ephemeral: false
    });
  }
});

// ------------------ Tiny Web Server for 24/7 uptime ------------------
const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});

// ------------------ Login ------------------
client.login(token);
