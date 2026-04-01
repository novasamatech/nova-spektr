import https from 'node:https';

const url = process.argv[2] || 'https://localhost:3000';
const interval = 200;

function probe() {
  const req = https.get(url, { rejectUnauthorized: false }, () => process.exit(0));
  req.setTimeout(1000, () => req.destroy());
  req.on('error', () => setTimeout(probe, interval));
}

probe();
