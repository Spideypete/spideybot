const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.cjs'), 'utf8');
const { spideyCommands } = require('../src/features/spidey-suite/spidey-suite.commands.cjs');

const definitions = spideyCommands.map(command => command.toJSON());
const byName = new Map(definitions.map(command => [command.name, command]));

test('the requested command map is registered without the three excluded AI subcommands', () => {
  const required = [
    'ask','premium','welcome','goodbye','reactionrole','ban','kick','timeout','warn','cases','purge',
    'automod','auditlog','rank','levels','achievements','cc','invites','invite','ticket','emoji','poll',
    'embed','remind','reminders','birthday','birthdays','alerts','giveaway','balance','pay','work','shop',
    'play','skip','queue','stop','blackjack','slots','lottery','tictactoe','trivia','command','system'
  ];
  for (const name of required) assert.ok(byName.has(name), 'missing /' + name);
  assert.equal(new Set(definitions.map(command => command.name)).size, definitions.length, 'duplicate top-level command names');
  assert.ok(!byName.has('ai'), '/ai should not be registered while AI subcommands are excluded');
  assert.ok(!byName.has('premium-ai'));
});

test('/ask remains available as a separate existing command', () => {
  const ask = byName.get('ask');
  assert.ok(ask);
  assert.equal(ask.options.length, 1);
  assert.equal(ask.options[0].name, 'question');
  assert.equal(ask.options[0].required, true);
});

test('all requested slash command definitions serialize within Discord command limits', () => {
  for (const command of definitions) {
    assert.ok(command.name.length <= 32, command.name + ' name exceeds Discord limit');
    assert.ok(command.description.length <= 100, command.name + ' description exceeds Discord limit');
    assert.ok((command.options || []).length <= 25, command.name + ' has too many top-level options');
  }
});

test('built-in slash commands are registered globally and per guild', () => {
  assert.ok(indexSource.includes('rest.put(Routes.applicationCommands(client.user.id), { body: commands })'),
    'startup must publish global slash commands so Discord can detect slash-command support');
  assert.ok(indexSource.includes('rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: commands })'),
    'startup must retain guild-scoped commands for fast updates');
  assert.ok(indexSource.includes('Routes.applicationCommands(client.user.id)'),
    'global command registration route must be present');
});
