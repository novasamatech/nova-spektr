import { type ApiPromise } from '@polkadot/api';

import { type Chain, type Connection, type ConnectionStatus } from '@shared/core';

export type ExtendedChain = Chain & {
  connection: Connection;
  connectionStatus: ConnectionStatus;
  api?: ApiPromise;
};
