import { type ApiPromise } from '@polkadot/api';
import { allSettled, fork } from 'effector';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type Transaction, TransactionType } from '@/shared/core';
import { polkadotChain } from '@/shared/mocks';
import { type AnyAccount, type Extrinsic, ExtrinsicTooHeavyError, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { getExtrinsic } from '@/entities/transaction';
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
