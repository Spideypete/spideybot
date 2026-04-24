const fs = require('fs');
const c = fs.readFileSync('C:/Bot/spideybot/index.cjs', 'utf8');
const lines = c.split('\n');

// Line 2073 (index 2072) is } that closes the nickname if - CORRECT
// Line 2074 (index 2073) is } - EXTRA, should be removed
// Line 2075 (index 2074) is } else { - WRONG, should be } else {

// Actually, let's look at the original structure:
// After line 2073 (}), the next line should be } else { to close line 2021
// But we have } then } else {

// So remove line 2074
lines.splice(2073, 1);

// Now line 2074 (was 2075) should be correct
console.log('After removing line 2074:');
console.log(lines[2072], '2073');
console.log(lines[2073], '2074');
console.log(lines[2074], '2075');

fs.writeFileSync('C:/Bot/spideybot/index.cjs', lines.join('\n'));
console.log('Written!');