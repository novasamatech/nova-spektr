import { dot, dot_col, dot_ppl } from '@polkadot-api/descriptors';
import { type PolkadotClient } from 'polkadot-api';

import { type ChainId } from '@/shared/core';

import { type ChainApi } from './types';

export const CONFIG: Record<ChainId, (client: PolkadotClient) => ChainApi> = {
  // Polkadot
  '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3': client => ({
    type: 'dot',
    api: client.getTypedApi(dot),
  }),
  // Polkadot People
  '0x67fa177a097bfa18f77ea95ab56e9bcdfeb0e5b8a40e46298bb93e16b6fc5008': client => ({
    type: 'dot_ppl',
    api: client.getTypedApi(dot_ppl),
  }),
  // Polkadot Collectives
  '0x46ee89aa2eedd13e988962630ec9fb7565964cf5023bb351f2b6b25c1b68b0b2': client => ({
    type: 'dot_col',
    api: client.getTypedApi(dot_col),
  }),
};
