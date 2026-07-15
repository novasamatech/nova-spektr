import { ApiPromise, WsProvider } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { Keyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';
import { createKeyMulti, cryptoWaitReady } from '@polkadot/util-crypto';

import { type IndexedDBData } from './interactWithDatabase';

/**
 * Live-metadata operation builder for the Operations e2e test.
 *
 * Connects to a real Polkadot Asset Hub node, pulls its metadata, and builds a
 * genuine extrinsic (→ real `callData` / `callHash`) for every recognised
 * operation family — once for a regular multisig and once for a flexible
 * multisig (the core call wrapped in `proxy.proxy`). The decoded `transaction`
 * shown in the UI is hand-built from the same known args (the app never
 * re-decodes cached operations), which keeps this builder free of app runtime
 * imports and their Vite-only globals.
 *
 * Families whose pallet is absent from the live runtime, or whose args fail to
 * encode against it, are collected into `skipped` (never silently dropped).
 */

// Polkadot Asset Hub genesis (chainId). Present in both `chains` and `chains_dev`.
const ASSET_HUB_CHAIN_ID = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f';
const CHAINS_URL = `https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/chains/v2/${
  process.env.CHAINS_FILE || 'chains_dev'
}.json`;

// Polkadot relay genesis — used as the XCM destination so the row shows two chain chips.
const POLKADOT_RELAY_CHAIN_ID = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3';

const DOT = 10n ** 10n; // 10 decimals
const AMOUNT = (DOT / 10n).toString(); // 0.1 DOT
const CRYPTO_TYPE_SR25519 = 0; // CryptoType.SR25519
const NATIVE_ASSET_ID = '0'; // DOT on Asset Hub (matches the decoder's nativeAssetId)

// Wallet ids (arbitrary, unique).
const VAULT_WALLET_ID = 910;
const MULTISIG_WALLET_ID = 920;
const FLEXIBLE_WALLET_ID = 930;

export type OperationKind = 'regular' | 'flexible';

export type BuiltData = {
  walletRows: IndexedDBData;
  accountRows: IndexedDBData;
  operationRecords: { database: string; table: string; key: string; value: unknown[] };
  covered: { family: string; kind: OperationKind; title: string }[];
  skipped: { family: string; reason: string }[];
};

type Account = { seed: string; accountId: string };

const keyring = new Keyring({ type: 'sr25519' });

const account = (seed: string): Account => {
  const pair = keyring.addFromUri(`//${seed}`);
  return { seed, accountId: u8aToHex(pair.publicKey) };
};

const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

const sortIds = (ids: string[]) => Array.from(ids).sort((a, b) => a.localeCompare(b));

const multisigAccountId = (signatories: string[], threshold: number) =>
  u8aToHex(createKeyMulti(sortIds(signatories), threshold));

// ── decoded-transaction (display) shape ──────────────────────────────────────
// Mirrors `DecodedTransaction`: { chainId, accountId, type?, args, method, section }.
type Tx = {
  chainId: string;
  accountId: string;
  type?: string;
  section: string;
  method: string;
  args: Record<string, unknown>;
};

const tx = (accountId: string, section: string, method: string, type: string | undefined, args: Tx['args']): Tx => ({
  chainId: ASSET_HUB_CHAIN_ID,
  accountId,
  type,
  section,
  method,
  args,
});

// TransactionType string values (inlined to avoid importing the const enum).
const T = {
  TRANSFER: 'transfer',
  TRANSFER_ALL: 'transfer_all',
  XCM_LIMITED_TRANSFER: 'xcm_limited_reserve_transfer_assets',
  POLKADOT_XCM_LIMITED_TRANSFER: 'polkadotxcm_limited_reserve_transfer_assets',
  VESTED_TRANSFER: 'vestedTransfer',
  BOND: 'bond',
  STAKE_MORE: 'bondExtra',
  UNSTAKE: 'unbond',
  RESTAKE: 'rebond',
  REDEEM: 'withdrawUnbonded',
  NOMINATE: 'nominate',
  DESTINATION: 'payee',
  BATCH_ALL: 'batchAll',
  ADD_PROXY: 'add_proxy',
  REMOVE_PROXY: 'remove_proxy',
  PROXY: 'proxy',
  CREATE_PURE_PROXY: 'create_pure_proxy',
  KILL_PURE_PROXY: 'kill_pure_proxy',
  UNLOCK: 'unlock',
  VOTE: 'vote',
  REMOVE_VOTE: 'remove_vote',
  DELEGATE: 'delegate',
  UNDELEGATE: 'undelegate',
} as const;

type Ext = SubmittableExtrinsic<'promise'>;

// One family = an on-wire core call built from live metadata + the decoded tx we display.
type FamilySpec = {
  family: string;
  title: string;
  /**
   * Build the core extrinsic from the live api (throws if the pallet/args are
   * unsupported).
   */
  build: (api: ApiPromise, ctx: BuildCtx) => Ext | null;
  /** Hand-built decoded transaction for display (null → Unknown Operation). */
  transaction: (ctx: BuildCtx) => Tx | null;
};

type BuildCtx = {
  msigId: string; // signing context account
  recipient: string;
  delegateNew: string;
  delegateOld: string;
};

const dest = (accountId: string) => ({ Id: accountId });

const FAMILIES: FamilySpec[] = [
  {
    family: 'transfer',
    title: 'Transfer',
    build: (api, c) => api.tx.balances.transferKeepAlive(dest(c.recipient), AMOUNT),
    transaction: (c) =>
      // `assetId: NATIVE_ASSET_ID` mirrors what the app decoder emits and lets
      // `useTransactionAsset` resolve DOT so the friendly "Transfer" title renders.
      tx(c.msigId, 'balances', 'transferKeepAlive', T.TRANSFER, {
        assetId: NATIVE_ASSET_ID,
        dest: dest(c.recipient),
        value: AMOUNT,
      }),
  },
  {
    family: 'transferAll',
    title: 'Transfer All',
    build: (api, c) => api.tx.balances.transferAll(dest(c.recipient), false),
    transaction: (c) =>
      tx(c.msigId, 'balances', 'transferAll', T.TRANSFER_ALL, {
        assetId: NATIVE_ASSET_ID,
        dest: dest(c.recipient),
        keepAlive: false,
      }),
  },
  {
    family: 'xcm',
    title: 'Cross-chain transfer',
    build: (api, c) => {
      // `polkadotXcm` and its methods are typed optional in the augmented api;
      // the loose cast keeps TS happy and any real absence is caught → skipped.
      const xcm = api.tx.polkadotXcm as unknown as Record<string, (...args: unknown[]) => Ext> | undefined;
      if (!xcm?.limitedReserveTransferAssets) throw new Error('polkadotXcm.limitedReserveTransferAssets is absent');

      const beneficiary = {
        V4: { parents: 0, interior: { X1: [{ AccountId32: { network: null, id: c.recipient } }] } },
      };
      const destination = { V4: { parents: 1, interior: 'Here' } };
      const assets = {
        V4: [{ id: { parents: 1, interior: 'Here' }, fun: { Fungible: AMOUNT } }],
      };
      return xcm.limitedReserveTransferAssets(destination, beneficiary, assets, 0, 'Unlimited');
    },
    transaction: (c) =>
      tx(c.msigId, 'polkadotXcm', 'limitedReserveTransferAssets', T.POLKADOT_XCM_LIMITED_TRANSFER, {
        assetId: NATIVE_ASSET_ID,
        value: AMOUNT,
        dest: dest(c.recipient),
        destinationChain: POLKADOT_RELAY_CHAIN_ID,
      }),
  },
  {
    family: 'multiTransfer',
    title: 'Multi Transfer',
    build: (api, c) =>
      api.tx.utility.batchAll([
        api.tx.balances.transferKeepAlive(dest(c.recipient), AMOUNT),
        api.tx.balances.transferKeepAlive(dest(c.recipient), AMOUNT),
      ]),
    transaction: (c) =>
      tx(c.msigId, 'utility', 'batchAll', T.BATCH_ALL, {
        transactions: [
          tx(c.msigId, 'balances', 'transferKeepAlive', T.TRANSFER, { dest: dest(c.recipient), value: AMOUNT }),
          tx(c.msigId, 'balances', 'transferKeepAlive', T.TRANSFER, { dest: dest(c.recipient), value: AMOUNT }),
        ],
      }),
  },
  {
    family: 'vestedTransfer',
    title: 'Vested transfer',
    build: (api, c) =>
      api.tx.vesting.vestedTransfer(dest(c.recipient), {
        locked: AMOUNT,
        perBlock: '1000000',
        startingBlock: 0,
      }),
    transaction: (c) =>
      tx(c.msigId, 'vesting', 'vestedTransfer', T.VESTED_TRANSFER, {
        dest: dest(c.recipient),
        value: AMOUNT,
        schedule: { locked: AMOUNT, perBlock: '1000000', startingBlock: 0 },
      }),
  },
  {
    family: 'bond',
    title: 'Start Staking',
    build: (api) => api.tx.staking.bond(AMOUNT, 'Staked'),
    transaction: (c) => tx(c.msigId, 'staking', 'bond', T.BOND, { value: AMOUNT, payee: 'Staked' }),
  },
  {
    family: 'nominate',
    title: 'Change Validators',
    build: (api, c) => api.tx.staking.nominate([dest(c.recipient)]),
    transaction: (c) => tx(c.msigId, 'staking', 'nominate', T.NOMINATE, { targets: [dest(c.recipient)] }),
  },
  {
    family: 'bondExtra',
    title: 'Stake More',
    build: (api) => api.tx.staking.bondExtra(AMOUNT),
    transaction: (c) => tx(c.msigId, 'staking', 'bondExtra', T.STAKE_MORE, { maxAdditional: AMOUNT }),
  },
  {
    family: 'unbond',
    title: 'Unstake',
    build: (api) => api.tx.staking.unbond(AMOUNT),
    transaction: (c) => tx(c.msigId, 'staking', 'unbond', T.UNSTAKE, { value: AMOUNT }),
  },
  {
    family: 'rebond',
    title: 'Restake',
    build: (api) => api.tx.staking.rebond(AMOUNT),
    transaction: (c) => tx(c.msigId, 'staking', 'rebond', T.RESTAKE, { value: AMOUNT }),
  },
  {
    family: 'withdrawUnbonded',
    title: 'Withdraw Unstaked',
    build: (api) => api.tx.staking.withdrawUnbonded(0),
    transaction: (c) => tx(c.msigId, 'staking', 'withdrawUnbonded', T.REDEEM, { numSlashingSpans: 0 }),
  },
  {
    family: 'setPayee',
    title: 'Set reward destination',
    build: (api) => api.tx.staking.setPayee('Staked'),
    transaction: (c) => tx(c.msigId, 'staking', 'setPayee', T.DESTINATION, { payee: 'Staked' }),
  },
  {
    family: 'vote',
    title: 'Vote',
    build: (api) =>
      api.tx.convictionVoting.vote(0, { Standard: { vote: { aye: true, conviction: 'Locked1x' }, balance: AMOUNT } }),
    transaction: (c) =>
      tx(c.msigId, 'convictionVoting', 'vote', T.VOTE, {
        poll: 0,
        vote: { Standard: { vote: { aye: true, conviction: 'Locked1x' }, balance: AMOUNT } },
      }),
  },
  {
    family: 'removeVote',
    title: 'Remove vote',
    build: (api) => api.tx.convictionVoting.removeVote(null, 0),
    transaction: (c) => tx(c.msigId, 'convictionVoting', 'removeVote', T.REMOVE_VOTE, { track: null, index: 0 }),
  },
  {
    family: 'unlock',
    title: 'Unlock',
    build: (api, c) => api.tx.convictionVoting.unlock(0, dest(c.msigId)),
    transaction: (c) =>
      tx(c.msigId, 'convictionVoting', 'unlock', T.UNLOCK, { class: 0, target: dest(c.msigId), value: AMOUNT }),
  },
  {
    family: 'delegate',
    title: 'Delegate',
    build: (api, c) => api.tx.convictionVoting.delegate(0, dest(c.delegateNew), 'Locked1x', AMOUNT),
    transaction: (c) =>
      tx(c.msigId, 'convictionVoting', 'delegate', T.DELEGATE, {
        class: 0,
        to: dest(c.delegateNew),
        conviction: 'Locked1x',
        balance: AMOUNT,
      }),
  },
  {
    family: 'undelegate',
    title: 'Revoke delegation',
    build: (api) => api.tx.convictionVoting.undelegate(0),
    transaction: (c) => tx(c.msigId, 'convictionVoting', 'undelegate', T.UNDELEGATE, { class: 0 }),
  },
  {
    family: 'addProxy',
    title: 'Add delegated authority (proxy)',
    build: (api, c) => api.tx.proxy.addProxy(dest(c.delegateNew), 'Any', 0),
    transaction: (c) =>
      tx(c.msigId, 'proxy', 'addProxy', T.ADD_PROXY, { delegate: dest(c.delegateNew), proxyType: 'Any', delay: 0 }),
  },
  {
    family: 'createPureProxy',
    title: 'Create pure proxy',
    build: (api) => api.tx.proxy.createPure('Any', 0, 0),
    transaction: (c) =>
      tx(c.msigId, 'proxy', 'createPure', T.CREATE_PURE_PROXY, { proxyType: 'Any', delay: 0, index: 0 }),
  },
  {
    family: 'removeProxy',
    title: 'Revoke delegated authority (proxy)',
    build: (api, c) => api.tx.proxy.removeProxy(dest(c.delegateNew), 'Any', 0),
    transaction: (c) =>
      tx(c.msigId, 'proxy', 'removeProxy', T.REMOVE_PROXY, {
        delegate: dest(c.delegateNew),
        proxyType: 'Any',
        delay: 0,
      }),
  },
  {
    family: 'killPureProxy',
    title: 'Revoke delegated authority (pure proxy)',
    build: (api, c) => api.tx.proxy.killPure(dest(c.msigId), 'Any', 0, 0, 0),
    transaction: (c) =>
      tx(c.msigId, 'proxy', 'killPure', T.KILL_PURE_PROXY, {
        spawner: dest(c.msigId),
        proxyType: 'Any',
        index: 0,
        height: 0,
        extIndex: 0,
      }),
  },
  {
    family: 'genericBatch',
    title: 'Utility: Batch all',
    build: (api) => api.tx.utility.batchAll([api.tx.system.remark('0x01'), api.tx.system.remark('0x02')]),
    transaction: (c) =>
      tx(c.msigId, 'utility', 'batchAll', T.BATCH_ALL, {
        transactions: [
          tx(c.msigId, 'system', 'remark', undefined, { remark: '0x01' }),
          tx(c.msigId, 'system', 'remark', undefined, { remark: '0x02' }),
        ],
      }),
  },
  {
    family: 'remark',
    title: 'System: Remark',
    build: (api) => api.tx.system.remark('0xdeadbeef'),
    transaction: (c) => tx(c.msigId, 'system', 'remark', undefined, { remark: '0xdeadbeef' }),
  },
];

async function connectAssetHub(): Promise<{ api: ApiPromise; nodeUrl: string }> {
  const res = await fetch(CHAINS_URL);
  const chains: { chainId: string; nodes: { url: string }[] }[] = await res.json();
  const chain = chains.find((c) => c.chainId === ASSET_HUB_CHAIN_ID);
  if (!chain?.nodes?.length) {
    throw new Error(`Polkadot Asset Hub (${ASSET_HUB_CHAIN_ID}) not found in ${CHAINS_URL}`);
  }
  const nodeUrl = chain.nodes[0]!.url;
  const api = await ApiPromise.create({ provider: new WsProvider(nodeUrl), noInitWarn: true });
  return { api, nodeUrl };
}

const callHex = (ext: Ext) => ext.method.toHex();
const callHash = (ext: Ext) => ext.method.hash.toHex();

let opCounter = 0;

// Deterministic bases for synthetic time points (block height + ms timestamp).
const BLOCK_BASE = 1_000_000;
const TIMESTAMP_BASE_MS = 1_700_000_000_000;

function assembleOperation(params: {
  multisigAccountId: string;
  proxiedAccountId?: string;
  depositor: string;
  callData: string | null;
  hash: string;
  transaction: Tx | null;
}) {
  const { proxiedAccountId, depositor, callData, hash, transaction } = params;
  const block = BLOCK_BASE + opCounter;
  const index = opCounter;
  opCounter += 1;
  const timestamp = TIMESTAMP_BASE_MS + opCounter * 1000;
  const id = `${ASSET_HUB_CHAIN_ID}-${hash}-${params.multisigAccountId}-${block}-${index}`;

  return {
    id,
    status: 'pending',
    transaction,
    method: transaction?.method ?? null,
    section: transaction?.section ?? null,
    callHash: hash,
    callData,
    chainId: ASSET_HUB_CHAIN_ID,
    multisigAccountId: params.multisigAccountId,
    ...(proxiedAccountId ? { proxiedAccountId } : {}),
    depositor,
    blockCreated: block,
    indexCreated: index,
    timestamp,
    events: [
      {
        id: `${id}-${depositor}-approve`,
        accountId: depositor,
        status: 'approve',
        blockCreated: block,
        indexCreated: index,
        timestamp,
      },
    ],
  };
}

export async function buildMultisigOperations(): Promise<BuiltData> {
  await cryptoWaitReady();
  const { api } = await connectAssetHub();

  try {
    // ── Deterministic accounts ────────────────────────────────────────────────
    const regularSigs = [account('e2e-msig-a'), account('e2e-msig-b'), account('e2e-msig-c')];
    const flexSigs = [account('e2e-flex-d'), account('e2e-flex-e'), account('e2e-flex-f')];
    const recipient = account('e2e-recipient');
    const delegateNew = account('e2e-new-controller');
    const delegateOld = account('e2e-old-controller');
    const proxiedFacade = account('e2e-pure-proxy');

    const regularMsigId = multisigAccountId(
      regularSigs.map((s) => s.accountId),
      2,
    );
    const flexMsigId = multisigAccountId(
      flexSigs.map((s) => s.accountId),
      2,
    );

    const regularCtx: BuildCtx = {
      msigId: regularMsigId,
      recipient: recipient.accountId,
      delegateNew: delegateNew.accountId,
      delegateOld: delegateOld.accountId,
    };
    const flexCtx: BuildCtx = { ...regularCtx, msigId: flexMsigId };

    const operations: ReturnType<typeof assembleOperation>[] = [];
    const covered: BuiltData['covered'] = [];
    const skipped: BuiltData['skipped'] = [];

    for (const spec of FAMILIES) {
      // Regular multisig variant.
      try {
        const coreExt = spec.build(api, regularCtx);
        const transaction = spec.transaction(regularCtx);
        operations.push(
          assembleOperation({
            multisigAccountId: regularMsigId,
            depositor: regularSigs[0]!.accountId,
            callData: coreExt ? callHex(coreExt) : null,
            hash: coreExt
              ? callHash(coreExt)
              : `0x${'00'.repeat(31)}${(opCounter % 256).toString(16).padStart(2, '0')}`,
            transaction,
          }),
        );
        covered.push({ family: spec.family, kind: 'regular', title: spec.title });
      } catch (e) {
        skipped.push({ family: `${spec.family} (regular)`, reason: errorMessage(e) });
      }

      // Flexible multisig variant — wrap the core call in proxy.proxy(real, …).
      try {
        const coreExt = spec.build(api, flexCtx);
        const transaction = spec.transaction(flexCtx);
        let callData: string | null = null;
        let hash: string;
        if (coreExt) {
          const wrapped = api.tx.proxy.proxy(dest(proxiedFacade.accountId), null, coreExt);
          callData = callHex(wrapped);
          hash = callHash(wrapped);
        } else {
          hash = `0x${'11'.repeat(31)}${(opCounter % 256).toString(16).padStart(2, '0')}`;
        }
        operations.push(
          assembleOperation({
            multisigAccountId: flexMsigId,
            proxiedAccountId: proxiedFacade.accountId,
            depositor: flexSigs[0]!.accountId,
            callData,
            hash,
            transaction,
          }),
        );
        covered.push({ family: spec.family, kind: 'flexible', title: spec.title });
      } catch (e) {
        skipped.push({ family: `${spec.family} (flexible)`, reason: errorMessage(e) });
      }
    }

    // Inner add/remove-proxy display args use bare address strings for `delegate`
    // (that's what the app decoder emits via `.toString()`), which the
    // edit-flexible / verify-proxy detectors require.
    const addProxyTx = tx(flexMsigId, 'proxy', 'addProxy', T.ADD_PROXY, {
      delegate: delegateNew.accountId,
      proxyType: 'Any',
      delay: 0,
    });

    // ── Edit flexible multisig — Atomic swap (add + remove in one batch) ───────
    try {
      const batch = api.tx.utility.batchAll([
        api.tx.proxy.addProxy(dest(delegateNew.accountId), 'Any', 0),
        api.tx.proxy.removeProxy(dest(delegateOld.accountId), 'Any', 0),
      ]);
      const wrapped = api.tx.proxy.proxy(dest(proxiedFacade.accountId), null, batch);
      const atomicEditTx: Tx = tx(flexMsigId, 'utility', 'batchAll', T.BATCH_ALL, {
        transactions: [
          addProxyTx,
          tx(flexMsigId, 'proxy', 'removeProxy', T.REMOVE_PROXY, {
            delegate: delegateOld.accountId,
            proxyType: 'Any',
            delay: 0,
          }),
        ],
      });
      operations.push(
        assembleOperation({
          multisigAccountId: flexMsigId,
          proxiedAccountId: proxiedFacade.accountId,
          depositor: flexSigs[0]!.accountId,
          callData: callHex(wrapped),
          hash: callHash(wrapped),
          transaction: atomicEditTx,
        }),
      );
      covered.push({ family: 'editFlexibleAtomic', kind: 'flexible', title: 'Edit flexible multisig' });
    } catch (e) {
      skipped.push({ family: 'editFlexibleAtomic (flexible)', reason: errorMessage(e) });
    }

    // ── Edit flexible multisig — Verified swap (add-only batch + marker remark) ─
    // The old controller is recovered from an `edit-flexible-controller` JSON marker
    // remark instead of a `removeProxy`, which flips the card to "Verified swap".
    try {
      const editMarker = JSON.stringify({
        kind: 'edit-flexible-controller',
        oldControllerAccountId: delegateOld.accountId,
      });
      const batch = api.tx.utility.batchAll([
        api.tx.proxy.addProxy(dest(delegateNew.accountId), 'Any', 0),
        api.tx.system.remark(editMarker),
      ]);
      const wrapped = api.tx.proxy.proxy(dest(proxiedFacade.accountId), null, batch);
      const verifiedEditTx: Tx = tx(flexMsigId, 'utility', 'batchAll', T.BATCH_ALL, {
        transactions: [addProxyTx, tx(flexMsigId, 'system', 'remark', undefined, { remark: editMarker })],
      });
      operations.push(
        assembleOperation({
          multisigAccountId: flexMsigId,
          proxiedAccountId: proxiedFacade.accountId,
          depositor: flexSigs[0]!.accountId,
          callData: callHex(wrapped),
          hash: callHash(wrapped),
          transaction: verifiedEditTx,
        }),
      );
      covered.push({ family: 'editFlexibleVerified', kind: 'flexible', title: 'Edit flexible multisig' });
    } catch (e) {
      skipped.push({ family: 'editFlexibleVerified (flexible)', reason: errorMessage(e) });
    }

    // ── Verify proxy — the verification ping from the verified-swap flow ────────
    // `proxy.proxy(pure, system.remarkWithEvent(<verify-proxy marker>))`. The
    // detector needs the `proxy.proxy` wrapper in `transaction`, so unlike the
    // other flexible ops we keep the wrapper here rather than the unwrapped core.
    try {
      const verifyMarker = JSON.stringify({
        kind: 'verify-proxy',
        delegateAccountId: delegateNew.accountId,
        pureProxyAccountId: proxiedFacade.accountId,
      });
      const ping = api.tx.proxy.proxy(dest(proxiedFacade.accountId), null, api.tx.system.remarkWithEvent(verifyMarker));
      const verifyTx: Tx = tx(flexMsigId, 'proxy', 'proxy', T.PROXY, {
        real: proxiedFacade.accountId,
        transaction: tx(flexMsigId, 'system', 'remarkWithEvent', undefined, { remark: verifyMarker }),
      });
      operations.push(
        assembleOperation({
          multisigAccountId: flexMsigId,
          proxiedAccountId: proxiedFacade.accountId,
          depositor: flexSigs[0]!.accountId,
          callData: callHex(ping),
          hash: callHash(ping),
          transaction: verifyTx,
        }),
      );
      covered.push({ family: 'verifyProxy', kind: 'flexible', title: 'Verification for wallet' });
    } catch (e) {
      skipped.push({ family: 'verifyProxy (flexible)', reason: errorMessage(e) });
    }

    // ── A single undecoded operation (no call data → "Unknown Operation") ───────
    operations.push(
      assembleOperation({
        multisigAccountId: regularMsigId,
        depositor: regularSigs[0]!.accountId,
        callData: null,
        hash: `0x${'ee'.repeat(32)}`,
        transaction: null,
      }),
    );
    covered.push({ family: 'unknown', kind: 'regular', title: 'Unknown Operation' });

    // ── DB rows (wallets + accounts) ───────────────────────────────────────────
    const regularMultisigName = 'E2E Multisig';
    const flexibleMultisigName = 'E2E Flexible Multisig';

    const walletRows: IndexedDBData = {
      database: 'spektr',
      table: 'wallets',
      injectingData: [
        { id: VAULT_WALLET_ID, name: 'E2E Signatories', signingType: 'signing_pv', type: 'wallet_pv' },
        { id: MULTISIG_WALLET_ID, name: regularMultisigName, signingType: 'signing_ms', type: 'wallet_ms' },
        { id: FLEXIBLE_WALLET_ID, name: flexibleMultisigName, signingType: 'signing_ms', type: 'wallet_fxms' },
      ],
    };

    const signatoryRow = (acc: Account, walletId: number) => ({
      id: `${walletId} ${acc.accountId} universal`,
      accountId: acc.accountId,
      walletId,
      name: acc.seed,
      type: 'universal',
      accountType: 'base',
      signingType: 'signing_pv',
      cryptoType: CRYPTO_TYPE_SR25519,
    });

    const multisigRow = {
      id: `${MULTISIG_WALLET_ID} ${regularMsigId} universal`,
      accountId: regularMsigId,
      walletId: MULTISIG_WALLET_ID,
      name: regularMultisigName,
      type: 'universal',
      accountType: 'multisig',
      signingType: 'signing_ms',
      cryptoType: CRYPTO_TYPE_SR25519,
      threshold: 2,
      signatories: regularSigs.map((s) => ({ accountId: s.accountId, name: s.seed })),
    };

    const flexibleRow = {
      id: `${FLEXIBLE_WALLET_ID} ${proxiedFacade.accountId} ${ASSET_HUB_CHAIN_ID}`,
      accountId: proxiedFacade.accountId,
      walletId: FLEXIBLE_WALLET_ID,
      name: flexibleMultisigName,
      type: 'chain',
      chainId: ASSET_HUB_CHAIN_ID,
      accountType: 'flex_multisig',
      signingType: 'signing_ms',
      cryptoType: CRYPTO_TYPE_SR25519,
      multisigAccountId: flexMsigId,
      threshold: 2,
      signatories: flexSigs.map((s) => ({ accountId: s.accountId, name: s.seed })),
      proxyType: 'Any',
      deposit: '0',
      entropyBlockNumber: 0,
      extrinsicIndex: 0,
    };

    const accountRows: IndexedDBData = {
      database: 'spektr',
      table: 'accounts2',
      injectingData: [...regularSigs.map((s) => signatoryRow(s, VAULT_WALLET_ID)), multisigRow, flexibleRow],
    };

    return {
      walletRows,
      accountRows,
      operationRecords: {
        database: 'spektr-cache',
        table: 'effector',
        key: 'multisig-operations',
        value: operations,
      },
      covered,
      skipped,
    };
  } finally {
    await api.disconnect();
  }
}
