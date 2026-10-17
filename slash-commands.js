// Unified slash-command registry for the integrated server suite.
const { spideyCommands } = require('./src/features/spidey-suite/spidey-suite.commands.cjs');

const slashCommands = Array.isArray(spideyCommands) ? spideyCommands : [];

const commandNames = slashCommands.map(command => command.name);
const duplicates = commandNames.filter((name,index)=>commandNames.indexOf(name)!==index);
if(duplicates.length){
  throw new Error('Duplicate integrated command names: '+[...new Set(duplicates)].join(', '));
}

module.exports = { slashCommands };
