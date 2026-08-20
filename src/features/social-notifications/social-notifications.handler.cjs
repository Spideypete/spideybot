const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const socialNotificationsService = require('./social-notifications.service.cjs');

const PLATFORM_POLL_INTERVAL = 5 * 60 * 1000;
const POLL_ERROR_DELAY = 30 * 1000;

const pollIntervals = new Map();

function getTwitchStatus(username) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Promise.resolve({ isLive: false, error: 'Twitch credentials not configured' });
  }

  return axios.post(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`)
    .then(response => {
      const token = response.data.access_token;
      return axios.get(`https://api.twitch.tv/helix/streams?user_login=${username}`, {
        headers: {
          'Client-ID': clientId,
          'Authorization': `Bearer ${token}`
        }
      });
    })
    .then(response => {
      const stream = response.data.data?.[0];
      if (stream) {
        return {
          isLive: true,
          title: stream.title || 'Live',
          game: stream.game_name || '',
          viewers: stream.viewer_count || 0,
          thumbnail: stream.thumbnail_url || '',
          startedAt: stream.started_at || ''
        };
      }
      return { isLive: false };
    })
    .catch(err => {
      console.error(`Twitch API error for ${username}:`, err.message);
      return { isLive: false, error: err.message };
    });
}

function getTikTokStatus(username) {
  return Promise.resolve({ isLive: false, error: 'TikTok API not yet implemented' });
}

function getKickStatus(username) {
  return axios.get(`https://kick.com/api/v2/channels/${username}`)
    .then(response => {
      const data = response.data;
      if (data?.data?.livestream) {
        return {
          isLive: true,
          title: data.data.livestream.session_title || 'Live',
          viewers: data.data.livestream.viewer_count || 0,
          thumbnail: data.data.livestream.thumbnail?.url || '',
          startedAt: data.data.livestream.created_at || ''
        };
      }
      return { isLive: false };
    })
    .catch(err => {
      console.error(`Kick API error for ${username}:`, err.message);
      return { isLive: false, error: err.message };
    });
}

function getYouTubeStatus(username) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return Promise.resolve({ isLive: false, error: 'YouTube API key not configured' });
  }

  return axios.get(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${username}&type=video&eventType=live&key=${apiKey}`)
    .then(response => {
      const video = response.data.items?.[0];
      if (video) {
        return {
          isLive: true,
          title: video.snippet?.title || 'Live',
          thumbnail: video.snippet?.thumbnails?.high?.url || '',
          startedAt: video.snippet?.publishedAt || ''
        };
      }
      return { isLive: false };
    })
    .catch(err => {
      console.error(`YouTube API error for ${username}:`, err.message);
      return { isLive: false, error: err.message };
    });
}

const PLATFORM_API = {
  twitch: getTwitchStatus,
  tiktok: getTikTokStatus,
  kick: getKickStatus,
  youtube: getYouTubeStatus
};

async function checkPlatform(platform, username) {
  const checker = PLATFORM_API[platform];
  if (!checker) {
    return { isLive: false, error: `Unsupported platform: ${platform}` };
  }
  return checker(username);
}

async function sendLiveNotification(guild, notification, streamData) {
  const channel = guild.channels.cache.get(notification.channelId);
  if (!channel || channel.type !== 0) return;

  const embed = new EmbedBuilder()
    .setColor('#9146FF')
    .setTitle(`🔴 ${notification.username} is now live on ${notification.platform.charAt(0).toUpperCase() + notification.platform.slice(1)}`)
    .setDescription(streamData.title || 'Stream started')
    .addFields(
      { name: 'Platform', value: notification.platform.charAt(0).toUpperCase() + notification.platform.slice(1), inline: true },
      { name: 'Streamer', value: notification.username, inline: true }
    )
    .setURL(`https://${notification.platform}.com/${notification.username}`)
    .setFooter({ text: 'SPIDEY BOT Social Notifications' })
    .setTimestamp();

  if (streamData.thumbnail) {
    embed.setImage(streamData.thumbnail);
  }

  if (streamData.viewers) {
    embed.addFields({ name: 'Viewers', value: String(streamData.viewers), inline: true });
  }

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(`Failed to send notification for ${notification.platform}/${notification.username}:`, err.message);
  }
}

async function pollGuild(guildId, client) {
  const guild = client?.guilds?.cache?.get(guildId);
  if (!guild) return;

  const notifications = socialNotificationsService.getEnabledNotifications(guildId);
  const results = [];

  for (const notification of notifications) {
    try {
      const streamData = await checkPlatform(notification.platform, notification.username);
      const status = socialNotificationsService.updateStreamStatus(guildId, notification.platform, notification.username, streamData.isLive, streamData.title);

      if (status.wentLive && streamData.isLive) {
        await sendLiveNotification(guild, status.notification, streamData);
        results.push({ notification: status.notification.username, platform: notification.platform, wentLive: true });
      }
    } catch (err) {
      console.error(`Poll error for ${notification.platform}/${notification.username}:`, err.message);
      results.push({ notification: notification.username, platform: notification.platform, error: err.message });
    }
  }

  return results;
}

async function pollAllGuilds(client) {
  const config = require('../../config.json');
  const guildIds = Object.keys(config.guilds || {});

  const results = await Promise.allSettled(guildIds.map(guildId => pollGuild(guildId, client)));
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Polling failed for guild ${guildIds[index]}:`, result.reason);
    }
  });
}

function startPolling(client) {
  if (pollIntervals.has('global')) return;

  console.log('Starting social notification polling (every 5 minutes)');
  pollAllGuilds(client);

  const interval = setInterval(async () => {
    try {
      await pollAllGuilds(client);
    } catch (err) {
      console.error('Polling cycle error:', err);
    }
  }, PLATFORM_POLL_INTERVAL);

  pollIntervals.set('global', interval);
}

function stopPolling() {
  const interval = pollIntervals.get('global');
  if (interval) {
    clearInterval(interval);
    pollIntervals.delete('global');
    console.log('Social notification polling stopped');
  }
}

async function checkNow(guildId, client) {
  return await pollGuild(guildId, client);
}

module.exports = {
  startPolling,
  stopPolling,
  pollAllGuilds,
  checkNow,
  checkPlatform,
  PLATFORM_API,
  PLATFORM_POLL_INTERVAL
};
