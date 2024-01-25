import { ApiPromise } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';

import type { Connection, Chain, ConnectionStatus } from '@shared/core';

// =====================================================
// ======================= General =====================
// =====================================================

export type ExtendedChain = Chain & {
  connection: Connection;
  connectionStatus: ConnectionStatus;
  api?: ApiPromise;
  provider?: ProviderInterface;
};
