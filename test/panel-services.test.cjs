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

test('registered slash command definitions serialize with unique roots and subcommands', () => {
  const { testifyCommands } = require('../src/features/testify-suite/testify-suite.commands.cjs');
  const definitions = testifyCommands.map(command => command.toJSON());
  const rootNames = definitions.map(command => command.name);
  assert.ok(definitions.length > 0);
  assert.equal(new Set(rootNames).size, rootNames.length, 'slash command root names must be unique');
  for (const command of definitions) {
    const subcommands = (command.options || []).filter(option => option.type === 1).map(option => option.name);
    assert.equal(new Set(subcommands).size, subcommands.length, command.name + ' subcommand names must be unique');
  }
});

test('custom slash runtime replaces template variables and persists its counter', async () => {
  const guildId = 'guild-custom-slash-runtime';
  const suiteService = require('../src/features/testify-suite/testify-suite.service.cjs');
  const runtime = require('../src/features/custom-commands/custom-slash-runtime.cjs');
  suiteService.save(guildId, {
    customCommands: {
      items: [{
        name: 'kill',
        messageTemplate: 'Ohh killed {username} — {count} in {server} by {user}',
        counterEnabled: true,
        counterLabel: 'Kills',
        enabled: true,
        count: 0
      }]
    }
  });

  let reply;
  const interaction = {
    guildId,
    commandName: 'kill',
    user: { id: 'member-1', username: 'TestMember' },
    guild: { name: 'Test Server' },
    isChatInputCommand: () => true,
    reply: async payload => { reply = payload; }
  };
  assert.equal(await runtime.handleCustomSlashCommand(interaction), true);
  assert.match(reply.content, /TestMember — 1 in Test Server by <@member-1>/);
  assert.equal(suiteService.get(guildId).customCommands.items[0].count, 1);
});

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

test('the live invite-tracker service persists manual adjustments and leaderboard stats', () => {
  const guildId = 'guild-live-invite-tracker';
  const suiteService = require('../src/features/testify-suite/testify-suite.service.cjs');
  const tracker = require('../src/features/invite-tracker/invite-tracker.service.cjs');
  const listeners = {};
  const fakeClient = {
    once: (event, handler) => { listeners['once:' + event] = handler; },
    on: (event, handler) => { listeners[event] = handler; }
  };
  tracker.initialize(fakeClient, suiteService);
  suiteService.save(guildId, {
    inviteTracker: { enabled: true, counts: {}, joinedBy: {}, rewards: [] }
  });

  tracker.adjust(guildId, 'inviter-1', 'add', 3);
  assert.deepEqual(tracker.getStats(guildId, 'inviter-1'), { joins: 3, leaves: 0, active: 3 });
  assert.equal(tracker.leaderboard(guildId)[0].userId, 'inviter-1');
  tracker.adjust(guildId, 'inviter-1', 'remove', 1);
  assert.equal(tracker.getStats(guildId, 'inviter-1').active, 2);
  tracker.adjust(guildId, 'inviter-1', 'reset', 0);
  assert.equal(tracker.getStats(guildId, 'inviter-1').active, 0);
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

  // A periodic invite sync must not erase accumulated joins/leaves.
  invites.trackInvite(guildId, {
    code: 'testcode',
    inviter: { id: 'inviter-1' },
    uses: 1
  });
  invite = invites.getInvite(guildId, 'testcode');
  assert.equal(invite.joins, 1);
  assert.equal(invite.joinedUsers.length, 1);

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
