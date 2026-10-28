import { allSettled, createWatch, fork } from 'effector';
import { describe, expect, it, vi } from 'vitest';

import { type ID, type Transaction, type Wallet, CryptoType, SigningType, TransactionType } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { polkadotChain, polkadotChainId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { type BasketTransaction } from '@/aggregates/basket-operations';
import { signModel } from '@/features/operations/OperationSign';
import { Step } from '../../types';
import { signOperations } from '../sign';
import { validation } from '../validation';

// --- fixtures ----------------------------------------------------------------

const ALICE: AccountId = toAccountId(`0x${'1'.padStart(64, '0')}`);

const ACCOUNT: Wallet['accounts'][number] = {
  id: 'account-1',
  type: 'universal',
  name: 'Alice',
  walletId: 1,
  accountId: ALICE,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

const coreTx: Transaction = {
  chainId: polkadotChainId,
  accountId: ALICE,
  type: TransactionType.REMARK,
  args: {},
};

const transaction = (id: ID): BasketTransaction => ({
  id,
  initiatorAccountId: ALICE,
  coreTx,
  route: [ACCOUNT],
  createdAt: 0,
});

const FEE_ERROR = { name: 'insufficientBalanceForFee', errorText: 'transfer.notEnoughBalanceForFeeError' };

type Verdicts = {
  results?: Record<ID, (typeof FEE_ERROR)[]>;
  pending?: Record<ID, boolean>;
};

/** The sign modal open on `transactions`, with the given verdicts in hand. */
const onConfirm = (transactions: BasketTransaction[], { results = {}, pending = {} }: Verdicts = {}) =>
  fork({
    values: new Map()
      .set(signOperations.$transactions, transactions)
      .set(signOperations.$step, Step.CONFIRM)
      .set(validation.$validatingResults, results)
      .set(validation.$pending, pending)
      .set(accounts.__test.$list, [ACCOUNT])
      .set(networkModel.$chains, { [polkadotChainId]: polkadotChain }),
  });

// --- tests -------------------------------------------------------------------

describe('basket-operations · sign gate', () => {
  it('signs the selected transactions once every verdict is clean', async () => {
    const scope = onConfirm([transaction(1), transaction(2)], {
      results: { 1: [], 2: [] },
      pending: { 1: false, 2: false },
    });
    const payloads: unknown[] = [];
    const unsubscribe = createWatch({
      unit: signModel.events.formInitiated,
      scope,
      fn: payload => payloads.push(payload),
    });

    try {
      expect(scope.getState(signOperations.$canSign)).toBe(true);

      await allSettled(signOperations.confirm, { scope });

      expect(payloads).toHaveLength(1);
      expect(payloads[0]).toMatchObject({ signingPayloads: [{ account: ACCOUNT }, { account: ACCOUNT }] });
      expect(scope.getState(signOperations.$step)).toBe(Step.SIGN);
    } finally {
      unsubscribe();
    }
  });

  it.each([
    ['no verdict has arrived yet', {}],
    ['a transaction is still being checked', { results: { 1: [] }, pending: { 1: true } }],
    ['a transaction failed its check', { results: { 1: [FEE_ERROR] }, pending: { 1: false } }],
  ] satisfies [string, Verdicts][])('refuses to sign while %s, even from the confirm', async (_, verdicts) => {
    // The button is disabled in each of these states, and a stale click must
    // not walk on either.
    const scope = onConfirm([transaction(1)], verdicts);
    const signSpy = vi.fn();
    const unsubscribe = createWatch({ unit: signModel.events.formInitiated, scope, fn: signSpy });

    try {
      expect(scope.getState(signOperations.$canSign)).toBe(false);

      await allSettled(signOperations.confirm, { scope });

      expect(signSpy).not.toHaveBeenCalled();
      expect(scope.getState(signOperations.$step)).toBe(Step.CONFIRM);
    } finally {
      unsubscribe();
    }
  });

  it('refuses to sign an empty selection', async () => {
    const scope = onConfirm([]);
    const signSpy = vi.fn();
    const unsubscribe = createWatch({ unit: signModel.events.formInitiated, scope, fn: signSpy });

    try {
      expect(scope.getState(signOperations.$canSign)).toBe(false);

      await allSettled(signOperations.confirm, { scope });

      expect(signSpy).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });
});
