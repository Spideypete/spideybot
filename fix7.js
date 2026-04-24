const fs = require('fs');
const c = fs.readFileSync('C:/Bot/spideybot/index.cjs', 'utf8');
const lines = c.split('\n');

console.log('Lines 8499-8512 BEFORE fix:');
for (let i = 8498; i <= 8512; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// Remove duplicate lines 8505-8507
lines.splice(8504, 3);  // Remove indices 8504, 8505, 8506 (lines 8505, 8506, 8507)

console.log('\nLines 8499-8512 AFTER fix:');
for (let i = 8498; i <= 8512 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

fs.writeFileSync('C:/Bot/spideybot/index.cjs', lines.join('\n'));
console.log('\nFixed!');