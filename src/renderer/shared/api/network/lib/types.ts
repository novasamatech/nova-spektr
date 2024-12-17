import { type ProviderInterface, type ProviderInterfaceCallback } from '@polkadot/rpc-provider/types';

import { type HexString } from '@/shared/core';

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

export type ProviderMetadata = {
  metadata: HexString;
  metadataVersion: number;
  runtimeVersion: number;
};

export interface ProviderWithMetadata extends ProviderInterface {
  onMetadataReceived: (callback: (value: ProviderMetadata) => unknown) => VoidFunction;
}
