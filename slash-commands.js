// Unified slash-command registry for the integrated server suite.
const { testifyCommands } = require('./src/features/testify-suite/testify-suite.commands.cjs');

const slashCommands = Array.isArray(testifyCommands) ? testifyCommands : [];

const commandNames = slashCommands.map(command => command.name);
const duplicates = commandNames.filter((name,index)=>commandNames.indexOf(name)!==index);
if(duplicates.length){
  throw new Error('Duplicate integrated command names: '+[...new Set(duplicates)].join(', '));
}

module.exports = { slashCommands };
