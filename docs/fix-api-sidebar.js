const fs = require('fs');
const path = require('path');

// Read the typedoc sidebar file
const sidebarPath = path.join(__dirname, 'api', 'typedoc-sidebar.cjs');
let content = fs.readFileSync(sidebarPath, 'utf8');

// Replace all ../api/ with api/
content = content.replace(/\.\.\/api\//g, 'api/');

// Write the fixed content back
fs.writeFileSync(sidebarPath, content);

console.log('Fixed API sidebar paths');
