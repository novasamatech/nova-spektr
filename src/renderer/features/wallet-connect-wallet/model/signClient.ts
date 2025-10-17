import { Core, RELAYER_EVENTS } from '@walletconnect/core';
import { default as Client } from '@walletconnect/sign-client';
import { createEffect, createEvent, createStore, restore, sample } from 'effector';

import {
  DEFAULT_APP_METADATA,
  DEFAULT_LOGGER,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
  EXTEND_PAIRING,
  SESSION_PING_INTERVAL,
} from '../lib/constants';

import { walletConnectWalletFeature } from './feature';

const $client = createStore<Client | null>(null);

const changeConnectionStatus = createEvent<boolean>();
const $connected = restore(changeConnectionStatus, false);

let pingInterval: NodeJS.Timeout | null = null;

const createClientFx = createEffect(() => {
  const core = new Core({
    logger: DEFAULT_LOGGER,
    relayUrl: DEFAULT_RELAY_URL,
    projectId: DEFAULT_PROJECT_ID,
  });

  core.relayer.on(RELAYER_EVENTS.connect, () => {
    changeConnectionStatus(true);
  });

  core.relayer.on(RELAYER_EVENTS.disconnect, () => {
    changeConnectionStatus(false);
  });

  return Client.init({
    core,
    metadata: DEFAULT_APP_METADATA,
  });
});

const extendSessionsFx = createEffect(async (client: Client) => {
  const sessions = client.session.getAll();
  const pairings = client.pairing.getAll({ active: true });

  await Promise.all(sessions.map(session => client.extend({ topic: session.topic }).catch(console.warn)));

  await Promise.all(
    pairings.map(async pairing =>
      client.core.pairing
        .updateExpiry({
          topic: pairing.topic,
          expiry: Math.round(Date.now() / 1000) + EXTEND_PAIRING,
        })
        .catch(console.warn),
    ),
  );
});

const pingSessionsFx = createEffect(async (client: Client) => {
  const sessions = client.session.getAll();

  await Promise.all(
    sessions.map(async session => {
      try {
        await client.ping({ topic: session.topic });
        console.log(`Pinged session ${session.topic.substring(0, 8)}...`);
      } catch (error) {
        console.warn(`Failed to ping session ${session.topic.substring(0, 8)}:`, error);
      }
    }),
  );
});

const startPingIntervalFx = createEffect((client: Client) => {
  // Clear existing interval if any
  if (pingInterval) {
    clearInterval(pingInterval);
  }

  // Start periodic ping
  pingInterval = setInterval(() => {
    pingSessionsFx(client);
  }, SESSION_PING_INTERVAL);

  console.log(`Started WalletConnect session ping with ${SESSION_PING_INTERVAL}ms interval`);
});

const stopPingIntervalFx = createEffect(() => {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
    console.log('Stopped WalletConnect session ping');
  }
});

sample({
  clock: walletConnectWalletFeature.running,
  target: createClientFx,
});

sample({
  clock: createClientFx.doneData,
  target: [$client, extendSessionsFx, startPingIntervalFx],
});

// Start ping when connection is established
sample({
  clock: changeConnectionStatus,
  source: $client,
  filter: (client, isConnected) => isConnected && client !== null,
  fn: client => client!,
  target: startPingIntervalFx,
});

// Stop ping when disconnected
sample({
  clock: changeConnectionStatus,
  filter: isConnected => !isConnected,
  target: stopPingIntervalFx,
});

export const signClient = {
  $client,
  $connected,
  createClient: createClientFx,
};
