import { allSettled, createEvent, createStore, fork } from 'effector';
import { describe, expect, it } from 'vitest';

import { type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { pathModel } from '@/features/signing-path';
import { createDraftModel } from '../model/create-draft-model';

import { type DraftNetworkStore, createDraftModeBinding } from './createDraftModeBinding';

const acc = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;
const signer = (accountId: AccountId): PathNode => ({ kind: 'signer', accountId });
const multisig = (accountId: AccountId): PathNode => ({ kind: 'multisig', accountId });

const CHAIN_A = '0xaaaa' as ChainId;

// Single module-level binding — the factory installs samples into shared
// `pathModel`/`createDraftModel` graphs, so reusing avoids duplicate samples.
// Per-test isolation is provided by `fork()`.
const formInitiated = createEvent();
const chainChanged = createEvent();
const binding = createDraftModeBinding({ formInitiated, chainChanged });

const $connectCallDataHex = createStore<string | null>(null);
const $connectNetworkStore: DraftNetworkStore = createStore<{ chain: { chainId: ChainId } } | null>(null);
const $connectCanSave = createStore(false);
binding.connectSave({
  source: 'test-source',
  $callDataHex: $connectCallDataHex,
  $networkStore: $connectNetworkStore,
  $canSave: $connectCanSave,
});

describe('createDraftModeBinding · $isDraftMode', () => {
  it('starts off', () => {
    const scope = fork();
    expect(scope.getState(binding.$isDraftMode)).toBe(false);
  });

  it('explicit true sets state', async () => {
    const scope = fork();
    await allSettled(binding.draftModeToggled, { scope, params: true });
    expect(scope.getState(binding.$isDraftMode)).toBe(true);
  });

  it('explicit false sets state', async () => {
    const scope = fork({ values: new Map().set(binding.$isDraftMode, true) });
    await allSettled(binding.draftModeToggled, { scope, params: false });
    expect(scope.getState(binding.$isDraftMode)).toBe(false);
  });

  it('null flips state (off → on)', async () => {
    const scope = fork();
    await allSettled(binding.draftModeToggled, { scope, params: null });
    expect(scope.getState(binding.$isDraftMode)).toBe(true);
  });

  it('null flips state (on → off)', async () => {
    const scope = fork({ values: new Map().set(binding.$isDraftMode, true) });
    await allSettled(binding.draftModeToggled, { scope, params: null });
    expect(scope.getState(binding.$isDraftMode)).toBe(false);
  });

  it('resets on formInitiated', async () => {
    const scope = fork({ values: new Map().set(binding.$isDraftMode, true) });
    await allSettled(formInitiated, { scope });
    expect(scope.getState(binding.$isDraftMode)).toBe(false);
  });
});

describe('createDraftModeBinding · $initiatedDraft', () => {
  it('starts false', () => {
    const scope = fork();
    expect(scope.getState(binding.$initiatedDraft)).toBe(false);
  });

  it('flips true on saveAsDraftRequested', async () => {
    const scope = fork();
    await allSettled(binding.saveAsDraftRequested, { scope });
    expect(scope.getState(binding.$initiatedDraft)).toBe(true);
  });

  it('resets on createDraftModel.modalClosed', async () => {
    const scope = fork({ values: new Map().set(binding.$initiatedDraft, true) });
    await allSettled(createDraftModel.modalClosed, { scope });
    expect(scope.getState(binding.$initiatedDraft)).toBe(false);
  });

  it('does NOT reset on createDraftModel.draftCreated — parent flows depend on observing true', async () => {
    const scope = fork({ values: new Map().set(binding.$initiatedDraft, true) });
    await allSettled(createDraftModel.draftCreated, { scope });
    expect(scope.getState(binding.$initiatedDraft)).toBe(true);
  });

  it('resets on formInitiated', async () => {
    const scope = fork({ values: new Map().set(binding.$initiatedDraft, true) });
    await allSettled(formInitiated, { scope });
    expect(scope.getState(binding.$initiatedDraft)).toBe(false);
  });
});

describe('createDraftModeBinding · $draftSigningPath', () => {
  it('starts empty', () => {
    const scope = fork();
    expect(scope.getState(binding.$draftSigningPath)).toEqual([]);
    expect(scope.getState(binding.$isDraftPathComplete)).toBe(false);
  });

  it('auto-commits when pathModel.$path ends with signer (not editing)', async () => {
    const scope = fork();
    const path = [multisig(acc(1)), signer(acc(2))];
    await allSettled(pathModel.pathSeeded, { scope, params: path });
    expect(scope.getState(binding.$draftSigningPath)).toEqual(path);
    expect(scope.getState(binding.$isDraftPathComplete)).toBe(true);
  });

  it('does NOT auto-commit when pathModel.$path does not end with signer', async () => {
    const scope = fork();
    await allSettled(pathModel.pathSeeded, { scope, params: [multisig(acc(1))] });
    expect(scope.getState(binding.$draftSigningPath)).toEqual([]);
    expect(scope.getState(binding.$isDraftPathComplete)).toBe(false);
  });

  it('does NOT auto-commit while editing inside SigningPathEditModal', async () => {
    const scope = fork();
    await allSettled(binding.draftPathEditStarted, { scope });
    await allSettled(pathModel.pathSeeded, { scope, params: [signer(acc(1))] });
    expect(scope.getState(binding.$draftSigningPath)).toEqual([]);
  });

  it('clears on pathTruncatedTo when not editing', async () => {
    const path = [multisig(acc(1)), signer(acc(2))];
    const scope = fork({ values: new Map().set(binding.$draftSigningPath, path) });
    await allSettled(pathModel.pathTruncatedTo, { scope, params: 0 });
    expect(scope.getState(binding.$draftSigningPath)).toEqual([]);
  });

  it('does NOT clear on pathTruncatedTo while editing (modal-driven truncates are ignored)', async () => {
    const path = [multisig(acc(1)), signer(acc(2))];
    const scope = fork({
      values: new Map()
        .set(binding.$draftSigningPath, path)
        // Simulate the user being mid-edit inside SigningPathEditModal.
        .set(pathModel.$path, path),
    });
    await allSettled(binding.draftPathEditStarted, { scope });
    await allSettled(pathModel.pathTruncatedTo, { scope, params: 0 });
    expect(scope.getState(binding.$draftSigningPath)).toEqual(path);
  });

  it('resets on draftModeToggled (mode flip clears stale picker state)', async () => {
    const path = [signer(acc(1))];
    const scope = fork({ values: new Map().set(binding.$draftSigningPath, path) });
    await allSettled(binding.draftModeToggled, { scope, params: false });
    expect(scope.getState(binding.$draftSigningPath)).toEqual([]);
  });

  it('resets on chainChanged', async () => {
    const path = [signer(acc(1))];
    const scope = fork({ values: new Map().set(binding.$draftSigningPath, path) });
    await allSettled(chainChanged, { scope });
    expect(scope.getState(binding.$draftSigningPath)).toEqual([]);
  });
});

describe('createDraftModeBinding · connectSave', () => {
  it('opens createDraftModel when all gates pass', async () => {
    const scope = fork({
      values: new Map()
        .set($connectCallDataHex, '0xdeadbeef')
        .set($connectNetworkStore, { chain: { chainId: CHAIN_A } })
        .set($connectCanSave, true)
        .set(binding.$draftSigningPath, [signer(acc(1))]),
    });
    await allSettled(binding.saveAsDraftRequested, { scope });
    expect(scope.getState(createDraftModel.$isOpen)).toBe(true);
  });

  it('rejects save when canSave is false', async () => {
    const scope = fork({
      values: new Map()
        .set($connectCallDataHex, '0xdeadbeef')
        .set($connectNetworkStore, { chain: { chainId: CHAIN_A } })
        .set($connectCanSave, false),
    });
    await allSettled(binding.saveAsDraftRequested, { scope });
    expect(scope.getState(createDraftModel.$isOpen)).toBe(false);
  });

  it('rejects save when callData is missing', async () => {
    const scope = fork({
      values: new Map()
        .set($connectCallDataHex, null)
        .set($connectNetworkStore, { chain: { chainId: CHAIN_A } })
        .set($connectCanSave, true),
    });
    await allSettled(binding.saveAsDraftRequested, { scope });
    expect(scope.getState(createDraftModel.$isOpen)).toBe(false);
  });

  it('rejects save when networkStore is null', async () => {
    const scope = fork({
      values: new Map()
        .set($connectCallDataHex, '0xdeadbeef')
        .set($connectNetworkStore, null)
        .set($connectCanSave, true),
    });
    await allSettled(binding.saveAsDraftRequested, { scope });
    expect(scope.getState(createDraftModel.$isOpen)).toBe(false);
  });
});

describe('createDraftModeBinding · pathModel.pathReset wiring', () => {
  it('resets pathModel on draftModeToggled', async () => {
    const scope = fork({ values: new Map().set(pathModel.$path, [signer(acc(1))]) });
    await allSettled(binding.draftModeToggled, { scope, params: true });
    expect(scope.getState(pathModel.$path)).toEqual([]);
  });

  it('resets pathModel on formInitiated', async () => {
    const scope = fork({ values: new Map().set(pathModel.$path, [signer(acc(1))]) });
    await allSettled(formInitiated, { scope });
    expect(scope.getState(pathModel.$path)).toEqual([]);
  });

  it('resets pathModel on chainChanged', async () => {
    const scope = fork({ values: new Map().set(pathModel.$path, [signer(acc(1))]) });
    await allSettled(chainChanged, { scope });
    expect(scope.getState(pathModel.$path)).toEqual([]);
  });
});
