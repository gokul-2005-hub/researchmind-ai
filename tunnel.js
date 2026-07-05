const { spawn } = require('child_process');

function startTunnel() {
  console.log('Starting localtunnel client...');
  const child = spawn('npx', ['localtunnel', '--port', '9000', '--subdomain', 'researchmindai'], { shell: true });

  child.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(msg);
  });

  child.stderr.on('data', (data) => {
    const err = data.toString().trim();
    if (err) console.error('Tunnel Error:', err);
  });

  child.on('close', (code) => {
    console.log(`Tunnel disconnected (exit code: ${code}). Reconnecting in 5 seconds...`);
    setTimeout(startTunnel, 5000);
  });
}

startTunnel();
