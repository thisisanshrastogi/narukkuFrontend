const fs = require('fs');
const path = require('path');

const directory = './src';

// Map of old hex codes to new Tailwind/CSS variable neutral names
const colorMap = {
  '#E8E0D8': 'var(--background-base)',
  '#3D2C2E': 'var(--text-primary)',
  '#6B5B5E': 'var(--text-secondary)',
  '#D4A853': 'var(--accent-primary)',
  '#E07A5F': 'var(--accent-secondary)',
  '#81B29A': 'var(--success)',
  '#5B8CBA': 'var(--info)'
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk(directory);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Replace direct hex colors inside brackets like bg-[#E8E0D8] -> bg-[var(--background-base)]
  // Or text-[#E8E0D8] -> text-[var(--background-base)]
  // We can just replace the hex codes themselves, but wait, if it's inside brackets `[#hex]`, replacing just the hex to `var(--name)` makes it `[var(--name)]` which works in Tailwind v4!
  
  for (const [hex, cssVar] of Object.entries(colorMap)) {
    const re = new RegExp(hex, 'gi');
    if (re.test(content)) {
      content = content.replace(re, cssVar);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
