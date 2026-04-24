const fs = require('fs');
const c = fs.readFileSync('C:/Bot/spideybot/index.cjs', 'utf8');
const lines = c.split('\n');

console.log('Lines 2075-2080 BEFORE fix:');
for (let i = 2074; i <= 2080; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// Line 2077 (index 2076) is the extra }
lines.splice(2076, 1);

console.log('\nLines 2075-2080 AFTER fix:');
for (let i = 2074; i <= 2079 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

fs.writeFileSync('C:/Bot/spideybot/index.cjs', lines.join('\n'));
console.log('\nFixed!');