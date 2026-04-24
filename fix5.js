const fs = require('fs');
const c = fs.readFileSync('C:/Bot/spideybot/index.cjs', 'utf8');
const lines = c.split('\n');

// Line 2077 has a leftover updateGuildConfig that shouldn't be there
// It's from the old second else block that's now handled differently

// Current state:
// 2073:     }
// 2074:    } else {
// 2075:      updateGuildConfig(msg.guild.id, { levels });
// 2076:    }
// 2077:    updateGuildConfig(msg.guild.id, { levels });  // <-- WRONG, remove this
// 2078:  }
// 2079: 
// 2080:  if (msg.content.startsWith("/filter-toggle")) {

console.log('Before fix:');
for (let i = 2072; i < 2082; i++) {
  console.log(i+1, JSON.stringify(lines[i]));
}

// Remove line 2077 (index 2076)
lines.splice(2076, 1);

console.log('\nAfter fix:');
for (let i = 2072; i < 2081; i++) {
  console.log(i+1, JSON.stringify(lines[i]));
}

fs.writeFileSync('C:/Bot/spideybot/index.cjs', lines.join('\n'));
console.log('\nWritten!');