import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { allSettled, fork } from 'effector';
import { describe, expect, test, vi } from 'vitest';

import {
  type FlexibleMultisigAccount,
  type FlexibleMultisigWallet,
  type MultisigAccount,
  type Transaction,
  AccountType,
  ConnectionStatus,
  CryptoType,
  SigningType,
  TransactionType,
  WalletType,
} from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { createAccountId, polkadotChain } from '@/shared/mocks';
import { parseEditControllerMarker } from '@/shared/transactions';
import {
  type AnyAccount,
  type MultisigOperation,
  accountService,
  accounts,
  multisigOperation,
} from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { type MultisigCandidate } from '@/aggregates/multisig-candidates';
import { type SelectedTarget } from '../types';

import { changeSignatoriesModel } from './change-signatories-model';
import { formModel } from './form-model';

// ─── Module-boundary mocks ───────────────────────────────────────────────────

// The fake ApiPromise below has no `tx` section, so `getExtrinsic[type](args, api)`
// (evaluated eagerly inside createComplexTxStore's $mergedExtrinsic combine) would
// throw. A null-returning stub keeps the fee machinery inert without touching the
// pure transaction builders this test asserts against. `getCallDataHex` is stubbed
// non-null so the draft-mode gate ($canSaveAsDraft) can open.
const MOCKED_CALL_DATA = '0xdeadbeef';

vi.mock('@/entities/transaction', async (importOriginal) => {
  const actual = await importOriginal<{ transactionService: Record<string, unknown> } & Record<string, unknown>>();

  return {
    ...actual,
    getExtrinsic: new Proxy({}, { get: () => () => null }),
    transactionService: {
      ...actual.transactionService,
      getCallDataHex: (transaction: unknown, api: unknown) => (transaction && api ? MOCKED_CALL_DATA : null),
    },
  };
});

// `$proxiesInfo` fetches on-chain proxies via proxyPallet storage — stub the storage
// read; the deposit math itself (proxyDepositBase + proxyDepositFactor × count) runs
// through the real proxyService against the fake api consts below.
const EXISTING_PROXIES = [
  { delegate: createAccountId('existing-delegate-1'), proxyType: 'Any' },
  { delegate: createAccountId('existing-delegate-2'), proxyType: 'Any' },
];

vi.mock('@/shared/pallet/proxy', async (importOriginal) => {
  const actual = await importOriginal<
    { proxyPallet: { storage: Record<string, unknown> } } & Record<string, unknown>
  >();

  return {
    ...actual,
    proxyPallet: {
      ...actual.proxyPallet,
      storage: {
        ...actual.proxyPallet.storage,
        proxies: vi.fn().mockImplementation(() =>
          Promise.resolve([
            {
              value: {
                proxies: EXISTING_PROXIES,
                // deposit currently reserved for the 2 existing slots: base + factor × 2
                deposit: '1020',
              },
            },
          ]),
        ),
      },
    },
  };
});

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PROXY_DEPOSIT_BASE = new BN(1000);
const PROXY_DEPOSIT_FACTOR = new BN(10);
const MULTISIG_DEPOSIT_BASE = new BN(100);
const MULTISIG_DEPOSIT_FACTOR = new BN(5);

// Only the constants the real deposit math reads — everything extrinsic-shaped is
// short-circuited by the getExtrinsic stub above.
const testApi = {
  consts: {
    proxy: {
      proxyDepositBase: PROXY_DEPOSIT_BASE,
      proxyDepositFactor: PROXY_DEPOSIT_FACTOR,
    },
    multisig: {
      depositBase: MULTISIG_DEPOSIT_BASE,
      depositFactor: MULTISIG_DEPOSIT_FACTOR,
    },
  },
} as unknown as ApiPromise;

const flexibleMultisigWalletId = 100;
const flexibleProxyAccountId = createAccountId('fm-proxy-account');
const flexibleSignatoryAccountId = createAccountId('fm-signatory-1');

const flexibleSignatories = [flexibleSignatoryAccountId];
const flexibleThreshold = 1;
const flexibleMultisigAccountId = accountUtils.getMultisigAccountId(
  flexibleSignatories,
  flexibleThreshold,
  CryptoType.SR25519,
);

const flexibleMultisigAccount: FlexibleMultisigAccount = {
  id: 'flex-multisig-1',
  accountId: flexibleProxyAccountId,
  walletId: flexibleMultisigWalletId,
  name: 'Flexible Multisig Account',
  type: 'chain',
  chainId: polkadotChain.chainId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  accountType: AccountType.FLEX_MULTISIG,
  multisigAccountId: flexibleMultisigAccountId,
  signatories: [{ accountId: flexibleSignatoryAccountId, name: 'FM Signatory 1' }],
  threshold: flexibleThreshold,
  proxyType: 'Any',
  deposit: '100000000000',
  entropyBlockNumber: 12345,
  extrinsicIndex: 0,
  createdAt: 0,
};

const flexibleMultisigWallet: FlexibleMultisigWallet = {
  id: flexibleMultisigWalletId,
  name: 'Flexible Multisig Wallet',
  type: WalletType.FLEXIBLE_MULTISIG,
  accounts: [],
};

const flexibleSignatoryAccount: AnyAccount = {
  id: 'flex-signatory-account-1',
  accountId: flexibleSignatoryAccountId,
  walletId: 1,
  name: 'FM Signatory 1',
  type: 'universal',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

// A regular multisig that is already known locally — used to flip
// $isNewControllerMultisigKnown and drop the announce remark.
const knownSignatoryAccountId = createAccountId('known-multisig-signatory');
const knownMultisigAccountId = accountUtils.getMultisigAccountId([knownSignatoryAccountId], 1, CryptoType.SR25519);

const knownMultisigAccount: MultisigAccount = {
  id: 'known-multisig-1',
  accountId: knownMultisigAccountId,
  walletId: 300,
  name: 'Known Multisig',
  type: 'universal',
  accountType: AccountType.MULTISIG,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  threshold: 1,
  signatories: [{ accountId: knownSignatoryAccountId, name: 'Known Signatory' }],
  createdAt: 0,
};

const knownCandidate: MultisigCandidate = {
  source: 'wallet',
  walletId: 300,
  name: 'Known Multisig',
  address: toAddress(knownMultisigAccountId, { prefix: polkadotChain.addressPrefix }),
  accountId: knownMultisigAccountId,
  signatories: [knownSignatoryAccountId],
  threshold: 1,
};

// A "modify" target whose derived multisig is NOT present in local accounts.
const newSignatories = [createAccountId('new-controller-sig-1'), createAccountId('new-controller-sig-2')];
const newThreshold = 2;
const newControllerAccountId = accountUtils.getMultisigAccountId(newSignatories, newThreshold, CryptoType.SR25519);
const modifyTarget: SelectedTarget = {
  kind: 'modify',
  signatories: newSignatories,
  threshold: newThreshold,
  derivedAddress: toAddress(newControllerAccountId, { prefix: polkadotChain.addressPrefix }),
};

const buildPendingEditOperation = (overrides: Partial<MultisigOperation> = {}): MultisigOperation => {
  const editTransaction = {
    chainId: polkadotChain.chainId,
    accountId: flexibleMultisigAccountId,
    type: TransactionType.PROXY,
    method: 'proxy',
    section: 'proxy',
    args: {
      real: toAddress(flexibleProxyAccountId, { prefix: polkadotChain.addressPrefix }),
      transaction: {
        chainId: polkadotChain.chainId,
        accountId: flexibleMultisigAccountId,
        type: TransactionType.BATCH_ALL,
        args: {
          transactions: [
            { type: TransactionType.ADD_PROXY, args: {} },
            { type: TransactionType.REMOVE_PROXY, args: {} },
          ],
        },
      },
    },
  };

  return {
    id: 'edit-op-1',
    status: 'pending',
    transaction: editTransaction,
    method: 'proxy',
    section: 'proxy',
    callHash: '0x01',
    callData: '0x02',
    chainId: polkadotChain.chainId,
    multisigAccountId: flexibleMultisigAccountId,
    depositor: flexibleSignatoryAccountId,
    blockCreated: 1,
    indexCreated: 0,
    events: [],
    timestamp: 0,
    ...overrides,
  } as unknown as MultisigOperation;
};

// ─── Scope setup ─────────────────────────────────────────────────────────────

type ScopeParams = {
  operations?: MultisigOperation[];
};

// The DI anyOf/pipeline registries register handlers through unscoped events at
// module import — combines under fork() read them through the scoped getState(),
// so every availability/permission/graph check silently resolves to false/empty
// unless stubs are registered inside the scope (same approach as
// initiator-resolution.test.ts and tests/integrations seedAccountHandlers).
const makeScope = async ({ operations = [] }: ScopeParams = {}) => {
  const scope = fork({
    values: new Map()
      .set(networkModel.$chains, { [polkadotChain.chainId]: polkadotChain })
      .set(networkModel.$connectionStatuses, { [polkadotChain.chainId]: ConnectionStatus.CONNECTED })
      .set(accounts.__test.$list, [flexibleMultisigAccount, flexibleSignatoryAccount, knownMultisigAccount])
      .set(multisigOperation.__test.$cachedOperations, operations),
  });

  await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
    scope,
    params: {
      body: ({ account, chain }: { account: AnyAccount; chain: typeof polkadotChain }) =>
        accountService.isChainAccount(account) ? account.chainId === chain.chainId : true,
      available: () => true,
    },
  });
  await allSettled(accountService.accountActionPermissionAnyOf.registerHandler, {
    scope,
    params: {
      body: () => true,
      available: () => true,
    },
  });
  await allSettled(accountService.accountCollectChildrenPipeline.registerHandler, {
    scope,
    params: {
      body(children: AnyAccount[], { account, accounts }: { account: AnyAccount; accounts: AnyAccount[] }) {
        if ('signatories' in account && Array.isArray(account.signatories)) {
          const signatoryIds = account.signatories.map((s: { accountId: string }) => s.accountId);

          return accounts.filter((a) => a.id !== account.id && signatoryIds.includes(a.accountId));
        }

        return children;
      },
      available: () => true,
    },
  });

  return scope;
};

type TestScope = Awaited<ReturnType<typeof makeScope>>;

// `flow.open` seeds formModel.$chain; `$apis` is delivered afterwards through an
// explicit store push. Seeding `$apis` through fork values instead leaves the
// api-dependent effect triggers silent: derived-store emissions are not tracked
// scope-locally under fork() (see memory: effector-derived-store-clock-fork-pitfall),
// so samples clocked on api-fed combines never fire for values that were only
// seeded, while a real store update propagates normally.
const openFlow = async (scope: TestScope) => {
  await allSettled(changeSignatoriesModel.flow.open, { scope, params: { wallet: flexibleMultisigWallet } });
  await allSettled(networkModel.$apis, { scope, params: { [polkadotChain.chainId]: testApi } });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('flexible-change-signatories change-signatories-model', () => {
  describe('$proxyCountDelta → deposit arithmetic', () => {
    test('verified mode reserves one extra proxy slot, trusted mode is a net-zero swap', async () => {
      const scope = await makeScope();
      await openFlow(scope);
      await allSettled(changeSignatoriesModel.targetSelected, { scope, params: modifyTarget });

      // verified (default): post-state has 2 existing + 1 new slot → base + factor × 3
      const expectedVerified = PROXY_DEPOSIT_BASE.add(PROXY_DEPOSIT_FACTOR.muln(3));
      expect(scope.getState(changeSignatoriesModel.$executionMode)).toBe('verified');
      expect(scope.getState(changeSignatoriesModel.$proxyDeposit)?.toString()).toBe(expectedVerified.toString());

      // trusted: add + remove in one batch → slot count stays at 2
      await allSettled(changeSignatoriesModel.executionModeChanged, { scope, params: 'trusted' });

      const expectedTrusted = PROXY_DEPOSIT_BASE.add(PROXY_DEPOSIT_FACTOR.muln(2));
      expect(scope.getState(changeSignatoriesModel.$proxyDeposit)?.toString()).toBe(expectedTrusted.toString());

      // the difference between the modes is exactly one proxy slot
      expect(expectedVerified.sub(expectedTrusted).toString()).toBe(PROXY_DEPOSIT_FACTOR.toString());
    });

    test('$totalDeposit charges only the delta: one slot in verified, nothing in trusted', async () => {
      const scope = await makeScope();
      await openFlow(scope);
      await allSettled(changeSignatoriesModel.targetSelected, { scope, params: modifyTarget });

      // multisig deposit for the new controller threshold (2): base + factor × 2
      const multisigDeposit = MULTISIG_DEPOSIT_BASE.add(MULTISIG_DEPOSIT_FACTOR.muln(newThreshold));
      expect(scope.getState(changeSignatoriesModel.$multisigDeposit).toString()).toBe(multisigDeposit.toString());

      // verified: ED (0, no signatory balance) + proxy delta (exactly one slot's worth
      // over the already-reserved deposit) + multisig deposit
      const verifiedTotal = PROXY_DEPOSIT_FACTOR.add(multisigDeposit);
      expect(scope.getState(changeSignatoriesModel.$totalDeposit)?.toString()).toBe(verifiedTotal.toString());

      // trusted: proxy count unchanged → delta 0 → only the multisig deposit remains
      await allSettled(changeSignatoriesModel.executionModeChanged, { scope, params: 'trusted' });
      expect(scope.getState(changeSignatoriesModel.$totalDeposit)?.toString()).toBe(multisigDeposit.toString());
    });
  });

  describe('$isEditOperationAlreadyExists', () => {
    test('pending edit operation for the same flexible multisig blocks the flow', async () => {
      const scope = await makeScope({ operations: [buildPendingEditOperation()] });
      await openFlow(scope);
      await allSettled(changeSignatoriesModel.targetSelected, { scope, params: modifyTarget });

      expect(scope.getState(changeSignatoriesModel.$isEditOperationAlreadyExists)).toBe(true);
      // the gate consuming the store: a fully-resolved target still cannot proceed
      expect(scope.getState(changeSignatoriesModel.$newControllerAccountId)).toBe(newControllerAccountId);
      expect(scope.getState(changeSignatoriesModel.$canProceedFromForm)).toBe(false);
    });

    test('executed edit operation does not block', async () => {
      const scope = await makeScope({ operations: [buildPendingEditOperation({ status: 'executed' })] });
      await openFlow(scope);
      await allSettled(changeSignatoriesModel.targetSelected, { scope, params: modifyTarget });

      expect(scope.getState(changeSignatoriesModel.$isEditOperationAlreadyExists)).toBe(false);
      expect(scope.getState(changeSignatoriesModel.$canProceedFromForm)).toBe(true);
    });

    test('pending edit operation for a different proxied account does not block', async () => {
      const otherReal = toAddress(createAccountId('other-proxied-account'), { prefix: polkadotChain.addressPrefix });
      const foreignOperation = buildPendingEditOperation();
      foreignOperation.transaction!.args['real'] = otherReal;

      const scope = await makeScope({ operations: [foreignOperation] });
      await openFlow(scope);
      await allSettled(changeSignatoriesModel.targetSelected, { scope, params: modifyTarget });

      expect(scope.getState(changeSignatoriesModel.$isEditOperationAlreadyExists)).toBe(false);
      expect(scope.getState(changeSignatoriesModel.$canProceedFromForm)).toBe(true);
    });
  });

  describe('announce remark in $coreTx', () => {
    // The asMulti / proxy wrap transformers are DI handlers that are not registered
    // under fork(), so the inner "flexible" half surfaces as the bare controller-edit
    // batch — which is exactly what these tests want to inspect.
    const getBatchTransactions = (tx: Transaction | null): Transaction[] => {
      expect(tx?.type).toBe(TransactionType.BATCH_ALL);

      return tx!.args['transactions'];
    };

    test('prepends a threshold/signatories remark when the new controller is unknown locally', async () => {
      const scope = await makeScope();
      await openFlow(scope);
      await allSettled(changeSignatoriesModel.targetSelected, { scope, params: modifyTarget });
      await allSettled(changeSignatoriesModel.selectSignatory, { scope, params: flexibleSignatoryAccount });

      const coreTx = scope.getState(changeSignatoriesModel.$coreTx);
      const batch = getBatchTransactions(coreTx);
      expect(coreTx?.accountId).toBe(flexibleSignatoryAccountId);
      expect(batch).toHaveLength(2);

      // announce remark carries the new controller's composition for indexers/peers
      const [announceTx, editTx] = batch;
      expect(announceTx!.type).toBe(TransactionType.REMARK_WITH_EVENT);
      expect(JSON.parse(announceTx!.args['remark'])).toEqual({
        signatories: newSignatories,
        threshold: newThreshold,
      });

      // second half is the verified-mode controller edit: batchAll(addProxy + marker)
      const editBatch = getBatchTransactions(editTx!);
      expect(editBatch.map((tx) => tx.type)).toEqual([TransactionType.ADD_PROXY, TransactionType.REMARK]);
      expect(editBatch.at(0)?.args['delegate']).toBe(newControllerAccountId);
    });

    test('skips the announce remark when the new controller multisig is known locally', async () => {
      const scope = await makeScope();
      await openFlow(scope);
      await allSettled(changeSignatoriesModel.targetSelected, {
        scope,
        params: { kind: 'existing', candidate: knownCandidate },
      });
      await allSettled(changeSignatoriesModel.selectSignatory, { scope, params: flexibleSignatoryAccount });

      const coreTx = scope.getState(changeSignatoriesModel.$coreTx);
      const batch = getBatchTransactions(coreTx);
      expect(batch).toHaveLength(1);

      // only the controller edit — no announce remark anywhere in the batch
      const editBatch = getBatchTransactions(batch.at(0)!);
      expect(editBatch.map((tx) => tx.type)).toEqual([TransactionType.ADD_PROXY, TransactionType.REMARK]);
      expect(batch.some((tx) => tx.type === TransactionType.REMARK_WITH_EVENT)).toBe(false);
    });
  });

  describe('draft mode', () => {
    const signerPath = [
      { kind: 'proxied' as const, accountId: flexibleProxyAccountId },
      { kind: 'multisig' as const, accountId: flexibleMultisigAccountId },
      { kind: 'signer' as const, accountId: flexibleSignatoryAccountId },
    ];

    test('$isDraftMode toggles and resets on flow.open', async () => {
      const scope = await makeScope();
      await openFlow(scope);

      expect(scope.getState(changeSignatoriesModel.$isDraftMode)).toBe(false);

      await allSettled(changeSignatoriesModel.events.toggleDraftMode, { scope, params: true });
      expect(scope.getState(changeSignatoriesModel.$isDraftMode)).toBe(true);

      await allSettled(changeSignatoriesModel.flow.open, { scope, params: { wallet: flexibleMultisigWallet } });
      expect(scope.getState(changeSignatoriesModel.$isDraftMode)).toBe(false);
    });

    test('$draftTx is the bare edit batch, built without a selected signer', async () => {
      const scope = await makeScope();
      await openFlow(scope);
      await allSettled(changeSignatoriesModel.targetSelected, { scope, params: modifyTarget });

      // no signer selected: the signed path ($coreTx) is unavailable while the
      // draft tx is already fully built — the wrap is applied at pick-up time
      expect(scope.getState(changeSignatoriesModel.$coreTx)).toBeNull();

      const draftTx = scope.getState(changeSignatoriesModel.$draftTx);
      expect(draftTx?.type).toBe(TransactionType.BATCH_ALL);
      // metadata accountId is the current controller, not a signatory
      expect(draftTx?.accountId).toBe(flexibleMultisigAccountId);

      const batch: Transaction[] = draftTx!.args['transactions'];
      expect(batch.map((tx) => tx.type)).toEqual([TransactionType.ADD_PROXY, TransactionType.REMARK]);

      const marker = parseEditControllerMarker(batch.at(1)!.args['remark']);
      expect(marker?.oldControllerAccountId).toBe(flexibleMultisigAccountId);
    });

    test('$draftTx has no announce remark and no wrapping, unlike $coreTx', async () => {
      const scope = await makeScope();
      await openFlow(scope);
      await allSettled(changeSignatoriesModel.targetSelected, { scope, params: modifyTarget });
      await allSettled(changeSignatoriesModel.selectSignatory, { scope, params: flexibleSignatoryAccount });

      const coreTx = scope.getState(changeSignatoriesModel.$coreTx);
      const draftTx = scope.getState(changeSignatoriesModel.$draftTx);

      // $coreTx: batchAll(announce remark + edit batch); $draftTx: the edit batch alone
      const coreBatch: Transaction[] = coreTx!.args['transactions'];
      const draftBatch: Transaction[] = draftTx!.args['transactions'];
      expect(coreBatch.map((tx) => tx.type)).toEqual([TransactionType.REMARK_WITH_EVENT, TransactionType.BATCH_ALL]);
      expect(draftBatch.map((tx) => tx.type)).toEqual([TransactionType.ADD_PROXY, TransactionType.REMARK]);

      // the draft's call is exactly the edit half that $coreTx nests one level deeper
      expect(draftBatch).toEqual(coreBatch.at(1)!.args['transactions']);
    });

    test('trusted mode drafts batchAll(addProxy + removeProxy)', async () => {
      const scope = await makeScope();
      await openFlow(scope);
      await allSettled(changeSignatoriesModel.targetSelected, { scope, params: modifyTarget });
      await allSettled(changeSignatoriesModel.executionModeChanged, { scope, params: 'trusted' });

      const draftTx = scope.getState(changeSignatoriesModel.$draftTx);
      const batch: Transaction[] = draftTx!.args['transactions'];
      expect(batch.map((tx) => tx.type)).toEqual([TransactionType.ADD_PROXY, TransactionType.REMOVE_PROXY]);
    });

    test('$canSaveAsDraft opens only with draft mode, committed path and resolved target', async () => {
      const scope = await makeScope();
      await openFlow(scope);
      await allSettled(changeSignatoriesModel.targetSelected, { scope, params: modifyTarget });

      expect(scope.getState(formModel.$api)).toBe(testApi);
      expect(scope.getState(changeSignatoriesModel.$canSaveAsDraft)).toBe(false);

      await allSettled(changeSignatoriesModel.events.toggleDraftMode, { scope, params: true });
      // draft mode on, but the signing path is not committed yet
      expect(scope.getState(changeSignatoriesModel.$isDraftPathComplete)).toBe(false);
      expect(scope.getState(changeSignatoriesModel.$canSaveAsDraft)).toBe(false);

      await allSettled(changeSignatoriesModel.events.draftPathCommitted, { scope, params: signerPath });
      expect(scope.getState(changeSignatoriesModel.$isDraftPathComplete)).toBe(true);
      expect(scope.getState(changeSignatoriesModel.$canSaveAsDraft)).toBe(true);
    });
  });
});
