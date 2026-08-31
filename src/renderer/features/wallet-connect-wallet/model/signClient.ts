import { Core, RELAYER_EVENTS } from '@walletconnect/core';
import { default as Client } from '@walletconnect/sign-client';
import { createEffect, createEvent, createStore, restore, sample } from 'effector';

import { IS_WALLET_CONNECT_CONFIGURED, WALLET_CONNECT_PROJECT_ID } from '@/shared/lib/utils';
import { DEFAULT_APP_METADATA, DEFAULT_LOGGER, DEFAULT_RELAY_URL, EXTEND_PAIRING } from '../lib/constants';

import { walletConnectWalletFeature } from './feature';

const $client = createStore<Client | null>(null);

const changeConnectionStatus = createEvent<boolean>();
const $connected = restore(changeConnectionStatus, false);

const createClientFx = createEffect(() => {
  const core = new Core({
    logger: DEFAULT_LOGGER,
    relayUrl: DEFAULT_RELAY_URL,
    projectId: WALLET_CONNECT_PROJECT_ID,
  });

  core.relayer.on(RELAYER_EVENTS.connect, () => {
    changeConnectionStatus(true);
  });

  core.relayer.on(RELAYER_EVENTS.connection_stalled, () => {
    changeConnectionStatus(false);
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

const warnMissingProjectIdFx = createEffect(() => {
  console.warn('WalletConnect is disabled: WALLET_CONNECT_PROJECT_ID was not provided at build time.');
});

sample({
  clock: walletConnectWalletFeature.running,
  filter: () => IS_WALLET_CONNECT_CONFIGURED,
  target: createClientFx,
});

sample({
  clock: walletConnectWalletFeature.running,
  filter: () => !IS_WALLET_CONNECT_CONFIGURED,
  target: warnMissingProjectIdFx,
});

sample({
  clock: createClientFx.doneData,
  target: [$client, extendSessionsFx],
});

export const signClient = {
  $client,
  $connected,
  createClient: createClientFx,
};
