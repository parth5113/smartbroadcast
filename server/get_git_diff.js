const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('git log -p -n 3').toString();
  fs.writeFileSync('git_diff_output.txt', output);
} catch (e) {
  fs.writeFileSync('git_diff_output.txt', 'Error: ' + e.message);
}
