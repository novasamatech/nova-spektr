import { createEffect, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';
import { z } from 'zod';

const IPFS_GATEWAYS_CONFIG_URL =
  'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/ipfs/gateways.json';

const gatewaysSchema = z.array(z.url());
const DEFAULT_IPFS_GATEWAY = 'https://ipfs.io';
const DEFAULT_IPFS_GATEWAYS = [DEFAULT_IPFS_GATEWAY];

export const $ipfsGateways = createStore<string[]>(DEFAULT_IPFS_GATEWAYS);

persist({
  key: 'ipfs_gateways',
  store: $ipfsGateways,
  sync: true,
});

const fetchGatewaysFx = createEffect(async () => {
  const response = await fetch(IPFS_GATEWAYS_CONFIG_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch IPFS gateways: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const parsed = gatewaysSchema.parse(json);
  return parsed;
});

sample({
  clock: fetchGatewaysFx.doneData,
  filter: gateways => gateways.length > 0,
  target: $ipfsGateways,
});

export const ipfsGatewayModel = {
  populate: fetchGatewaysFx,
};
