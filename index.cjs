// index.cjs - Discord bot with dropdown reactions + 24/7 uptime server

// ------------------ Imports ------------------
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder
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

Once you're verified, don't forget to check out our 🪪𝑺𝒆𝒍𝒇-𝑹𝒐𝒍𝒆𝒔! These allow you to personalize your experience and join specific channels tailored to your interests. Whether you're a gamer, an artist, or a music enthusiast, there's a role for you.

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
});

// ------------------ Handle Dropdown Selections ------------------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "reaction_menu") {
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
