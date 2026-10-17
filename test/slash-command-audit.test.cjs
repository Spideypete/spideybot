const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'index.cjs'), 'utf8');
const { spideyCommands } = require('../src/features/spidey-suite/spidey-suite.commands.cjs');

test('testing reset registers only the /ask command', () => {
  const definitions = spideyCommands.map(command => command.toJSON());
  assert.deepEqual(definitions.map(command => command.name), ['ask'],
    'the testing command registry must contain /ask only');
  assert.equal(definitions[0].options.length, 1);
  assert.equal(definitions[0].options[0].name, 'question');
  assert.equal(definitions[0].options[0].required, true);
});

test('all deployments clear shared globals and register commands only per guild', () => {
  assert.ok(indexSource.includes('rest.put(Routes.applicationCommands(client.user.id), { body: [] })'),
    'startup must clear legacy global commands');
  assert.ok(indexSource.includes('rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: commands })'),
    'startup must register commands per guild');
  assert.ok(!indexSource.includes('rest.put(Routes.applicationCommands(client.user.id), { body: commands })'),
    'no deployment may publish the command list globally');
  assert.equal(indexSource.split('Routes.applicationCommands(client.user.id)').length - 1, 1,
    'the global command route should only be used to clear legacy commands');
});
