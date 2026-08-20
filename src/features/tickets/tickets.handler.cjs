const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionFlagsBits,
  Events
} = require('discord.js');
const ticketsService = require('./tickets.service.cjs');

function buildTicketEmbed(ticket, action = 'created') {
  const embed = new EmbedBuilder()
    .setColor('#9146FF')
    .setTitle(`🎫 Support Ticket ${ticket.id}`)
    .setDescription(`Ticket ${action} by <@${ticket.userId}>`)
    .addFields(
      { name: 'Status', value: ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1), inline: true },
      { name: 'Created', value: `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: 'SPIDEY BOT Tickets' })
    .setTimestamp();

  if (ticket.claimedBy) {
    embed.addFields({ name: 'Claimed By', value: `<@${ticket.claimedBy}>`, inline: true });
  }

  if (ticket.closedAt) {
    embed.addFields({ name: 'Closed', value: `<t:${Math.floor(new Date(ticket.closedAt).getTime() / 1000)}:R>`, inline: true });
  }

  return embed;
}

function buildControlRow(ticketId, canClaim = true, canClose = true) {
  const components = [];

  if (canClaim) {
    components.push(
      new ButtonBuilder()
        .setCustomId(`ticket_claim_${ticketId}`)
        .setLabel('Claim')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✋')
    );
  }

  if (canClose) {
    components.push(
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticketId}`)
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );
  }

  if (components.length > 0) {
    return new ActionRowBuilder().addComponents(components);
  }

  return null;
}

async function sendTranscript(guild, ticket, config) {
  if (!config.transcriptChannelId) return;

  const transcriptChannel = guild.channels.cache.get(config.transcriptChannelId);
  if (!transcriptChannel || transcriptChannel.type !== ChannelType.GuildText) return;

  try {
    const ticketChannel = guild.channels.cache.get(ticket.channelId);
    let transcript = `Ticket ${ticket.id} Transcript\nCreated by <@${ticket.userId}>\nClosed at ${ticket.closedAt}\n\n`;

    if (ticketChannel && ticketChannel.messages) {
      const messages = await ticketChannel.messages.fetch({ limit: 100 });
      messages.reverse().forEach(msg => {
        transcript += `[${new Date(msg.createdAt).toISOString()}] <@${msg.author.id}>: ${msg.content}\n`;
      });
    }

    await transcriptChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('#9146FF')
          .setTitle(`📜 Transcript: ${ticket.id}`)
          .setDescription(`\`\`\`\n${transcript.slice(0, 4000)}\n\`\`\``)
          .setFooter({ text: 'SPIDEY BOT' })
          .setTimestamp()
      ]
    });

    ticketsService.setTicketTranscript(ticket.guildId, ticket.id, transcript);
  } catch (err) {
    console.error(`Failed to send transcript for ${ticket.id}:`, err.message);
  }
}

async function handleTicketCreate(interaction) {
  const guild = interaction.guild;
  const user = interaction.user;
  const config = ticketsService.getConfig(guild.id);

  if (!config.enabled) {
    return interaction.reply({ content: 'Ticket system is not enabled.', ephemeral: true });
  }

  if (!config.categoryId) {
    return interaction.reply({ content: 'Ticket category not configured.', ephemeral: true });
  }

  const existingOpen = ticketsService.getOpenTickets(guild.id).find(t => t.userId === user.id);
  if (existingOpen) {
    const ch = guild.channels.cache.get(existingOpen.channelId);
    return interaction.reply({
      content: `You already have an open ticket: ${ch ? ch.toString() : existingOpen.channelId}`,
      ephemeral: true
    });
  }

  const ticketId = ticketsService.generateTicketId(guild.id);
  const channelName = `${config.ticketPrefix || 'ticket'}-${ticketId.split('-')[1]}`;

  const permissionOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
  ];

  if (config.supportRoleId) {
    permissionOverwrites.push({
      id: config.supportRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
    });
  }

  let parentId = config.categoryId;
  const category = guild.channels.cache.get(parentId);
  if (!category || category.type !== ChannelType.GuildCategory) {
    parentId = null;
  }

  try {
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentId,
      permissionOverwrites
    });

    const result = ticketsService.createTicket(guild.id, user.id, channel.id);
    if (!result.success) {
      await channel.delete();
      return interaction.reply({ content: result.error, ephemeral: true });
    }

    const ticket = result.ticket;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('#9146FF')
          .setTitle(`🎫 Ticket ${ticket.id}`)
          .setDescription(`Hello ${user},\n\nPlease describe your issue and a staff member will be with you shortly.`)
          .addFields(
            { name: 'User', value: user.toString(), inline: true },
            { name: 'Status', value: 'Open', inline: true }
          )
          .setFooter({ text: 'SPIDEY BOT' })
          .setTimestamp()
      ],
      components: [buildControlRow(ticket.id)]
    });

    return interaction.reply({ content: `Ticket created: ${channel.toString()}`, ephemeral: true });
  } catch (err) {
    console.error('Failed to create ticket channel:', err);
    return interaction.reply({ content: `Failed to create ticket: ${err.message}`, ephemeral: true });
  }
}

async function handleTicketInteraction(interaction) {
  if (!interaction.isButton()) return;

  const [action, type, ticketId] = interaction.customId.split('_');

  if (action !== 'ticket' || !ticketId) return;

  const guild = interaction.guild;
  const ticket = ticketsService.getTicket(guild.id, ticketId);

  if (!ticket) {
    return interaction.reply({ content: 'Ticket not found.', ephemeral: true });
  }

  if (type === 'close') {
    const closeResult = ticketsService.closeTicket(guild.id, ticketId);
    if (!closeResult.success) {
      return interaction.reply({ content: closeResult.error, ephemeral: true });
    }

    const config = ticketsService.getConfig(guild.id);
    await sendTranscript(guild, ticket, config);

    const channel = interaction.channel;
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor('#ED4245')
          .setTitle(`🔒 Ticket ${ticketId} Closed`)
          .setDescription('This ticket has been closed.')
          .setFooter({ text: 'SPIDEY BOT' })
          .setTimestamp()
      ]
    });

    await channel.permissionOverwrites.edit(ticket.userId, {
      ViewChannel: false,
      SendMessages: false,
      ReadMessageHistory: false
    });

    return interaction.reply({ content: 'Ticket closed.', ephemeral: true });
  }

  if (type === 'claim') {
    const claimResult = ticketsService.claimTicket(guild.id, ticketId, interaction.user.id);
    if (!claimResult.success) {
      return interaction.reply({ content: claimResult.error, ephemeral: true });
    }

    return interaction.reply({ content: `Ticket claimed by ${interaction.user}.`, ephemeral: true });
  }
}

async function handleTicketCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'create' || subcommand === 'open') {
    return handleTicketCreate(interaction);
  }

  if (subcommand === 'close') {
    const ticket = ticketsService.getOpenTickets(interaction.guild.id).find(
      t => t.userId === interaction.user.id
    );

    if (!ticket) {
      return interaction.reply({ content: 'You do not have an open ticket.', ephemeral: true });
    }

    return handleTicketInteraction({
      ...interaction,
      customId: `ticket_close_${ticket.id}`,
      isButton: () => true,
      reply: async (opts) => interaction.reply(opts),
      channel: interaction.guild.channels.cache.get(ticket.channelId) || interaction.channel
    });
  }
}

function registerHandlers(client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton() && interaction.customId.startsWith('ticket_')) {
        await handleTicketInteraction(interaction);
      }

      if (interaction.isChatInputCommand() && interaction.commandName === 'ticket') {
        await handleTicketCommand(interaction);
      }
    } catch (err) {
      console.error('Ticket handler error:', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'An error occurred processing your ticket.', ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: 'An error occurred processing your ticket.', ephemeral: true }).catch(() => {});
      }
    }
  });
}

module.exports = {
  registerHandlers,
  handleTicketCreate,
  handleTicketInteraction,
  handleTicketCommand,
  sendTranscript,
  buildTicketEmbed,
  buildControlRow
};
