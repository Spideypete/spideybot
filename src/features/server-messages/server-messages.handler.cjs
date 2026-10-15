const { ServerMessagesService } = require('./server-messages.service.cjs')

let service = null

function initialize(client, configPath) {
  service = new ServerMessagesService(configPath)

  client.on('guildMemberAdd', handleGuildMemberAdd)

  client.on('guildMemberRemove', handleGuildMemberRemove)

  client.on('guildMemberUpdate', handleGuildMemberUpdate)
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
    if (msgData.embed) payload.embeds = [msgData.embed]

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
    if (msgData.embed) payload.embeds = [msgData.embed]

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
