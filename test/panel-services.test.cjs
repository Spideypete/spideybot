const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spideybot-audit-'));
const configPath = path.join(tempDir, 'config.json');
process.env.SPIDEYBOT_CONFIG_PATH = configPath;

const { CustomCommandsService } = require('../src/features/custom-commands/custom-commands.service.cjs');
const invites = require('../src/features/invites/invites.service.cjs');
const social = require('../src/features/social-notifications/social-notifications.service.cjs');

function readConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

test('custom commands create, match, count, and persist', async () => {
  const guildId = 'guild-custom-tests';
  const service = new CustomCommandsService(['help']);
  await service.create(guildId, {
    name: 'kill',
    response: 'Killed {count}',
    enabled: true,
    cooldown: 0
  });

  assert.equal(service.findMatch(guildId, 'kill').name, 'kill');
  service.recordUsage(guildId, 'kill');
  const freshService = new CustomCommandsService(['help']);
  const command = await freshService.get(guildId, 'kill');
  assert.equal(command.useCount, 1);
  assert.equal(command.response, 'Killed {count}');
  assert.equal(freshService.findMatch(guildId, 'help'), null);
});

test('invite tracker persists settings, invite usage, joins, leaves and leaderboard', () => {
  const guildId = 'guild-invite-tests';
  invites.setConfig(guildId, { enabled: true });
  invites.trackInvite(guildId, {
    code: 'testcode',
    inviter: { id: 'inviter-1' },
    uses: 0
  });
  invites.recordJoin(guildId, 'testcode', 'member-1');

  let invite = invites.getInvite(guildId, 'testcode');
  assert.equal(invite.joins, 1);
  assert.equal(invite.joinedUsers.length, 1);
  assert.equal(invites.getConfig(guildId).enabled, true);
  assert.equal(invites.getInviteLeaderboard(guildId)[0].netJoins, 1);

  invites.recordLeave(guildId, 'member-1');
  invite = invites.getInvite(guildId, 'testcode');
  assert.equal(invite.leaves, 1);
  assert.equal(invite.joinedUsers.length, 0);
  assert.equal(invites.getInviteLeaderboard(guildId)[0].netJoins, 0);

  const saved = readConfig();
  assert.equal(saved.guilds[guildId].invites.invites.testcode.joins, 1);
});

test('social notification settings and stream state persist', () => {
  const guildId = 'guild-social-tests';
  social.setConfig(guildId, { enabled: true, twitchChannelId: 'channel-1' });
  const added = social.addNotification(guildId, {
    platform: 'twitch',
    username: 'TestStreamer',
    channelId: 'channel-1'
  });
  assert.equal(added.success, true);
  assert.equal(social.getConfig(guildId).enabled, true);
  assert.equal(social.getNotifications(guildId).length, 1);

  const toggled = social.toggleNotification(guildId, 'twitch', 'TestStreamer');
  assert.equal(toggled.notification.enabled, false);
  social.toggleNotification(guildId, 'twitch', 'TestStreamer');
  const status = social.updateStreamStatus(guildId, 'twitch', 'TestStreamer', true, 'Audit stream');
  assert.equal(status.wentLive, true);

  const saved = readConfig();
  const persisted = saved.guilds[guildId].socialNotifications.notifications[0];
  assert.equal(persisted.isLive, true);
  assert.equal(persisted.streamTitle, 'Audit stream');
  assert.equal(persisted.enabled, true);
});
