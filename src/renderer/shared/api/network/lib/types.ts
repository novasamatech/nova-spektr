import { ProviderInterfaceCallback, ProviderInterface } from '@polkadot/rpc-provider/types';

import type { HexString } from '@shared/core';

export const enum Chains {
  POLKADOT = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
  KUSAMA = '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
}

export const enum ProviderType {
  WEB_SOCKET = 'ws',
  LIGHT_CLIENT = 'sc',
}

export const enum RpcValidation {
  'INVALID',
  'VALID',
  'WRONG_NETWORK',
}

export type Subscription = {
  type: string;
  method: string;
  params: unknown[];
  cb: ProviderInterfaceCallback;
};

export interface ProviderWithMetadata extends ProviderInterface {
  updateMetadata: (metadata: HexString) => void;
}
