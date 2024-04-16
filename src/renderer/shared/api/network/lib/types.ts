import { ProviderInterfaceCallback, ProviderInterface } from '@polkadot/rpc-provider/types';

import type { HexString } from '@shared/core';

export const enum ProviderType {
  WEB_SOCKET = 'ws',
  LIGHT_CLIENT = 'sc',
}

export const enum RpcValidation {
  INVALID = 'invalid',
  VALID = 'valid',
  WRONG_NETWORK = 'wrong_network',
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
