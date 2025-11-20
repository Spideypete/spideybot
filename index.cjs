// index.cjs - CommonJS version

const { Client, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Make sure this intent is enabled in Developer Portal
  ],
});

// Bot ready event
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Message event
client.on("messageCreate", (msg) => {
  if (msg.author.bot) return; // Ignore bot messages

  if (msg.content.toLowerCase() === "!ping") {
    msg.reply("Pong!");
  }
});

// Login
client.login(process.env.TOKEN);
