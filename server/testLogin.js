const { exec } = require('child_process');
const http = require('http');

const serverProcess = exec('node server.js', { env: { ...process.env, PORT: '5001' } });

let output = '';
serverProcess.stdout.on('data', data => output += data);
serverProcess.stderr.on('data', data => output += data);

setTimeout(() => {
  const req = http.request({
    hostname: 'localhost',
    port: 5001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const fs = require('fs');
      fs.writeFileSync('login_error.txt', JSON.stringify({ statusCode: res.statusCode, body, output }));
      serverProcess.kill();
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    const fs = require('fs');
    fs.writeFileSync('login_error.txt', JSON.stringify({ error: e.message, output }));
    serverProcess.kill();
    process.exit(0);
  });

  req.write(JSON.stringify({ email: 'admin@smart.edu', password: 'admin123' }));
  req.end();
}, 2000);
