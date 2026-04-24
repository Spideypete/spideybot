const fs = require('fs');
const c = fs.readFileSync('C:/Bot/spideybot/index.cjs', 'utf8');
const lines = c.split('\n');

console.log('Total lines:', lines.length);
console.log('Line 2077:', JSON.stringify(lines[2076]));

// Fix lines 2074-2080 (indices 2073-2079)
lines[2073] = '    } else {';
lines[2074] = '      updateGuildConfig(msg.guild.id, { levels });';
lines[2075] = '    }';
lines[2076] = '  } else {';
lines[2077] = '    updateGuildConfig(msg.guild.id, { levels });';
lines[2078] = '  }';
lines[2079] = '';

fs.writeFileSync('C:/Bot/spideybot/index.cjs', lines.join('\n'));
console.log('Written!');
console.log('Line 2077 after:', JSON.stringify(lines[2076]));