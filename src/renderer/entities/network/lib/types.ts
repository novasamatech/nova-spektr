import { ApiPromise } from '@polkadot/api';

import type { Connection, Chain, ConnectionStatus } from '@shared/core';

export type ExtendedChain = Chain & {
  connection: Connection;
  connectionStatus: ConnectionStatus;
  api?: ApiPromise;
};
