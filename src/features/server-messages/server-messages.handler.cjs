const { ServerMessagesService } = require('./server-messages.service.cjs')

let service = null

function initialize(client, configPath) {
  service = new ServerMessagesService(configPath)

  client.on('guildMemberAdd', handleGuildMemberAdd)

  client.on('guildMemberRemove', handleGuildMemberRemove)

  client.on('guildMemberUpdate', handleGuildMemberUpdate)

  startFreePlanPromotion(client, configPath)
}

const PROMOTION_INTERVAL_MS = 6 * 60 * 60 * 1000
const PROMOTION_CHECK_INTERVAL_MS = 60 * 1000
const SPIDEY_DISCORD_INVITE = 'https://discord.gg/UjvnkjStH'
const FREE_PLAN_PROMOTION = [
  '🕷️ **ENJOYING SPIDEY BOT? COME JOIN OUR COMMUNITY!** 💜',
  '',
  'Be part of the official SPIDEY BOT community, meet other server owners, and help shape the future of the bot!',
  '',
  '🚀 **Why join us?**',
  '✨ Get the latest announcements, updates, and release news.',
  '🛠️ Get help and support when you need it.',
  '💡 Share suggestions and ideas for new features.',
  '🐛 Report bugs and help us make SPIDEY BOT even better.',
  '👀 Get previews of upcoming features and improvements.',
  '🤝 Connect with other Discord server owners and SPIDEY BOT users.',
  '',
  '💜 Your feedback and support help us grow. We would love to see you there!',
  '',
  '👇 **JOIN THE OFFICIAL SPIDEY BOT DISCORD:**',
  SPIDEY_DISCORD_INVITE,
  '',
  '💎 Want to enjoy SPIDEY BOT without these promotional messages? Upgrade this server to **Premium or Pro** for an ad-free experience.',
  '',
  '**SPIDEY BOT — Your server, smarter.** 🕷️'
].join('\\n')

function startFreePlanPromotion(client, configPath) {
  if (global.__spideyFreePlanPromotionTimer) return

  const resolvedConfigPath = path.resolve(configPath || path.join(process.cwd(), 'config.json'))
  const subscriptionManager = require('../../../services/subscription.manager.js')

  const checkAndSend = async () => {
    if (!client.isReady?.()) return

    for (const guild of client.guilds.cache.values()) {
      try {
        if (subscriptionManager.getGuildTier(guild.id) !== 'free') continue

        const config = service._load()
        const guildConfig = config.guilds?.[guild.id] || {}
        const promo = guildConfig.spideyPromo || {}
        const now = Date.now()

        if (!promo.lastSentAt) {
          guildConfig.spideyPromo = { ...promo, lastSentAt: now }
          config.guilds = config.guilds || {}
          config.guilds[guild.id] = guildConfig
          service._save(config)
          continue
        }

        if (now - Number(promo.lastSentAt) < PROMOTION_INTERVAL_MS) continue

        const welcomeConfig = await service.getConfig(guild.id)
        const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null)
        if (!botMember) continue

        const canSend = channel => Boolean(
          channel &&
          channel.isTextBased?.() &&
          typeof channel.send === 'function' &&
          channel.permissionsFor?.(botMember)?.has('SendMessages')
        )

        let channel = null
        if (welcomeConfig.welcomeChannel) {
          channel = guild.channels.cache.get(welcomeConfig.welcomeChannel) ||
            await guild.channels.fetch(welcomeConfig.welcomeChannel).catch(() => null)
          if (!canSend(channel)) channel = null
        }

        // The server's predefined General channel is the fallback. Do not
        // guess a channel by name and never use the Goodbye channel.
        if (!channel) {
          const generalChannelId = String(guildConfig.generalChannel || '')
          if (generalChannelId) {
            channel = guild.channels.cache.get(generalChannelId) ||
              await guild.channels.fetch(generalChannelId).catch(() => null)
          }
          if (!canSend(channel)) channel = null
        }

        if (!channel) {
          console.info('[FreePlanPromotion] Skipping guild; Welcome and predefined General channels are unavailable or not writable:', guild.id)
          continue
        }

        await channel.send({
          content: FREE_PLAN_PROMOTION,
          allowedMentions: { parse: [] }
        })

        // Persist only after Discord confirms the send, preventing duplicate
        // advertisements after a restart or a transient send failure.
        const latestConfig = service._load()
        latestConfig.guilds = latestConfig.guilds || {}
        const latestGuildConfig = latestConfig.guilds[guild.id] || {}
        latestGuildConfig.spideyPromo = {
          ...(latestGuildConfig.spideyPromo || {}),
          lastSentAt: now
        }
        latestConfig.guilds[guild.id] = latestGuildConfig
        service._save(latestConfig)
        console.info('[FreePlanPromotion] Sent six-hour Free-plan community promotion in guild:', guild.id)
      } catch (error) {
        console.error('[FreePlanPromotion] Failed for guild', guild.id, error.message)
      }
    }
  }

  global.__spideyFreePlanPromotionTimer = setInterval(checkAndSend, PROMOTION_CHECK_INTERVAL_MS)
  global.__spideyFreePlanPromotionTimer.unref?.()
  client.once('clientReady', () => {
    checkAndSend().catch(error => console.error('[FreePlanPromotion] Initial check failed:', error.message))
  })
}

async function handleGuildMemberAdd(member) {
  if (!service) return
  try {
    const msgData = await service.getWelcomeMessage(member.guild.id, member)
    if (!msgData) return

    const channel = member.guild.channels.cache.get(msgData.channelId)
    if (!channel) {
      console.warn(`[ServerMessages] Welcome channel not found: ${msgData.channelId}`)
      return
    }

    const payload = {}
    if (msgData.message) payload.content = msgData.message
    const embeds = [msgData.embed, msgData.bannerEmbed].filter(Boolean)
    if (embeds.length) payload.embeds = embeds

    if (!payload.content && !payload.embeds) return

    await channel.send(payload)
  } catch (error) {
    if (error.code === 50013) {
      console.error(`[ServerMessages] Missing permissions to send welcome in ${member.guild.name}`)
    } else if (error.code === 10003) {
      console.error(`[ServerMessages] Unknown channel for welcome in ${member.guild.name}`)
    } else {
      console.error(`[ServerMessages] Failed to send welcome: ${error.message}`)
    }
  }
}

async function handleGuildMemberRemove(member) {
  if (!service) return
  try {
    const msgData = await service.getGoodbyeMessage(member.guild.id, member)
    if (!msgData) return

    const channel = member.guild.channels.cache.get(msgData.channelId)
    if (!channel) {
      console.warn(`[ServerMessages] Goodbye channel not found: ${msgData.channelId}`)
      return
    }

    const payload = {}
    if (msgData.message) payload.content = msgData.message
    const embeds = [msgData.embed, msgData.bannerEmbed].filter(Boolean)
    if (embeds.length) payload.embeds = embeds

    if (!payload.content && !payload.embeds) return

    await channel.send(payload)
  } catch (error) {
    if (error.code === 50013) {
      console.error(`[ServerMessages] Missing permissions to send goodbye in ${member.guild.name}`)
    } else if (error.code === 10003) {
      console.error(`[ServerMessages] Unknown channel for goodbye in ${member.guild.name}`)
    } else {
      console.error(`[ServerMessages] Failed to send goodbye: ${error.message}`)
    }
  }
}

async function handleGuildMemberUpdate(oldMember, newMember) {
  if (!service) return
  try {
    const oldBoost = oldMember.roles.cache.some(
      (r) => r.name === 'Server Booster' || r.name === 'Nitro Booster'
    )
    const newBoost = newMember.roles.cache.some(
      (r) => r.name === 'Server Booster' || r.name === 'Nitro Booster'
    )

    if (!oldBoost && newBoost) {
      const msgData = await service.getBoostMessage(newMember.guild.id, newMember)
      if (!msgData) return

      const channel = newMember.guild.channels.cache.get(msgData.channelId)
      if (!channel) {
        console.warn(`[ServerMessages] Boost channel not found: ${msgData.channelId}`)
        return
      }

      const payload = {}
      if (msgData.message) payload.content = msgData.message
      if (msgData.embed) payload.embeds = [msgData.embed]

      if (!payload.content && !payload.embeds) return

      await channel.send(payload)
    }
  } catch (error) {
    if (error.code === 50013) {
      console.error(`[ServerMessages] Missing permissions to send boost message in ${newMember.guild.name}`)
    } else if (error.code === 10003) {
      console.error(`[ServerMessages] Unknown channel for boost in ${newMember.guild.name}`)
    } else {
      console.error(`[ServerMessages] Failed to send boost message: ${error.message}`)
    }
  }
}

module.exports = {
  initialize,
  handleGuildMemberAdd,
  handleGuildMemberRemove,
  handleGuildMemberUpdate
}
