const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../../config.json');

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
  return { guilds: {} };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getGuildConfig(guildId) {
  const config = loadConfig();
  if (!config.guilds[guildId]) {
    config.guilds[guildId] = {};
    saveConfig(config);
  }
  return config.guilds[guildId];
}

function getInvites(guildId) {
  const guildConfig = getGuildConfig(guildId);
  if (!guildConfig.invites) {
    guildConfig.invites = {
      enabled: false,
      invites: {}
    };
  }
  return guildConfig.invites;
}

function getConfig(guildId) {
  const invites = getInvites(guildId);
  return {
    enabled: invites.enabled || false
  };
}

function setConfig(guildId, config) {
  const invites = getInvites(guildId);
  const merged = { ...invites, ...config };
  const guildConfig = getGuildConfig(guildId);
  guildConfig.invites = merged;
  saveConfig(loadConfig());
}

function trackInvite(guildId, invite) {
  const invites = getInvites(guildId);
  if (!invites.invites) invites.invites = {};

  const existing = invites.invites[invite.code];
  const inviterId = invite.inviter?.id || null;

  invites.invites[invite.code] = {
    inviteCode: invite.code,
    inviterId,
    uses: invite.uses || 0,
    joins: 0,
    leaves: 0,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const guildConfig = getGuildConfig(guildId);
  guildConfig.invites = invites;
  saveConfig(loadConfig());

  return { success: true, invite: invites.invites[invite.code] };
}

function recordJoin(guildId, inviteCode, userId) {
  const invites = getInvites(guildId);
  if (!invites.invites) invites.invites = {};

  if (!invites.invites[inviteCode]) {
    invites.invites[inviteCode] = {
      inviteCode,
      inviterId: null,
      uses: 0,
      joins: 0,
      leaves: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const invite = invites.invites[inviteCode];
  invite.joins += 1;
  invite.uses = (invite.uses || 0) + 1;
  invite.updatedAt = new Date().toISOString();

  if (!invite.joinedUsers) invite.joinedUsers = [];
  invite.joinedUsers.push({
    userId,
    joinedAt: new Date().toISOString()
  });

  const guildConfig = getGuildConfig(guildId);
  guildConfig.invites = invites;
  saveConfig(loadConfig());

  return { success: true, invite };
}

function recordLeave(guildId, userId) {
  const invites = getInvites(guildId);
  if (!invites.invites) return { success: false, error: 'No invites tracked.' };

  let found = false;

  for (const code of Object.keys(invites.invites)) {
    const invite = invites.invites[code];
    if (invite.joinedUsers) {
      const userIndex = invite.joinedUsers.findIndex(u => u.userId === userId);
      if (userIndex !== -1) {
        invite.leaves += 1;
        invite.joinedUsers.splice(userIndex, 1);
        invite.updatedAt = new Date().toISOString();
        found = true;
        break;
      }
    }
  }

  if (!found) {
    return { success: false, error: 'User not found in invite tracking.' };
  }

  const guildConfig = getGuildConfig(guildId);
  guildConfig.invites = invites;
  saveConfig(loadConfig());

  return { success: true };
}

function getInvite(guildId, inviteCode) {
  const invites = getInvites(guildId);
  return invites.invites?.[inviteCode] || null;
}

function getAllInvites(guildId) {
  const invites = getInvites(guildId);
  return Object.values(invites.invites || {});
}

function getInviteLeaderboard(guildId) {
  const allInvites = getAllInvites(guildId);

  const leaderboard = allInvites
    .map(invite => ({
      inviterId: invite.inviterId,
      inviteCode: invite.inviteCode,
      joins: invite.joins || 0,
      leaves: invite.leaves || 0,
      uses: invite.uses || 0,
      netJoins: (invite.joins || 0) - (invite.leaves || 0)
    }))
    .filter(inv => inv.inviterId)
    .sort((a, b) => b.netJoins - a.netJoins || b.joins - a.joins);

  return leaderboard;
}

function removeInvite(guildId, inviteCode) {
  const invites = getInvites(guildId);
  if (!invites.invites?.[inviteCode]) {
    return { success: false, error: 'Invite not found.' };
  }

  delete invites.invites[inviteCode];

  const guildConfig = getGuildConfig(guildId);
  guildConfig.invites = invites;
  saveConfig(loadConfig());

  return { success: true };
}

module.exports = {
  getConfig,
  setConfig,
  trackInvite,
  recordJoin,
  recordLeave,
  getInvite,
  getAllInvites,
  getInviteLeaderboard,
  removeInvite
};
