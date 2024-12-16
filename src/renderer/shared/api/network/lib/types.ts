import { type ProviderInterface, type ProviderInterfaceCallback } from '@polkadot/rpc-provider/types';

import { type ChainMetadata } from '@/shared/core';

export const enum ProviderType {
  WEB_SOCKET = 'ws',
  LIGHT_CLIENT = 'sc',
}

export type Subscription = {
  type: string;
  method: string;
  params: unknown[];
  cb: ProviderInterfaceCallback;
};

export interface ProviderWithMetadata extends ProviderInterface {
  updateMetadata: (metadata: ChainMetadata) => void;
}
