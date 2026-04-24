const fs = require('fs');
const c = fs.readFileSync('C:/Bot/spideybot/index.cjs', 'utf8');
const lines = c.split('\n');

// Fix line 2074-2077
// Remove extra spaces in line 2074 and fix 2077
for (let i = 2073; i <= 2079; i++) {
  console.log(i+1, lines[i]);
}

// Replace lines 2074-2080
lines[2073] = '    } else {';
lines[2074] = '      updateGuildConfig(msg.guild.id, { levels });';
lines[2075] = '    }';
lines[2076] = '  } else {';
lines[2077] = '    updateGuildConfig(msg.guild.id, { levels });';
lines[2078] = '  }';
lines[2079] = '';

fs.writeFileSync('C:/Bot/spideybot/index.cjs', lines.join('\n'));
console.log('Fixed!');