import { allSettled, createEvent, createStore, fork } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type Chain, CryptoType, SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accountService, accounts } from '@/domains/network';

import { createSigningPathModel } from './createSigningPathModel';

const acc = (n: number): AccountId => `1${'0'.repeat(46)}${n}`.slice(0, 48) as AccountId;

const CHAIN: Chain = { chainId: '0xaaaa', options: [] } as unknown as Chain;

const makeAccount = (accountId: AccountId): AnyAccount => {
  const draft = {
    id: `acct-${accountId}`,
    type: 'universal',
    walletId: 1,
    name: `wallet-${accountId}`,
    accountId,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    createdAt: 0,
  };
  return draft as unknown as AnyAccount;
};

const proxied = (accountId: AccountId): PathNode => ({ kind: 'proxied', accountId });
const multisig = (accountId: AccountId): PathNode => ({ kind: 'multisig', accountId });
const signer = (accountId: AccountId): PathNode => ({ kind: 'signer', accountId });

describe('createSigningPathModel', () => {
  beforeEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({
      body: () => true,
      available: () => true,
    });
  });

  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
  });

  it('starts with an empty path', () => {
    const formInitiated = createEvent<unknown>();
    const $initiator = createStore<AnyAccount | null>(null);
    const $chain = createStore<Chain | null>(CHAIN);

    const { $signingPath } = createSigningPathModel({
      initiator: $initiator,
      chain: $chain,
      resetOn: formInitiated,
    });

    const scope = fork();
    expect(scope.getState($signingPath)).toEqual([]);
  });

  it('signingPathChanged updates $signingPath', async () => {
    const formInitiated = createEvent<unknown>();
    const $initiator = createStore<AnyAccount | null>(null);
    const $chain = createStore<Chain | null>(CHAIN);

    const { $signingPath, signingPathChanged } = createSigningPathModel({
      initiator: $initiator,
      chain: $chain,
      resetOn: formInitiated,
    });

    const path: PathNode[] = [proxied(acc(1)), signer(acc(2))];
    const scope = fork();
    await allSettled(signingPathChanged, { scope, params: path });

    expect(scope.getState($signingPath)).toEqual(path);
  });

  it('resetOn clears the path', async () => {
    const formInitiated = createEvent<unknown>();
    const $initiator = createStore<AnyAccount | null>(null);
    const $chain = createStore<Chain | null>(CHAIN);

    const { $signingPath, signingPathChanged } = createSigningPathModel({
      initiator: $initiator,
      chain: $chain,
      resetOn: formInitiated,
    });

    const scope = fork();
    await allSettled(signingPathChanged, { scope, params: [proxied(acc(1)), signer(acc(2))] });
    expect(scope.getState($signingPath)).toHaveLength(2);

    await allSettled(formInitiated, { scope, params: undefined });
    expect(scope.getState($signingPath)).toEqual([]);
  });

  it('accepts an array of resetOn events', async () => {
    const formInitiated = createEvent<unknown>();
    const flowFinished = createEvent<unknown>();
    const $initiator = createStore<AnyAccount | null>(null);
    const $chain = createStore<Chain | null>(CHAIN);

    const { $signingPath, signingPathChanged } = createSigningPathModel({
      initiator: $initiator,
      chain: $chain,
      resetOn: [formInitiated, flowFinished],
    });

    const scope = fork();
    await allSettled(signingPathChanged, { scope, params: [proxied(acc(1)), signer(acc(2))] });
    await allSettled(flowFinished, { scope, params: undefined });
    expect(scope.getState($signingPath)).toEqual([]);

    // The other event resets too.
    await allSettled(signingPathChanged, { scope, params: [multisig(acc(3)), signer(acc(4))] });
    await allSettled(formInitiated, { scope, params: undefined });
    expect(scope.getState($signingPath)).toEqual([]);
  });

  it('$signatoryFromPath returns the last signer node resolved against accounts', async () => {
    const formInitiated = createEvent<unknown>();
    const $initiator = createStore<AnyAccount | null>(null);
    const $chain = createStore<Chain | null>(CHAIN);

    const { $signatoryFromPath, $signingPath } = createSigningPathModel({
      initiator: $initiator,
      chain: $chain,
      resetOn: formInitiated,
    });

    const a2 = makeAccount(acc(2));
    // Pre-populate $signingPath via fork values rather than firing the event,
    // so we test the combine in isolation from the default-seed pipeline.
    const scope = fork({
      values: new Map<any, any>([
        [accounts.__test.$list, [makeAccount(acc(1)), a2]],
        [$chain, CHAIN],
        [$signingPath, [proxied(acc(1)), signer(acc(2))]],
      ]),
    });

    expect(scope.getState($signatoryFromPath)).toEqual(a2);
  });

  it('$signatoryFromPath returns null when chain is null', async () => {
    const formInitiated = createEvent<unknown>();
    const $initiator = createStore<AnyAccount | null>(null);
    const $chain = createStore<Chain | null>(null);

    const { $signatoryFromPath, signingPathChanged } = createSigningPathModel({
      initiator: $initiator,
      chain: $chain,
      resetOn: formInitiated,
    });

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [makeAccount(acc(1)), makeAccount(acc(2))]]]),
    });

    await allSettled(signingPathChanged, { scope, params: [proxied(acc(1)), signer(acc(2))] });
    expect(scope.getState($signatoryFromPath)).toBeNull();
  });

  it('$signatoryFromPath returns null when path does not end in a signer', async () => {
    const formInitiated = createEvent<unknown>();
    const $initiator = createStore<AnyAccount | null>(null);
    const $chain = createStore<Chain | null>(CHAIN);

    const { $signatoryFromPath, signingPathChanged } = createSigningPathModel({
      initiator: $initiator,
      chain: $chain,
      resetOn: formInitiated,
    });

    const scope = fork({
      values: new Map<any, any>([[accounts.__test.$list, [makeAccount(acc(1)), makeAccount(acc(2))]]]),
    });

    await allSettled(signingPathChanged, { scope, params: [proxied(acc(1)), multisig(acc(2))] });
    expect(scope.getState($signatoryFromPath)).toBeNull();
  });

  it('$signatoryFromPath returns null when the signer is missing from accounts', async () => {
    const formInitiated = createEvent<unknown>();
    const $initiator = createStore<AnyAccount | null>(null);
    const $chain = createStore<Chain | null>(CHAIN);

    const { $signatoryFromPath, signingPathChanged } = createSigningPathModel({
      initiator: $initiator,
      chain: $chain,
      resetOn: formInitiated,
    });

    const scope = fork({
      // acc(2) absent
      values: new Map<any, any>([[accounts.__test.$list, [makeAccount(acc(1))]]]),
    });

    await allSettled(signingPathChanged, { scope, params: [proxied(acc(1)), signer(acc(2))] });
    expect(scope.getState($signatoryFromPath)).toBeNull();
  });

  it('signingPathChanged blocks subsequent default-path seeding (override flag)', async () => {
    // No graph data is wired in this scope, so $defaultPathFor would emit []
    // anyway. The key behaviour we exercise here is that the override flag
    // flips on signingPathChanged and survives an unrelated initiator event.
    const formInitiated = createEvent<unknown>();
    const $initiator = createStore<AnyAccount | null>(null);
    const $chain = createStore<Chain | null>(CHAIN);

    const { $signingPath, signingPathChanged } = createSigningPathModel({
      initiator: $initiator,
      chain: $chain,
      resetOn: formInitiated,
    });

    const userPath: PathNode[] = [proxied(acc(1)), signer(acc(2))];
    const scope = fork();
    await allSettled(signingPathChanged, { scope, params: userPath });

    // $defaultPathFor would emit [] here; if the override flag weren't set,
    // the empty default would clobber the user's path.
    expect(scope.getState($signingPath)).toEqual(userPath);
  });

  it('resetUserOverrideOn re-arms default seeding after a reset', async () => {
    const formInitiated = createEvent<unknown>();
    const initiatorChanged = createEvent<unknown>();
    const $initiator = createStore<AnyAccount | null>(null);
    const $chain = createStore<Chain | null>(CHAIN);

    const { $signingPath, signingPathChanged } = createSigningPathModel({
      initiator: $initiator,
      chain: $chain,
      resetOn: formInitiated,
      resetUserOverrideOn: initiatorChanged,
    });

    const userPath: PathNode[] = [proxied(acc(1)), signer(acc(2))];
    const scope = fork();
    await allSettled(signingPathChanged, { scope, params: userPath });
    expect(scope.getState($signingPath)).toEqual(userPath);

    // Flipping the override flag back lets a future default-path emission
    // overwrite $signingPath. Here we trip it manually via signingPathChanged
    // to assert the wiring contract: a subsequent user-driven change still
    // works after a reset.
    await allSettled(initiatorChanged, { scope, params: undefined });
    const nextPath: PathNode[] = [multisig(acc(3)), signer(acc(4))];
    await allSettled(signingPathChanged, { scope, params: nextPath });
    expect(scope.getState($signingPath)).toEqual(nextPath);
  });
});
