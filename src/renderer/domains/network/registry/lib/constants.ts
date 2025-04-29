import { dot, dot_col, dot_ppl, ksm, ksm_ppl } from '@polkadot-api/descriptors';
import { type CompatibilityToken, type PolkadotClient } from 'polkadot-api';

import { type Chain, type ChainId } from '@/shared/core';

import { type DotApi, type KsmApi, type PolkadotApi } from './types';

const POLKADOT_OVERRIDES: Record<ChainId, (client: PolkadotClient, token: CompatibilityToken) => DotApi> = {
  // Polkadot People
  '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008': (client, token) => ({
    type: 'dot_ppl',
    api: client.getTypedApi(dot_ppl),
    token,
  }),
  // Polkadot Collectives
  '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2': (client, token) => ({
    type: 'dot_col',
    api: client.getTypedApi(dot_col),
    token,
  }),
};

const KUSAMA_OVERRIDES: Record<ChainId, (client: PolkadotClient, token: CompatibilityToken) => KsmApi> = {
  // Kusama People
  '0xc1af4cb4eb3918e5db15086c0cc5ec17fb334f728b7c65dd44bfe1e174ff8b3f': (client, token) => ({
    type: 'ksm_ppl',
    api: client.getTypedApi(ksm_ppl),
    token,
  }),
};

export const CONFIG: Record<
  Chain['specName'],
  (chainId: ChainId, client: PolkadotClient, token: CompatibilityToken) => PolkadotApi
> = {
  polkadot: (chainId, client, token) => {
    return (
      POLKADOT_OVERRIDES[chainId]?.(client, token) ?? {
        type: 'dot',
        api: client.getTypedApi(dot),
        token,
      }
    );
  },
  kusama: (chainId, client, token) => {
    return (
      KUSAMA_OVERRIDES[chainId]?.(client, token) ?? {
        type: 'ksm',
        api: client.getTypedApi(ksm),
        token,
      }
    );
  },

  // TODO: implement in future
  // 'aleph-node': {},
  // 'node-subtensor': {},
  // vara: {},
  // avail: {},
  // westend: {},
  // 'collectives-westend': {},
  // rococo: {},
};
