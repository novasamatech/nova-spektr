import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { type KeyringPair } from '@polkadot/keyring/types';
import { MockProvider } from '@polkadot/rpc-provider/mock';
import { TypeRegistry } from '@polkadot/types';
import { u8aToHex } from '@polkadot/util';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { type Scope, allSettled, createWatch, fork } from 'effector';

import { type Chain, type HexString, type Transaction, TransactionType } from '@/shared/core';
import { createExtrinsicPayload, signExtrinsicPayload } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
// eslint-disable-next-line boundaries/entry-point -- reusing a real metadata blob fixture in tests only
import { metadata } from '@/domains/network/transaction/service.mocks';
import { networkModel } from '@/entities/network';
import { SubmitStep } from '../../lib/types';
import { type SubmitInputDeprecated, submitModel } from '../submit-model';

vi.mock('i18next', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  t: (key: string) => key,
}));

const createMockApi = async () => {
  const registry = new TypeRegistry();
  const provider = new MockProvider(registry);
  const firstBlockHash = await provider.send('chain_getBlockHash', []);
  const genesisHash = registry.createType('Hash', firstBlockHash).toHex();

  return ApiPromise.create({
    metadata: { [`${genesisHash}-0`]: metadata },
    provider,
    registry,
    throwOnConnect: true,
  });
};

const toAccountId = (pair: KeyringPair) => u8aToHex(pair.publicKey) as unknown as AccountId;

const chain = { chainId: '0x00' } as unknown as Chain;
const account = { accountId: '0x00' } as unknown as AnyAccount;

const createTransaction = (accountId: AccountId): Transaction => ({
  chainId: chain.chainId,
  accountId,
  type: TransactionType.TRANSFER,
  args: {},
});

describe('submitModel deprecated flow', () => {
  let api: ApiPromise;
  let alice: KeyringPair;
  let bob: KeyringPair;

  /**
   * Mirrors what sign-model hands over: the encoded `ExtrinsicPayload` and the
   * signature made over it.
   */
  const createSigned = (pair: KeyringPair, method: HexString, nonce: number) => {
    const payload = createExtrinsicPayload(api.registry, {
      method,
      nonce,
      genesisHash: api.genesisHash.toHex(),
      version: api.extrinsicVersion,
    });

    return signExtrinsicPayload(payload, pair);
  };

  const createMethod = (amount: number) => api.tx.balances.transferKeepAlive(alice.address, amount).method.toHex();

  const createScope = () => fork({ values: new Map().set(networkModel.$apis, { [chain.chainId]: api }) });

  const submit = async (
    input: Omit<SubmitInputDeprecated, 'chain' | 'account' | 'coreTxs'>,
    scope: Scope = createScope(),
  ) => {
    const done = vi.fn();
    createWatch({ unit: submitModel.done, scope, fn: done });

    await allSettled(submitModel.events.formInitiated, {
      scope,
      params: { chain, account, coreTxs: input.wrappedTxs, ...input },
    });

    return {
      store: scope.getState(submitModel.$submitStore),
      step: scope.getState(submitModel.$submitStep),
      done,
    };
  };

  const expectNotSubmitted = ({ store, step, done }: Awaited<ReturnType<typeof submit>>, message: string) => {
    expect(store).toBeNull();
    expect(step).toEqual({ step: SubmitStep.ERROR, message });
    expect(done).not.toHaveBeenCalled();
  };

  beforeAll(async () => {
    await cryptoWaitReady();
    const keyring = new Keyring({ type: 'sr25519' });
    alice = keyring.addFromUri('//Alice');
    bob = keyring.addFromUri('//Bob');
    api = await createMockApi();
  });

  afterAll(async () => {
    await api.disconnect();
  });

  it('rebuilds every extrinsic from its signed payload', async () => {
    const methods = [createMethod(1), createMethod(2), createMethod(3)];
    const signed = methods.map((method, nonce) => createSigned(alice, method, nonce));

    const { store, step, done } = await submit({
      // one transaction was split into three extrinsics before signing
      wrappedTxs: [createTransaction(toAccountId(alice))],
      txPayloads: signed.map((s) => s.payload),
      signatures: signed.map((s) => s.signature),
    });

    expect(store).toHaveLength(3);
    expect(store?.map((s) => s.extrinsic.method.toHex())).toEqual(methods);
    expect(store?.map((s) => s.payload)).toEqual(signed.map((s) => s.payload));
    expect(store?.map((s) => s.signature)).toEqual(signed.map((s) => s.signature));
    expect(store?.every((s) => s.api === api)).toBe(true);
    expect(step.step).toBe(SubmitStep.LOADING);
    expect(done).not.toHaveBeenCalled();
  });

  it('assigns each signature to the signatory that produced it', async () => {
    const signed = [createSigned(bob, createMethod(1), 0), createSigned(alice, createMethod(2), 0)];

    const { store } = await submit({
      // transactions and signatures are in different order, so index-based pairing would be wrong
      wrappedTxs: [createTransaction(toAccountId(alice)), createTransaction(toAccountId(bob))],
      txPayloads: signed.map((s) => s.payload),
      signatures: signed.map((s) => s.signature),
    });

    expect(store?.map((s) => s.signatory)).toEqual([toAccountId(bob), toAccountId(alice)]);
  });

  it('does not submit when the number of signatures differs from the number of payloads', async () => {
    const signed = [createSigned(alice, createMethod(1), 0), createSigned(alice, createMethod(2), 1)];

    const result = await submit({
      wrappedTxs: [createTransaction(toAccountId(alice))],
      txPayloads: signed.map((s) => s.payload),
      signatures: [signed[0]!.signature],
    });

    expectNotSubmitted(result, 'operation.submitErrors.signatureCountMismatch');
  });

  it('does not submit a signature made by someone outside the operation', async () => {
    const signed = [createSigned(alice, createMethod(1), 0), createSigned(bob, createMethod(2), 1)];

    const result = await submit({
      wrappedTxs: [createTransaction(toAccountId(alice))],
      txPayloads: signed.map((s) => s.payload),
      signatures: signed.map((s) => s.signature),
    });

    expectNotSubmitted(result, 'operation.submitErrors.unknownSignatory');
  });

  it('does not submit when nothing was signed', async () => {
    const result = await submit({
      wrappedTxs: [createTransaction(toAccountId(alice))],
      txPayloads: [],
      signatures: [],
    });

    expectNotSubmitted(result, 'operation.submitErrors.nothingSigned');
  });

  it('clears a previous build error when the next deprecated submission starts', async () => {
    const scope = createScope();
    const signed = createSigned(alice, createMethod(1), 0);

    await submit({ wrappedTxs: [createTransaction(toAccountId(alice))], txPayloads: [], signatures: [] }, scope);
    const { step, store } = await submit(
      {
        wrappedTxs: [createTransaction(toAccountId(alice))],
        txPayloads: [signed.payload],
        signatures: [signed.signature],
      },
      scope,
    );

    expect(step.step).toBe(SubmitStep.LOADING);
    expect(store).toHaveLength(1);
  });

  it('still finishes the flow when init gets nothing to submit', async () => {
    const scope = createScope();
    const done = vi.fn();
    createWatch({ unit: submitModel.done, scope, fn: done });

    await allSettled(submitModel.init, { scope, params: [] });
    await allSettled(submitModel.submitToNetwork, { scope });

    expect(scope.getState(submitModel.$submitStep).step).toBe(SubmitStep.SUCCESS);
    expect(done).toHaveBeenCalledWith([]);
  });
});
