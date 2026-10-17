const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const definitionsSource = fs.readFileSync(path.join(root, 'src/features/spidey-suite/spidey-suite.commands.cjs'), 'utf8');
const handlerSource = fs.readFileSync(path.join(root, 'src/features/spidey-suite/spidey-suite.handler.cjs'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.cjs'), 'utf8');
const { spideyCommands } = require('../src/features/spidey-suite/spidey-suite.commands.cjs');
const { PermissionFlagsBits } = require('discord.js');

test('every grouped slash command subcommand has a handler alias', () => {
  const aliasMatch = handlerSource.match(/alias=(\{[\s\S]*?\}),n=alias/);
  assert.ok(aliasMatch, 'slash command alias table must exist');
  const aliasKeys = new Set([...aliasMatch[1].matchAll(/'([^']+)'\s*:\s*'[^']+'/g)].map(match => match[1]));
  const definitions = spideyCommands.map(command => command.toJSON());

  for (const command of definitions) {
    const subcommands = (command.options || []).filter(option => option.type === 1);
    for (const subcommand of subcommands) {
      // Ticket subcommands are deliberately dispatched to the ticket runtime by root name.
      if (command.name === 'ticket') continue;
      assert.ok(aliasKeys.has(command.name + ':' + subcommand.name),
        'Missing handler alias for /' + command.name + ' ' + subcommand.name);
    }
  }
});

test('every moderation slash command is routed to an implemented moderation handler', () => {
  const mod = spideyCommands.map(command => command.toJSON()).find(command => command.name === 'mod');
  assert.ok(mod, 'the /mod command must be registered');
  const moderationNames = (mod.options || []).filter(option => option.type === 1).map(option => option.name);
  assert.equal(mod.default_member_permissions, PermissionFlagsBits.UseApplicationCommands.toString(),
    'the /mod group should not require moderators to hold every moderation permission at once');
  const aliasMatch = handlerSource.match(/alias=(\{[\s\S]*?\}),n=alias/);
  const aliasKeys = new Set([...aliasMatch[1].matchAll(/'([^']+)'\s*:\s*'[^']+'/g)].map(match => match[1]));
  for (const name of moderationNames) {
    assert.ok(aliasKeys.has('mod:' + name), 'Missing slash alias for /mod ' + name);
    assert.ok(handlerSource.includes("'" + ({clearwarnings:'clearwarnings'}[name] || name) + "'"),
      'Handler does not reference moderation action ' + name);
  }
});

test('all deployments clear shared globals and register commands only per guild', () => {
  assert.match(indexSource, /Routes\\.applicationCommands\\(client\\.user\\.id\\),\\s*\\{\\s*body:\\s*\\[\\]\\s*\\}/,
    'startup must clear legacy global commands');
  assert.match(indexSource, /Routes\\.applicationGuildCommands\\(client\\.user\\.id,\\s*guild\\.id\\)/,
    'startup must register commands per guild');
  assert.doesNotMatch(indexSource, /Routes\\.applicationCommands\\(client\\.user\\.id\\),\\s*\\{\\s*body:\\s*commands\\s*\\}/,
    'no deployment may publish the command list globally');
  assert.equal((indexSource.match(/Routes\\.applicationCommands\\(client\\.user\\.id\\)/g) || []).length, 1,
    'the global command route should only be used to clear legacy commands');
});

test('moderation command definitions have valid bounded inputs', () => {
  const mod = spideyCommands.map(command => command.toJSON()).find(command => command.name === 'mod');
  const byName = new Map((mod.options || []).filter(option => option.type === 1).map(option => [option.name, option]));
  assert.equal(byName.get('mute').options.find(option => option.name === 'minutes').min_value, 1);
  assert.equal(byName.get('mute').options.find(option => option.name === 'minutes').max_value, 40320);
  assert.equal(byName.get('purge').options.find(option => option.name === 'amount').max_value, 100);
  assert.equal(byName.get('slowmode').options.find(option => option.name === 'seconds').max_value, 21600);
});
