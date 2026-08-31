import { type ApiPromise } from '@polkadot/api';
import { allSettled, fork } from 'effector';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type Chain,
  type ChainId,
  type DecodedTransaction,
  AccountType,
  CryptoType,
  SigningType,
  TransactionType,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type Draft } from '@/domains/backend';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
import type * as DecodeDraft from '../lib/decode-draft-transaction';
import { decodeDraftTransaction } from '../lib/decode-draft-transaction';

import { submitDraftModel } from './submit-draft-model';

vi.mock('../lib/decode-draft-transaction', async (importOriginal) => ({
  ...(await importOriginal<typeof DecodeDraft>()),
  decodeDraftTransaction: vi.fn(() => null),
}));

const CHAIN_ID = `0x${'11'.repeat(32)}` as ChainId;
const CHAIN = { chainId: CHAIN_ID, name: 'Test', assets: [], nodes: [], options: [] } as unknown as Chain;

const acc = (n: number): AccountId => `1${'0'.repeat(46)}${n}`.slice(0, 48) as AccountId;

const MULTISIG_ID = acc(1);
const SIGNER_ID = acc(2);

const makeAccount = (accountId: AccountId): AnyAccount =>
  ({
    id: `acct-${accountId}`,
    type: 'universal',
    walletId: 1,
    name: `wallet-${accountId}`,
    accountId,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.POLKADOT_VAULT,
    createdAt: 0,
  }) as unknown as AnyAccount;

const makeMultisigAccount = (accountId: AccountId): AnyAccount =>
  ({
    id: `acct-${accountId}`,
    type: 'universal',
    walletId: 2,
    name: `multisig-${accountId}`,
    accountId,
    accountType: AccountType.MULTISIG,
    cryptoType: CryptoType.SR25519,
    signingType: SigningType.MULTISIG,
    signatories: [{ accountId: SIGNER_ID }],
    threshold: 2,
    createdAt: 0,
  }) as unknown as AnyAccount;

const makeDraft = (): Draft => ({
  id: 'draft-1',
  operation: null,
  multisigAccountId: MULTISIG_ID,
  chainId: CHAIN_ID,
  // A real transfer's call data isn't needed: the flow must stop before it is
  // ever wrapped. Any hex keeps `$transaction` non-null so the gate is what
  // blocks the flow, not a missing call.
  callData: '0x0000',
  description: 'test transfer',
  createdBy: 'creator',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  signingPath: [
    { kind: 'multisig', accountId: MULTISIG_ID },
    { kind: 'signer', accountId: SIGNER_ID },
  ],
  initiatorAccountId: SIGNER_ID,
});

// `anyOf` registries resolve through the scoped store — an unscoped
// registerHandler leaves every availability check false, and then *every* node
// looks unresolvable for the wrong reason.
const setupScope = async (accountList: AnyAccount[]) => {
  const scope = fork({
    values: new Map<any, any>([
      [accounts.__test.$list, accountList],
      [backendConfigurationModel.$backendUrl, 'https://backend.test'],
    ]),
  });

  await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
    scope,
    params: { body: () => true, available: () => true },
  });

  return scope;
};

describe('submitDraftModel · a draft is only signable along a fully resolved path', () => {
  it('blocks the flow and names the signer when it has no local account', async () => {
    const scope = await setupScope([makeMultisigAccount(MULTISIG_ID)]);

    await allSettled(submitDraftModel.flowStarted, {
      scope,
      params: { draft: makeDraft(), initiator: makeMultisigAccount(MULTISIG_ID), chain: CHAIN },
    });

    expect(scope.getState(submitDraftModel.$pathResolutionError)).toBe(true);
    expect(scope.getState(submitDraftModel.$wrappedTxErrorKind)).toBe('signing-path-unresolved');
    expect(scope.getState(submitDraftModel.$pathMissingAccountId)).toBe(SIGNER_ID);
    // Empty route + no wrapped transaction => nothing to confirm, nothing to sign.
    expect(scope.getState(submitDraftModel.$route)).toEqual([]);
    expect(scope.getState(submitDraftModel.$wrappedTx)).toBeNull();
    expect(scope.getState(submitDraftModel.confirmModel.$confirms)).toEqual([]);
  });

  it('blocks the flow and names the source account when it has no local account', async () => {
    const scope = await setupScope([makeAccount(SIGNER_ID)]);

    await allSettled(submitDraftModel.flowStarted, {
      scope,
      params: { draft: makeDraft(), initiator: null, chain: CHAIN },
    });

    expect(scope.getState(submitDraftModel.$pathResolutionError)).toBe(true);
    expect(scope.getState(submitDraftModel.$pathMissingAccountId)).toBe(MULTISIG_ID);
    expect(scope.getState(submitDraftModel.$wrappedTx)).toBeNull();
    expect(scope.getState(submitDraftModel.confirmModel.$confirms)).toEqual([]);
  });

  it('blocks a legacy draft that carries no signing path — no route discovery', async () => {
    const multisigAccount = makeMultisigAccount(MULTISIG_ID);
    const signerAccount = makeAccount(SIGNER_ID);

    // Both accounts are present: before, route discovery would have found a
    // multisig -> signer route and happily signed along it.
    const scope = await setupScope([multisigAccount, signerAccount]);

    await allSettled(submitDraftModel.flowStarted, {
      scope,
      params: { draft: { ...makeDraft(), signingPath: [] }, initiator: multisigAccount, chain: CHAIN },
    });

    expect(scope.getState(submitDraftModel.$wrappedTxErrorKind)).toBe('signing-path-missing');
    expect(scope.getState(submitDraftModel.$route)).toEqual([]);
    expect(scope.getState(submitDraftModel.$wrappedTx)).toBeNull();
    expect(scope.getState(submitDraftModel.confirmModel.$confirms)).toEqual([]);
  });

  it('blocks a draft whose path was truncated before a signer', async () => {
    const multisigAccount = makeMultisigAccount(MULTISIG_ID);
    const scope = await setupScope([multisigAccount, makeAccount(SIGNER_ID)]);

    await allSettled(submitDraftModel.flowStarted, {
      scope,
      params: {
        draft: { ...makeDraft(), signingPath: [{ kind: 'multisig', accountId: MULTISIG_ID }] },
        initiator: multisigAccount,
        chain: CHAIN,
      },
    });

    expect(scope.getState(submitDraftModel.$wrappedTxErrorKind)).toBe('signing-path-missing');
    expect(scope.getState(submitDraftModel.$wrappedTx)).toBeNull();
  });

  it('resolves the path when every account is present', async () => {
    const multisigAccount = makeMultisigAccount(MULTISIG_ID);
    const signerAccount = makeAccount(SIGNER_ID);

    const scope = await setupScope([multisigAccount, signerAccount]);

    await allSettled(submitDraftModel.flowStarted, {
      scope,
      params: { draft: makeDraft(), initiator: multisigAccount, chain: CHAIN },
    });

    expect(scope.getState(submitDraftModel.$pathResolutionError)).toBe(false);
    expect(scope.getState(submitDraftModel.$wrappedTxErrorKind)).toBeNull();
    expect(scope.getState(submitDraftModel.$pathMissingAccountId)).toBeNull();
    expect(scope.getState(submitDraftModel.$route)).toEqual([multisigAccount, signerAccount]);
  });
});

describe('submitDraftModel · unknown recipient gate', () => {
  // `toAccountId` only passes hex through untouched — the padded decimal ids
  // above are fine for path nodes but not for a transfer `dest`.
  const hexAcc = (n: number): AccountId => `0x${n.toString(16).padStart(64, '0')}` as AccountId;
  const STRANGER = hexAcc(9);
  const OWN_ID = hexAcc(7);
  const PROXIED_ID = acc(3);
  const transferTo = (dest: AccountId) =>
    ({
      type: TransactionType.TRANSFER,
      section: 'balances',
      method: 'transferKeepAlive',
      chainId: CHAIN_ID,
      address: '',
      args: { dest, value: '1' },
    }) as unknown as DecodedTransaction;
  const healthyBook = { accountId: acc(8), accountName: 'Backend user', permissions: [] };

  // Address book connected and healthy, chain api up — the only situation in
  // which a recipient can actually be checked.
  const setupVerifiedScope = async (accountList: AnyAccount[]) => {
    const scope = fork({
      values: new Map<any, any>([
        [accounts.__test.$list, accountList],
        [backendConfigurationModel.$backendUrl, 'https://backend.test'],
        [networkModel.$apis, { [CHAIN_ID]: {} as ApiPromise }],
        [connectionHistoryModel.$hasEverConnected, true],
        [authModel.$authState, healthyBook],
      ]),
    });

    await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
      scope,
      params: { body: () => true, available: () => true },
    });

    return scope;
  };

  const startFlow = (scope: ReturnType<typeof fork>, draft: Draft = makeDraft()) =>
    allSettled(submitDraftModel.flowStarted, {
      scope,
      params: { draft, initiator: makeMultisigAccount(MULTISIG_ID), chain: CHAIN },
    });

  beforeEach(() => {
    vi.mocked(decodeDraftTransaction).mockReset();
    vi.mocked(decodeDraftTransaction).mockReturnValue(null);
  });

  it('computes the warning from the transfer inside the draft, not from the multisig', async () => {
    vi.mocked(decodeDraftTransaction).mockReturnValue(transferTo(STRANGER));
    const scope = await setupVerifiedScope([makeMultisigAccount(MULTISIG_ID), makeAccount(SIGNER_ID)]);
    await startFlow(scope);

    expect(scope.getState(submitDraftModel.$destinationAccountId)).toBe(STRANGER);
    expect(scope.getState(submitDraftModel.$recipientWarning)).toBe('unknown');
    expect(scope.getState(submitDraftModel.$recipientRiskAccepted)).toBe(false);
  });

  it('refuses to start signing until the warning is acknowledged (multisig first approval)', async () => {
    vi.mocked(decodeDraftTransaction).mockReturnValue(transferTo(STRANGER));
    const scope = await setupVerifiedScope([makeMultisigAccount(MULTISIG_ID), makeAccount(SIGNER_ID)]);
    await startFlow(scope);
    expect(scope.getState(submitDraftModel.$step)).toBe(submitDraftModel.Step.CONFIRM);

    await allSettled(submitDraftModel.confirmModel.startSigning, { scope });
    expect(scope.getState(submitDraftModel.$step)).toBe(submitDraftModel.Step.CONFIRM);

    await allSettled(submitDraftModel.riskAcknowledgedToggled, { scope, params: true });
    expect(scope.getState(submitDraftModel.$recipientRiskAccepted)).toBe(true);

    await allSettled(submitDraftModel.confirmModel.startSigning, { scope });
    expect(scope.getState(submitDraftModel.$step)).toBe(submitDraftModel.Step.SIGN);
  });

  it('gates a proxy-only draft (no multisig hop) the same way', async () => {
    vi.mocked(decodeDraftTransaction).mockReturnValue(transferTo(STRANGER));
    const scope = await setupVerifiedScope([makeAccount(PROXIED_ID), makeAccount(SIGNER_ID)]);
    await startFlow(scope, {
      ...makeDraft(),
      multisigAccountId: null as unknown as AccountId,
      signingPath: [
        { kind: 'proxied', accountId: PROXIED_ID },
        { kind: 'signer', accountId: SIGNER_ID },
      ],
    });

    expect(scope.getState(submitDraftModel.$recipientWarning)).toBe('unknown');
    expect(scope.getState(submitDraftModel.$recipientRiskAccepted)).toBe(false);

    await allSettled(submitDraftModel.confirmModel.startSigning, { scope });
    expect(scope.getState(submitDraftModel.$step)).not.toBe(submitDraftModel.Step.SIGN);
  });

  it("lets a transfer to one of the user's own accounts through without a tick", async () => {
    vi.mocked(decodeDraftTransaction).mockReturnValue(transferTo(OWN_ID));
    const scope = await setupVerifiedScope([
      makeMultisigAccount(MULTISIG_ID),
      makeAccount(SIGNER_ID),
      makeAccount(OWN_ID),
    ]);
    await startFlow(scope);

    expect(scope.getState(submitDraftModel.$recipientWarning)).toBe('none');
    expect(scope.getState(submitDraftModel.$recipientRiskAccepted)).toBe(true);
  });

  it('drops the acknowledgement when the flow finishes and when another draft opens', async () => {
    vi.mocked(decodeDraftTransaction).mockReturnValue(transferTo(STRANGER));
    const scope = await setupVerifiedScope([makeMultisigAccount(MULTISIG_ID), makeAccount(SIGNER_ID)]);
    await startFlow(scope);

    await allSettled(submitDraftModel.riskAcknowledgedToggled, { scope, params: true });
    expect(scope.getState(submitDraftModel.$isRiskAcknowledged)).toBe(true);

    await allSettled(submitDraftModel.flowFinished, { scope });
    expect(scope.getState(submitDraftModel.$isRiskAcknowledged)).toBe(false);

    await startFlow(scope);
    await allSettled(submitDraftModel.riskAcknowledgedToggled, { scope, params: true });
    await startFlow(scope, { ...makeDraft(), id: 'draft-2' });
    expect(scope.getState(submitDraftModel.$isRiskAcknowledged)).toBe(false);
    expect(scope.getState(submitDraftModel.$recipientRiskAccepted)).toBe(false);
  });
});
