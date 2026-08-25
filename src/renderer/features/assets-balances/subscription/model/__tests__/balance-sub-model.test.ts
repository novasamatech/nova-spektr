import { type ApiPromise } from '@polkadot/api';
import { allSettled, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type Chain, type ChainId, ConnectionStatus } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { networkModel } from '@/entities/network';
import { balanceSubModel } from '../balance-sub-model';

const CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;
const CHAIN = { chainId: CHAIN_ID, name: 'Polkadot', assets: [] } as unknown as Chain;
const API = { genesisHash: { toHex: () => CHAIN_ID } } as unknown as ApiPromise;
const ALICE = toAccountId(`0x${'1'.padStart(64, '0')}`);

const seeded = (status: ConnectionStatus) =>
  new Map()
    .set(networkModel.$chains, { [CHAIN_ID]: CHAIN })
    .set(networkModel.$apis, status === ConnectionStatus.CONNECTED ? { [CHAIN_ID]: API } : {})
    .set(networkModel.$connectionStatuses, { [CHAIN_ID]: status });

describe('balance-sub-model · one-shot fetch on a disconnected chain', () => {
  it('fetches right away when the chain is connected', async () => {
    const fetchFx = vi.fn(async () => []);
    const scope = fork({
      values: seeded(ConnectionStatus.CONNECTED),
      handlers: [[balanceSubModel.__test.fetchAccountsFx, fetchFx]],
    });

    await allSettled(balanceSubModel.fetchAccountIds, { scope, params: [{ accountId: ALICE, chain: CHAIN }] });

    expect(fetchFx).toHaveBeenCalledTimes(1);
    expect(fetchFx).toHaveBeenCalledWith(expect.objectContaining({ chain: CHAIN, accounts: [ALICE] }));
    expect(scope.getState(balanceSubModel.__test.$deferredFetches)).toEqual({});
  });

  it('defers the fetch while the chain is offline and replays it once it connects', async () => {
    const fetchFx = vi.fn(async () => []);
    const scope = fork({
      values: seeded(ConnectionStatus.DISCONNECTED),
      handlers: [[balanceSubModel.__test.fetchAccountsFx, fetchFx]],
    });

    await allSettled(balanceSubModel.fetchAccountIds, { scope, params: [{ accountId: ALICE, chain: CHAIN }] });
    // asked twice — remembered once
    await allSettled(balanceSubModel.fetchAccountIds, { scope, params: [{ accountId: ALICE, chain: CHAIN }] });

    expect(fetchFx).not.toHaveBeenCalled();
    expect(scope.getState(balanceSubModel.__test.$deferredFetches)).toEqual({ [CHAIN_ID]: [ALICE] });

    await allSettled(networkModel.$apis, { scope, params: { [CHAIN_ID]: API } });
    await allSettled(networkModel.$connectionStatuses, { scope, params: { [CHAIN_ID]: ConnectionStatus.CONNECTED } });
    await allSettled(networkModel.output.connectionStatusChanged, {
      scope,
      params: { chainId: CHAIN_ID, status: ConnectionStatus.CONNECTED },
    });

    expect(fetchFx).toHaveBeenCalledTimes(1);
    expect(fetchFx).toHaveBeenCalledWith(expect.objectContaining({ chain: CHAIN, accounts: [ALICE] }));
    expect(scope.getState(balanceSubModel.__test.$deferredFetches)).toEqual({});
  });

  it('ignores a connect of a chain nothing is waiting for', async () => {
    const fetchFx = vi.fn(async () => []);
    const scope = fork({
      values: seeded(ConnectionStatus.CONNECTED),
      handlers: [[balanceSubModel.__test.fetchAccountsFx, fetchFx]],
    });

    await allSettled(networkModel.output.connectionStatusChanged, {
      scope,
      params: { chainId: CHAIN_ID, status: ConnectionStatus.CONNECTED },
    });

    expect(fetchFx).not.toHaveBeenCalled();
  });
});
