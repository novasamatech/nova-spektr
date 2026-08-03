import { allSettled } from 'effector';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type DecodedTransaction,
  type FlexibleMultisigAccount,
  type HexString,
  type MultisigAccount,
  type Wallet,
  AccountType,
  CryptoType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import {
  EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND,
  buildEditControllerMarkerTx,
  buildVerifyProxyRemarkTx,
  parseEditControllerMarker,
} from '@/shared/transactions';
import {
  type AnyAccount,
  type MultisigOperation,
  accounts,
  multisigOperation,
  multisigOperationService,
} from '@/domains/network';
import { accountUtils, walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import { walletSelect } from '@/aggregates/wallet-select';
import { parseProxyEditOperation } from '@/features/multisig-operations/lib/proxy-edit';
import { approveModel } from '@/features/multisig-operations/model/approve-model';
import { proxiesModel } from '@/features/wallet-details/model/proxies-model';
import { type Proxy, walletProxiesModel } from '@/features/wallet-details/model/wallet-proxies-model';
import { multisigWallet, polkadotChain, polkadotChainId, vaultWallet } from '../../fixtures/index';
import {
  type FeatureTestEnvironment,
  FeatureTestBuilder,
  allureMetadata,
  resetAccountHandlers,
  seedAccountHandlers,
} from '../../utils/index';

/**
 * Flexible-multisig controller rotation — cross-session visibility.
 *
 * Scenario under test: a verified-mode controller rotation
 * (`proxy.proxy(real=pure, batchAll(addProxy(newController) + edit-controller
 * marker remark))`) was signed in a previous session and is still pending on
 * chain. This suite proves that when a fresh session starts from the persisted
 * cache only (no live subscriptions yet):
 *
 * 1. The operation surfaces from the cached branch of `$allOperations` as pending
 *    and is recognized as an edit-controller op.
 * 2. It is visible with the OLD controller's memberships selected (both the
 *    standalone old-controller multisig wallet and the flexible wallet).
 * 3. Both ends of the swap (old controller from the marker, new controller from
 *    the addProxy call) are recoverable from the persisted call data.
 * 4. The proxies-model reports the half-rotated pure proxy link as `not_verified`
 *    / `not_verified_no_wallet`, and only a real verify-proxy ping flips it to
 *    `pending_verification` (strict gate).
 * 5. The verification status is presentational only — the approve-model still
 *    yields actionable signatories for an operation on the unverified flexible
 *    multisig.
 *
 * All cases seed the nearest INPUT stores of the multisig-operation domain
 * ($cachedOperations — the layer `persist` hydrates from IndexedDB) and the
 * wallet-details proxy layer ($walletProxies — the layer the on-chain proxy
 * subscription writes). The live subscription layer itself needs real APIs and
 * is out of scope for a model-level integration test.
 */

const BLOCK_CREATED = 500;
const INDEX_CREATED = 2;

// ─── Inline fixtures ─────────────────────────────────────────────────────────
// No flexible-multisig fixture exists in `tests/integrations/fixtures`; mirror
// the sibling edit-controller test and keep them local.

const flexibleWalletId = 300;
const newControllerWalletId = 301;

// The flexible wallet's pure proxy — the account both controllers point at.
const pureProxyAccountId = createAccountId('rotation-pure-proxy');

// OLD controller: 1-of-1 multisig, its signatory lives in the local vault wallet.
const oldSignatoryAccountId = createAccountId('rotation-old-signatory');
const oldControllerAccountId = accountUtils.getMultisigAccountId([oldSignatoryAccountId], 1, CryptoType.SR25519);

// NEW controller: 2-of-2 multisig the rotation delegates to.
const newSignatoryFirstId = createAccountId('rotation-new-signatory-1');
const newSignatorySecondId = createAccountId('rotation-new-signatory-2');
const newControllerAccountId = accountUtils.getMultisigAccountId(
  [newSignatoryFirstId, newSignatorySecondId],
  2,
  CryptoType.SR25519,
);

const flexibleWallet: Wallet = {
  id: flexibleWalletId,
  name: 'Rotating Flexible Wallet',
  type: WalletType.FLEXIBLE_MULTISIG,
  accounts: [],
};

const flexibleAccount: FlexibleMultisigAccount = {
  id: 'rotation-flex-account',
  accountId: pureProxyAccountId,
  walletId: flexibleWalletId,
  name: 'Rotating Flexible Account',
  type: 'chain',
  chainId: polkadotChainId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  accountType: AccountType.FLEX_MULTISIG,
  multisigAccountId: oldControllerAccountId,
  signatories: [{ accountId: oldSignatoryAccountId, name: 'Old Signatory' }],
  threshold: 1,
  proxyType: 'Any',
  deposit: '100000000000',
  entropyBlockNumber: 12345,
  extrinsicIndex: 0,
  createdAt: 0,
};

// The old controller multisig also exists as a standalone local wallet — the
// "old multisig wallet" membership the rotation must stay visible from.
const oldControllerAccount: MultisigAccount = {
  id: 'rotation-old-controller-account',
  accountId: oldControllerAccountId,
  walletId: multisigWallet.id,
  name: 'Old Controller Multisig',
  type: 'universal',
  accountType: AccountType.MULTISIG,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  threshold: 1,
  signatories: [{ accountId: oldSignatoryAccountId, name: 'Old Signatory' }],
  createdAt: 0,
};

const newControllerWallet: Wallet = {
  id: newControllerWalletId,
  name: 'New Controller Wallet',
  type: WalletType.MULTISIG,
  accounts: [],
};

const newControllerAccount: MultisigAccount = {
  id: 'rotation-new-controller-account',
  accountId: newControllerAccountId,
  walletId: newControllerWalletId,
  name: 'New Controller Multisig',
  type: 'universal',
  accountType: AccountType.MULTISIG,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.MULTISIG,
  threshold: 2,
  signatories: [
    { accountId: newSignatoryFirstId, name: 'New Signatory 1' },
    { accountId: newSignatorySecondId, name: 'New Signatory 2' },
  ],
  createdAt: 0,
};

// Vault account controlling the old controller's signatory.
const oldSignatoryVaultAccount: AnyAccount = {
  id: 'rotation-old-signatory-vault',
  accountId: oldSignatoryAccountId,
  walletId: vaultWallet.id,
  name: 'Old Signatory',
  type: 'universal',
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: 0,
};

// ─── Persisted-operation builders ────────────────────────────────────────────

/**
 * Verified-mode rotation call data, exactly as production builds and later
 * decodes it: `proxy.proxy(real=pure, batchAll(addProxy(newController) +
 * edit-controller marker remark))`. The marker remark string comes from the
 * REAL builder so the parse side is exercised against production-shaped data.
 */
const buildRotationCallData = (): DecodedTransaction => {
  const markerTx = buildEditControllerMarkerTx({
    chainId: polkadotChainId,
    accountId: oldControllerAccountId,
    oldControllerAccountId,
  });

  const addProxyCall: DecodedTransaction = {
    chainId: polkadotChainId,
    accountId: oldControllerAccountId,
    section: 'proxy',
    method: 'addProxy',
    args: { delegate: newControllerAccountId, proxyType: 'Any', delay: 0 },
  };

  const markerCall: DecodedTransaction = {
    chainId: polkadotChainId,
    accountId: oldControllerAccountId,
    section: 'system',
    method: 'remark',
    args: { remark: markerTx.args['remark'] },
  };

  const editBatch: DecodedTransaction = {
    chainId: polkadotChainId,
    accountId: oldControllerAccountId,
    section: 'utility',
    method: 'batchAll',
    args: { transactions: [addProxyCall, markerCall] },
  };

  return {
    chainId: polkadotChainId,
    accountId: oldControllerAccountId,
    section: 'proxy',
    method: 'proxy',
    args: { real: pureProxyAccountId, forceProxyType: 'Any', transaction: editBatch },
  };
};

const buildPendingOperation = (
  callHash: HexString,
  transaction: DecodedTransaction,
  multisigAccountId = oldControllerAccountId,
): MultisigOperation => ({
  id: multisigOperationService.getOperationId(
    polkadotChainId,
    callHash,
    multisigAccountId,
    BLOCK_CREATED,
    INDEX_CREATED,
  ),
  status: 'pending',
  transaction,
  method: transaction.method,
  section: transaction.section,
  callHash,
  callData: null,
  chainId: polkadotChainId,
  multisigAccountId,
  proxiedAccountId: pureProxyAccountId,
  depositor: oldSignatoryAccountId,
  blockCreated: pjsSchema.helpers.toBlockHeight(BLOCK_CREATED),
  indexCreated: INDEX_CREATED,
  events: [],
  timestamp: 1_700_000_000_000,
});

const buildRotationOperation = () => buildPendingOperation('0xaaaa1111', buildRotationCallData());

/**
 * A real verify-proxy ping dispatched by the NEW controller through the pure
 * proxy: `proxy.proxy(real=pure, system.remarkWithEvent(<verify marker>))`.
 * Marker payload built with the production builder.
 */
const buildVerifyPingOperation = (): MultisigOperation => {
  const remarkTx = buildVerifyProxyRemarkTx({
    chainId: polkadotChainId,
    accountId: newControllerAccountId,
    delegateAccountId: newControllerAccountId,
    pureProxyAccountId,
  });

  const pingCall: DecodedTransaction = {
    chainId: polkadotChainId,
    accountId: newControllerAccountId,
    section: 'proxy',
    method: 'proxy',
    args: {
      real: pureProxyAccountId,
      forceProxyType: 'Any',
      transaction: {
        chainId: polkadotChainId,
        accountId: newControllerAccountId,
        section: 'system',
        method: 'remarkWithEvent',
        args: { remark: remarkTx.args['remark'] },
      },
    },
  };

  return buildPendingOperation('0xbbbb2222', pingCall, newControllerAccountId);
};

/**
 * An incidental pending op through the same (new controller, pure) pair — NOT a
 * verify ping.
 */
const buildIncidentalOperation = (): MultisigOperation => {
  const transferCall: DecodedTransaction = {
    chainId: polkadotChainId,
    accountId: newControllerAccountId,
    section: 'proxy',
    method: 'proxy',
    args: {
      real: pureProxyAccountId,
      forceProxyType: 'Any',
      transaction: {
        chainId: polkadotChainId,
        accountId: newControllerAccountId,
        section: 'balances',
        method: 'transferKeepAlive',
        args: { dest: oldSignatoryAccountId, value: '1000000000' },
      },
    },
  };

  return buildPendingOperation('0xcccc3333', transferCall, newControllerAccountId);
};

// ─── Environment helpers ─────────────────────────────────────────────────────

type EnvOptions = {
  cachedOperations?: MultisigOperation[];
  withNewControllerWallet?: boolean;
  withRotatedProxyLink?: boolean;
};

/**
 * The pure proxy's on-chain delegation list in the post-rotation state: a
 * single ANY link to the NEW controller (the old link is already gone).
 */
const rotatedProxyLink: Proxy = {
  accountId: newControllerAccountId,
  proxiedAccountId: pureProxyAccountId,
  chainId: polkadotChainId,
  proxyType: 'Any',
  delay: 0,
};

/**
 * Fresh-session environment: wallets/accounts exist, the multisig-operation
 * domain has NOT completed any live fetch ($expectedChainIds stays empty), and
 * $cachedOperations carries what `persist` (key 'multisig-operations') hydrated
 * from the previous session. `withRotatedProxyLink` seeds the wallet-details
 * proxy layer (the store the on-chain proxy subscription writes into).
 */
const buildEnv = ({
  cachedOperations = [],
  withNewControllerWallet = false,
  withRotatedProxyLink = false,
}: EnvOptions = {}) => {
  const wallets = [vaultWallet, multisigWallet, flexibleWallet];
  const accountsList = [oldSignatoryVaultAccount, oldControllerAccount, flexibleAccount];

  if (withNewControllerWallet) {
    wallets.push(newControllerWallet);
    accountsList.push(newControllerAccount);
  }

  const builder = new FeatureTestBuilder({ autoPopulate: false })
    .withChain(polkadotChain)
    .withStoreValue(walletModel.__test.$rawWallets, wallets)
    .withStoreValue(accounts.__test.$list, accountsList)
    .withStoreValue(multisigOperation.__test.$cachedOperations, cachedOperations);

  if (withRotatedProxyLink) {
    builder.withStoreValue(walletProxiesModel.$walletProxies, {
      [polkadotChainId]: { proxies: [rotatedProxyLink], deposit: null },
    });
  }

  return builder.build();
};

/** Opens the wallet-details proxies view for the flexible wallet. */
const openProxiesForFlexibleWallet = async (env: FeatureTestEnvironment) => {
  const joinedWallet = env.getState(walletModel.$wallets).find((wallet) => wallet.id === flexibleWalletId);
  expect(joinedWallet).toBeDefined();

  await allSettled(walletProxiesModel.flow.open, { scope: env.scope, params: { wallet: joinedWallet! } });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Flexible multisig rotation — cross-session visibility', () => {
  let env: FeatureTestEnvironment;

  beforeEach(() => {
    seedAccountHandlers();
  });

  afterEach(async () => {
    if (env) {
      await env.cleanup();
    }
    resetAccountHandlers();
  });

  describe('Persistence across sessions', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Flexible Multisig',
        feature: 'Controller Rotation',
        story: 'Cached operation survives a session restart',
      });
    });

    it('should surface the pending rotation from the cached branch of $allOperations', async () => {
      const rotationOperation = buildRotationOperation();

      env = await buildEnv({ cachedOperations: [rotationOperation] });

      // Fresh session: no live fetch has happened, so the list is served from cache.
      expect(env.getState(multisigOperation.$expectedChainIds)).toEqual([]);
      expect(env.getState(multisigOperation.$fetchedChainIds)).toEqual([]);

      const operations = env.getState(multisigOperation.$list);
      expect(operations).toHaveLength(1);

      const [persisted] = operations;
      expect(persisted!.id).toBe(rotationOperation.id);
      expect(persisted!.status).toBe('pending');

      // The persisted call data is still recognized as an edit-controller op.
      const editInfo = parseProxyEditOperation(persisted!);
      expect(editInfo).not.toBeNull();
      expect(editInfo!.isTrustedFlow).toBe(false);
      expect(editInfo!.proxyType).toBe('Any');
    });
  });

  describe('Old-controller visibility', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Flexible Multisig',
        feature: 'Controller Rotation',
        story: 'Rotation is listed for the old controller memberships',
      });
    });

    it('should list the rotation with the old controller multisig wallet selected', async () => {
      const rotationOperation = buildRotationOperation();

      env = await buildEnv({ cachedOperations: [rotationOperation] });

      // The op lives on the OLD controller multisig account.
      await allSettled(walletSelect.select, { scope: env.scope, params: multisigWallet.id });
      expect(env.getState(selectedWalletMultisigOperations.$list).map((operation) => operation.id)).toEqual([
        rotationOperation.id,
      ]);

      // The flexible wallet (whose controller is the old multisig, routed through
      // the pure proxy) sees the same operation.
      await allSettled(walletSelect.select, { scope: env.scope, params: flexibleWalletId });
      expect(env.getState(selectedWalletMultisigOperations.$list).map((operation) => operation.id)).toEqual([
        rotationOperation.id,
      ]);

      // A non-multisig wallet sees nothing.
      await allSettled(walletSelect.select, { scope: env.scope, params: vaultWallet.id });
      expect(env.getState(selectedWalletMultisigOperations.$list)).toEqual([]);
    });
  });

  describe('New-controller recognition', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Flexible Multisig',
        feature: 'Controller Rotation',
        story: 'Both rotation endpoints are recoverable from the persisted call data',
      });
    });

    it('should recover the old controller from the marker and the new controller from addProxy', async () => {
      const rotationOperation = buildRotationOperation();

      env = await buildEnv({ cachedOperations: [rotationOperation] });

      const [persisted] = env.getState(multisigOperation.$list);
      expect(persisted).toBeDefined();

      // Full parse: addProxy carries the NEW controller, the marker carries the OLD one.
      const editInfo = parseProxyEditOperation(persisted!);
      expect(editInfo).toEqual({
        newControllerAccountId,
        oldControllerAccountId,
        proxyType: 'Any',
        isTrustedFlow: false,
      });

      // Direct marker decode from the remark buried in the persisted call data —
      // the payload the NEW controller's membership uses to find the old link.
      // `args` is Record<string, any>, so the navigation needs no casts.
      const editBatch: DecodedTransaction = persisted!.transaction!.args['transaction'];
      const innerCalls: DecodedTransaction[] = editBatch.args['transactions'];
      const markerPayload = parseEditControllerMarker(innerCalls.at(1)!.args['remark']);
      expect(markerPayload).toEqual({
        kind: EDIT_FLEXIBLE_CONTROLLER_REMARK_KIND,
        oldControllerAccountId,
      });

      // And the addProxy half names the new controller.
      expect(innerCalls.at(0)!.args['delegate']).toBe(newControllerAccountId);
    });
  });

  describe('Verification status of the rotated link', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Flexible Multisig',
        feature: 'Controller Rotation',
        story: 'Proxy verification status after rotation',
      });
    });

    it('should report not_verified for a fresh ANY link to a known wallet without a verify ping', async () => {
      env = await buildEnv({ withNewControllerWallet: true, withRotatedProxyLink: true });
      await openProxiesForFlexibleWallet(env);

      const proxies = env.getState(proxiesModel.$proxies);
      expect(proxies).toHaveLength(1);

      const [link] = proxies;
      expect(link!.proxyAccountId).toBe(newControllerAccountId);
      expect(link!.proxyMultisigAccountId).toBe(newControllerAccountId);
      expect(link!.status).toBe('not_verified');
      // ANY + delay 0 + local wallet → the Verify action is offered.
      expect(link!.verifiable).toBe(true);
      expect(link!.pendingVerificationOperation).toBeNull();
    });

    it('should report not_verified_no_wallet when the new controller has no local wallet', async () => {
      env = await buildEnv({ withNewControllerWallet: false, withRotatedProxyLink: true });
      await openProxiesForFlexibleWallet(env);

      const proxies = env.getState(proxiesModel.$proxies);
      expect(proxies).toHaveLength(1);
      expect(proxies[0]!.status).toBe('not_verified_no_wallet');
      expect(proxies[0]!.verifiable).toBe(false);
    });

    it('should flip to pending_verification only for a real verify-proxy ping', async () => {
      const verifyPingOperation = buildVerifyPingOperation();

      env = await buildEnv({
        withNewControllerWallet: true,
        withRotatedProxyLink: true,
        cachedOperations: [verifyPingOperation],
      });
      await openProxiesForFlexibleWallet(env);

      const proxies = env.getState(proxiesModel.$proxies);
      expect(proxies).toHaveLength(1);

      const [link] = proxies;
      expect(link!.status).toBe('pending_verification');
      expect(link!.pendingVerificationOperation?.operationId).toBe(verifyPingOperation.id);
    });

    it('should stay not_verified when the only pending op via the pair is not a verify ping', async () => {
      // Strict gate: an incidental pending proxy.proxy op (a transfer) through the
      // same (new controller, pure proxy) pair must NOT read as verification.
      env = await buildEnv({
        withNewControllerWallet: true,
        withRotatedProxyLink: true,
        cachedOperations: [buildIncidentalOperation()],
      });
      await openProxiesForFlexibleWallet(env);

      const proxies = env.getState(proxiesModel.$proxies);
      expect(proxies).toHaveLength(1);
      expect(proxies[0]!.status).toBe('not_verified');
      expect(proxies[0]!.pendingVerificationOperation).toBeNull();
    });
  });

  describe('Signing is not blocked by verification status', () => {
    beforeEach(async () => {
      await allureMetadata({
        epic: 'Flexible Multisig',
        feature: 'Controller Rotation',
        story: 'Unverified status is presentational only',
      });
    });

    it('should still yield actionable signatories for an operation on the unverified flexible multisig', async () => {
      const rotationOperation = buildRotationOperation();

      env = await buildEnv({
        withNewControllerWallet: true,
        withRotatedProxyLink: true,
        cachedOperations: [rotationOperation],
      });
      // The availability handler is consulted from a combine, so it must live in
      // the fork scope's registry too.
      await seedAccountHandlers(env.scope);
      await openProxiesForFlexibleWallet(env);

      // Precondition: the rotated link is unverified.
      expect(env.getState(proxiesModel.$proxies)[0]!.status).toBe('not_verified');

      // Approve flow for the pending operation on the flexible multisig.
      await allSettled(approveModel.flow.open, {
        scope: env.scope,
        params: { chain: polkadotChain, operation: rotationOperation, account: flexibleAccount },
      });

      // The signing gate never consumes the verification status: the old
      // controller's signatory is still actionable.
      const actionable = env.getState(approveModel.$unsignedAccounts);
      expect(actionable.map((account) => account.accountId)).toEqual([oldSignatoryAccountId]);
      // …and it was auto-picked as the initiator (single actionable signatory).
      expect(env.getState(approveModel.$initiator)?.accountId).toBe(oldSignatoryAccountId);
    });
  });
});
