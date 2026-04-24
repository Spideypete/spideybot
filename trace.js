const fs = require('fs');
const c = fs.readFileSync('C:/Bot/spideybot/index.cjs', 'utf8');
const lines = c.split('\n');

// Trace from line 2021 (index 2020) - the if statement
let depth = 0;
const startDepth = 2020;
console.log('Tracing from line 2021 onwards:');
for (let i = 2020; i < 2100 && i < lines.length; i++) {
  const line = lines[i];
  const oldDepth = depth;
  const open = (line.match(/{/g) || []).length;
  const close = (line.match(/}/g) || []).length;
  depth += open - close;
  
  if (open > 0 || close > 0) {
    console.log(`${i+1}: ${line.trim()} [depth: ${oldDepth} -> ${depth}]`);
  }
}
console.log('\nTotal lines:', lines.length);