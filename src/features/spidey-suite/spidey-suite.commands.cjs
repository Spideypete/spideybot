const { SlashCommandBuilder } = require('discord.js');

// Testing reset: keep only the dedicated AI assistant slash command.
// Add new commands back only after the owner defines their section and behavior.
const spideyCommands = [
  new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask the SPIDEY BOT AI assistant')
    .setDMPermission(false)
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('What would you like to ask?')
        .setRequired(true)
        .setMaxLength(1500)
    )
];

module.exports = { spideyCommands };
