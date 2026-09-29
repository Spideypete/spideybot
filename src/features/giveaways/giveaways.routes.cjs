const express = require('express');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const giveawaysService = require('./giveaways.service.cjs');
const { setMessageId } = require('./giveaway-message.cjs');

function createGiveawaysRouter(client) {
  const router = express.Router();

  function auth(req, res, next) {
    if (!req.session?.authenticated) return res.status(401).json({ error: 'Not authenticated' });
    const guildId = req.params.guildId;
    if (guildId && !req.session.guilds?.some(g => g.id === guildId)) {
      return res.status(403).json({ error: 'No admin permissions' });
    }
    next();
  }

  router.get('/:guildId', auth, (req, res) => {
    const guildId = req.params.guildId;
    res.json({ active: giveawaysService.getActive(guildId), ended: giveawaysService.getEnded(guildId) });
  });

  router.post('/:guildId', auth, express.json(), async (req, res) => {
    const guildId = req.params.guildId;
    const body = req.body || {};
    const guild = client?.guilds?.cache?.get(guildId);
    if (!guild) return res.status(404).json({ success: false, error: 'Bot is not in this server' });

    const channel = body.channelId ? guild.channels.cache.get(body.channelId) : null;
    if (!channel || !channel.isTextBased()) {
      return res.status(400).json({ success: false, error: 'Select a valid text channel.' });
    }

    const duration = Math.max(1, Number(body.duration) || 60);
    const winners = Math.max(1, Number(body.winners) || 1);
    const giveaway = giveawaysService.create(guildId, { ...body, duration, winners, channelId: channel.id });

    try {
      const endsAt = new Date(Date.now() + duration * 60000);
      const embed = new EmbedBuilder()
        .setColor(0x7c3aed)
        .setTitle('🎉 SPIDEY BOT Giveaway')
        .setDescription('**' + giveaway.prize + '**\n\nReact with 🎉 to enter!\n\n**Winners:** ' + winners + '\n**Ends:** <t:' + Math.floor(endsAt.getTime() / 1000) + ':R>')
        .setFooter({ text: 'SPIDEY BOT' })
        .setTimestamp(endsAt);

      const message = await channel.send({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('spidey_giveaway_' + giveaway.id)
            .setLabel('Enter Giveaway')
            .setEmoji('🎉')
            .setStyle(ButtonStyle.Primary)
        )]
      });

      await message.react('🎉');
      setMessageId(guildId, giveaway.id, message.id);
      res.json({ success: true, giveaway: giveawaysService.getGiveaway(guildId, giveaway.id) });
    } catch (e) {
      giveawaysService.deleteGiveaway(guildId, giveaway.id);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.post('/:guildId/:id/end', auth, (req, res) => {
    const giveaway = giveawaysService.endGiveaway(req.params.guildId, req.params.id);
    if (!giveaway) return res.status(404).json({ success: false, error: 'Giveaway not found' });
    res.json({ success: true, giveaway });
  });

  router.post('/:guildId/:id/reroll', auth, express.json(), (req, res) => {
    const giveaway = giveawaysService.reroll(req.params.guildId, req.params.id);
    if (!giveaway) return res.status(404).json({ success: false, error: 'Giveaway not found' });
    res.json({ success: true, giveaway });
  });

  router.delete('/:guildId/:id', auth, (req, res) => {
    const deleted = giveawaysService.deleteGiveaway(req.params.guildId, req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Giveaway not found' });
    res.json({ success: true });
  });

  return router;
}

module.exports = { createGiveawaysRouter };
