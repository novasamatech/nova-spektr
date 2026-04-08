#!/usr/bin/env node
// Usage: node tests/system/utils/wait-for-chopsticks.mjs <session-id> <ws-url>
// Env:   OCTOPUS_BASE_URL, OCTOPUS_TOKEN
//
// Phase 1: polls Octopus API until session status is "running" (max 2 min)
// Phase 2: verifies chopsticks WS responds to chain_getBlockHash (max 1 min)

import { WebSocket } from 'ws';

const SESSION_ID = process.argv[2];
const WS_URL = process.argv[3];
const BASE_URL = process.env.OCTOPUS_BASE_URL;
const TOKEN = process.env.OCTOPUS_TOKEN;

if (!SESSION_ID || !WS_URL || !BASE_URL || !TOKEN) {
  console.error('Usage: node wait-for-chopsticks.mjs <session-id> <ws-url>');
  console.error('Env: OCTOPUS_BASE_URL, OCTOPUS_TOKEN');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollSessionStatus(timeoutMs = 120_000, intervalMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE_URL}/api/v1/sessions/${SESSION_ID}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) throw new Error(`Octopus API returned ${res.status}`);

    const { status } = await res.json();
    console.log(`Session status: ${status}`);

    if (status === 'running') return;
    if (['failed', 'expired', 'terminated'].includes(status)) {
      throw new Error(`Session entered terminal state: ${status}`);
    }
    await sleep(intervalMs);
  }
  throw new Error(`Session did not reach "running" within ${timeoutMs / 1000}s`);
}

function queryGenesisHash(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error('Connection timed out after 10s'));
    }, 10_000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'chain_getBlockHash', params: [0] }));
    });
    ws.on('message', (data) => {
      clearTimeout(timeout);
      ws.close();
      const { result, error } = JSON.parse(data.toString());
      if (error) return reject(new Error(`RPC error: ${JSON.stringify(error)}`));
      if (!result) return reject(new Error('Empty result from chain_getBlockHash'));
      resolve(result);
    });
    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function verifyWsEndpoint(timeoutMs = 60_000, intervalMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const genesisHash = await queryGenesisHash(WS_URL);
      console.log(`Chopsticks WS is ready. Genesis hash: ${genesisHash}`);
      return;
    } catch (err) {
      lastError = err;
      console.log(`WS not ready yet: ${err.message}`);
      await sleep(intervalMs);
    }
  }
  throw new Error(`Chopsticks WS did not respond within ${timeoutMs / 1000}s. Last error: ${lastError?.message}`);
}

try {
  console.log(`Waiting for Octopus session ${SESSION_ID} to reach "running"...`);
  await pollSessionStatus();

  console.log('Session is running. Verifying chopsticks WS endpoint...');
  await verifyWsEndpoint();

  console.log('Chopsticks session is ready. Proceeding with tests.');
} catch (err) {
  console.error(`::error::${err.message}`);
  process.exit(1);
}
