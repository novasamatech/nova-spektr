import { ApiPromise } from '@polkadot/api';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { type Weight } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { allSettled, fork } from 'effector';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Transaction, TransactionType } from '@/shared/core';
import { createAccountId, polkadotChain } from '@/shared/mocks';
import { type AnyAccount, type Extrinsic, ExtrinsicTooHeavyError, transactionService } from '@/domains/network';
// eslint-disable-next-line boundaries/entry-point -- reusing a real metadata blob fixture in tests only
import { metadata } from '@/domains/network/transaction/service.mocks';
import { networkModel } from '@/entities/network';
import { getExtrinsic, transactionBuilder } from '@/entities/transaction';
import { type TransactionSigningPayload } from '../../lib/types';
import { signModel } from '../sign-model';

const api = {} as unknown as ApiPromise;
const extrinsic = {} as unknown as Extrinsic;
const signatory = { accountId: '0x00', walletId: 1 } as unknown as AnyAccount;

const payload: TransactionSigningPayload = {
  api,
  chain: polkadotChain,
  signatory,
  transaction: { type: 'encoded', callData: '0x00' },
};

describe('signModel', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fills the sign store with the split extrinsics', async () => {
    vi.spyOn(transactionService, 'createExtrinsic').mockReturnValue(extrinsic);
    vi.spyOn(transactionService, 'splitExtrinsic').mockResolvedValue([extrinsic]);

    const scope = fork();
    await allSettled(signModel.init, { scope, params: [payload] });

    expect(scope.getState(signModel.$signStore)).toEqual([{ extrinsic, signatory, chain: polkadotChain, api }]);
    expect(scope.getState(signModel.$blocked)).toBeNull();
  });

  it('blocks signing instead of preparing a call that cannot fit into one extrinsic', async () => {
    vi.spyOn(transactionService, 'createExtrinsic').mockReturnValue(extrinsic);
    vi.spyOn(transactionService, 'splitExtrinsic').mockRejectedValue(new ExtrinsicTooHeavyError('multisig', 'asMulti'));

    const scope = fork();
    await allSettled(signModel.init, { scope, params: [payload] });

    expect(scope.getState(signModel.$signStore)).toBeNull();
    expect(scope.getState(signModel.$blocked)).toEqual({
      reason: { kind: 'extrinsic-too-heavy', detail: expect.any(String) },
      chain: polkadotChain,
    });
  });

  it('clears the block once a new payload is signed', async () => {
    vi.spyOn(transactionService, 'createExtrinsic').mockReturnValue(extrinsic);
    vi.spyOn(transactionService, 'splitExtrinsic')
      .mockRejectedValueOnce(new ExtrinsicTooHeavyError('multisig', 'asMulti'))
      .mockResolvedValue([extrinsic]);

    const scope = fork();
    await allSettled(signModel.init, { scope, params: [payload] });
    expect(scope.getState(signModel.$blocked)).not.toBeNull();

    await allSettled(signModel.init, { scope, params: [payload] });

    expect(scope.getState(signModel.$blocked)).toBeNull();
    expect(scope.getState(signModel.$signStore)).toHaveLength(1);
  });

  it('blocks signing when the transaction cannot be encoded', async () => {
    vi.spyOn(transactionService, 'createExtrinsic').mockImplementation(() => {
      throw new Error('unknown call');
    });
    const splitExtrinsic = vi.spyOn(transactionService, 'splitExtrinsic');

    const scope = fork();
    await allSettled(signModel.init, { scope, params: [payload] });

    expect(splitExtrinsic).not.toHaveBeenCalled();
    expect(scope.getState(signModel.$signStore)).toBeNull();
    expect(scope.getState(signModel.$blocked)).toEqual({
      reason: { kind: 'call-hash-unavailable', detail: 'unknown call' },
      chain: polkadotChain,
    });
  });

  it('blocks signing when a deprecated payload cannot be encoded', async () => {
    const transaction: Transaction = {
      type: TransactionType.TRANSFER,
      chainId: polkadotChain.chainId,
      accountId: signatory.accountId,
      args: {},
    };
    vi.spyOn(getExtrinsic, TransactionType.TRANSFER).mockImplementation(() => {
      throw new Error('unknown call');
    });

    const scope = fork({ values: [[networkModel.$apis, { [polkadotChain.chainId]: api }]] });
    await allSettled(signModel.events.formInitiated, {
      scope,
      params: { signingPayloads: [{ chain: polkadotChain, account: signatory, signatory, transaction }] },
    });

    expect(scope.getState(signModel.$signStore)).toBeNull();
    expect(scope.getState(signModel.$blocked)).toEqual({
      reason: { kind: 'call-hash-unavailable', detail: 'unknown call' },
      chain: polkadotChain,
    });
  });

  it('does not treat other preparation failures as a too-heavy call', async () => {
    vi.spyOn(transactionService, 'createExtrinsic').mockReturnValue(extrinsic);
    vi.spyOn(transactionService, 'splitExtrinsic').mockRejectedValue(new Error('rpc down'));

    const scope = fork();
    await allSettled(signModel.init, { scope, params: [payload] });

    expect(scope.getState(signModel.$blocked)).toBeNull();
  });
});

describe('signModel with a batch too heavy for one extrinsic', () => {
  // Mock metadata: the budget of one extrinsic is ~1.33e12 of refTime, so a
  // batch of 20 calls weighing 1e11 each does not fit.
  const CALL_REF_TIME = 100_000_000_000;
  const HEAVY_BATCH_SIZE = 20;

  type MockCall = { section: string; method: string; args: readonly unknown[] };

  const getMockRefTime = (call: MockCall): number => {
    if (call.section === 'utility' && call.method === 'batchAll') {
      return (call.args[0] as MockCall[]).reduce((sum, inner) => sum + getMockRefTime(inner), 0);
    }

    return CALL_REF_TIME;
  };

  let api: ApiPromise;

  beforeAll(async () => {
    const registry = new TypeRegistry();
    const provider = new MockProvider(registry);
    const firstBlockHash = await provider.send('chain_getBlockHash', []);
    const genesisHash = registry.createType('Hash', firstBlockHash).toHex();

    api = await ApiPromise.create({
      metadata: { [`${genesisHash}-0`]: metadata },
      provider,
      registry,
      throwOnConnect: true,
    });
  });

  afterAll(async () => {
    await api.disconnect();
  });

  beforeEach(() => {
    vi.spyOn(Object.getPrototypeOf(api.tx.system.remark('0x')), 'paymentInfo').mockImplementation(function (this: {
      method: MockCall;
    }) {
      const weight = api.registry.createType<Weight>('SpWeightsWeightV2Weight', {
        refTime: getMockRefTime(this.method),
        proofSize: 1,
      });

      return Promise.resolve({ weight });
    });
  });

  const initDeprecated = async (transaction: Transaction) => {
    const scope = fork({ values: [[networkModel.$apis, { [polkadotChain.chainId]: api }]] });
    await allSettled(signModel.events.formInitiated, {
      scope,
      params: { signingPayloads: [{ chain: polkadotChain, account: signatory, signatory, transaction }] },
    });

    return scope;
  };

  const tooHeavy = {
    reason: { kind: 'extrinsic-too-heavy', detail: expect.any(String) },
    chain: polkadotChain,
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks an oversized bulk transfer instead of splitting it', async () => {
    const transaction = transactionBuilder.buildMultiTransfer({
      chain: polkadotChain,
      accountId: signatory.accountId,
      transfers: Array.from({ length: HEAVY_BATCH_SIZE }, (_, index) => ({
        recipient: createAccountId(index + 1),
        amount: new BN(index + 1),
      })),
    });

    const scope = await initDeprecated(transaction);

    expect(scope.getState(signModel.$signStore)).toBeNull();
    expect(scope.getState(signModel.$batchSplitWarning)).toBeNull();
    expect(scope.getState(signModel.$blocked)).toEqual(tooHeavy);
  });

  it('blocks an oversized vested transfer instead of splitting it', async () => {
    const transaction = transactionBuilder.buildVestedTransfer({
      chain: polkadotChain,
      accountId: signatory.accountId,
      vestingSchedule: Array.from({ length: HEAVY_BATCH_SIZE }, (_, index) => ({
        target: createAccountId(index + 1),
        locked: new BN(1000),
        startingBlock: new BN(1),
        perBlock: new BN(1),
      })),
    });

    const scope = await initDeprecated(transaction);

    expect(scope.getState(signModel.$signStore)).toBeNull();
    expect(scope.getState(signModel.$blocked)).toEqual(tooHeavy);
  });

  it('blocks an oversized bulk transfer that arrives as call data', async () => {
    const transfers = Array.from({ length: HEAVY_BATCH_SIZE }, (_, index) =>
      api.tx.balances.transferKeepAlive(createAccountId(index + 1), index + 1),
    );
    const transaction = transactionService.createEncodedTransactionFromExtrinsic(api.tx.utility.batchAll(transfers));

    const scope = fork();
    await allSettled(signModel.init, { scope, params: [{ ...payload, api, transaction }] });

    expect(scope.getState(signModel.$signStore)).toBeNull();
    expect(scope.getState(signModel.$blocked)).toEqual(tooHeavy);
  });

  it('signs a bulk transfer that fits as one extrinsic', async () => {
    const transaction = transactionBuilder.buildMultiTransfer({
      chain: polkadotChain,
      accountId: signatory.accountId,
      transfers: [
        { recipient: createAccountId(1), amount: new BN(1) },
        { recipient: createAccountId(2), amount: new BN(2) },
      ],
    });

    const scope = await initDeprecated(transaction);

    expect(scope.getState(signModel.$signStore)).toHaveLength(1);
    expect(scope.getState(signModel.$blocked)).toBeNull();
  });

  it('still splits an oversized payouts batch and warns about it', async () => {
    const payouts = Array.from({ length: HEAVY_BATCH_SIZE }, (_, era) =>
      api.tx.staking.payoutStakers(createAccountId(1), era),
    );
    const transaction = transactionService.createEncodedTransactionFromExtrinsic(api.tx.utility.batchAll(payouts));

    const scope = fork();
    await allSettled(signModel.init, { scope, params: [{ ...payload, api, transaction }] });

    const signStore = scope.getState(signModel.$signStore);
    expect(signStore?.length).toBeGreaterThan(1);
    expect(scope.getState(signModel.$blocked)).toBeNull();
    expect(scope.getState(signModel.$batchSplitWarning)).toEqual({
      wasSplit: true,
      payloadCountBeforeSplit: 1,
      extrinsicCountAfterSplit: signStore?.length,
    });
  });
});
