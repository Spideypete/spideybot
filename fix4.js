const fs = require('fs');
const c = fs.readFileSync('C:/Bot/spideybot/index.cjs', 'utf8');
const lines = c.split('\n');

console.log('Before fix:');
console.log(lines[2072], '2073');
console.log(lines[2073], '2074');
console.log(lines[2074], '2075');
console.log(lines[2075], '2076');
console.log(lines[2076], '2077');

// Current state after fix3:
// 2073:     }  // closes nickname if
// 2074:      updateGuildConfig... // WRONG indentation, should be after } else {
// 2075:    }  // WRONG - what does this close?
// 2076:  } else {  // closes the if at 2021
// 2077:    updateGuildConfig... // for the else

// Fix:
lines[2073] = '    } else {';  // was updateGuildConfig line
lines[2074] = '      updateGuildConfig(msg.guild.id, { levels });';
lines[2075] = '    }';

console.log('\nAfter fix:');
console.log(lines[2072], '2073');
console.log(lines[2073], '2074');
console.log(lines[2074], '2075');
console.log(lines[2075], '2076');
console.log(lines[2076], '2077');

fs.writeFileSync('C:/Bot/spideybot/index.cjs', lines.join('\n'));
console.log('\nWritten!');