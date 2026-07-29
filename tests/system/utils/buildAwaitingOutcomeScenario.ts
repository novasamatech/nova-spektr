import { Keyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';
import { createKeyMulti, cryptoWaitReady } from '@polkadot/util-crypto';

import { type IndexedDBData } from './interactWithDatabase';

/**
 * Builder for the "operation awaiting its final status" e2e scenario.
 *
 * Seeds two cached pending operations for one multisig:
 *
 * - A regular pending operation (1 of 2 signed) — the baseline row.
 * - An operation that left on-chain storage while no terminal event was caught
 *   (`awaitingOutcome: true`, 2 of 2 signed) — it must stay in the pending list
 *   with an "Updating status" loader instead of the signing actions.
 *
 * Fully hermetic — no chain node needed: every operation carries a pre-built
 * `transaction`, so rows render titles with all websockets blocked.
 */

// Polkadot Asset Hub genesis (chainId). Present in both `chains` and `chains_dev`.
const ASSET_HUB_CHAIN_ID = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f';

const CRYPTO_TYPE_SR25519 = 0; // CryptoType.SR25519
const NATIVE_ASSET_ID = '0'; // DOT on Asset Hub (matches the decoder's nativeAssetId)

const DOT = 10n ** 10n; // 10 decimals

// Wallet ids (arbitrary, unique — distinct from the other builders).
const VAULT_WALLET_ID = 985;
const MULTISIG_WALLET_ID = 990;

// Deterministic synthetic time points.
const BLOCK_CREATED = 3_000_000;
const TIMESTAMP_MS = 1_701_000_000_000;

const keyring = new Keyring({ type: 'sr25519' });

type Account = { seed: string; accountId: string };

const account = (seed: string): Account => {
  const pair = keyring.addFromUri(`//${seed}`);

  return { seed, accountId: u8aToHex(pair.publicKey) };
};

const sortIds = (ids: string[]) => Array.from(ids).sort((a, b) => a.localeCompare(b));

const multisigAccountId = (signatories: string[], threshold: number) =>
  u8aToHex(createKeyMulti(sortIds(signatories), threshold));

export type AwaitingOutcomeScenario = {
  walletRows: IndexedDBData;
  accountRows: IndexedDBData;
  operationRecords: { database: string; table: string; key: string; value: unknown[] };
  pendingOperationId: string;
  awaitingOperationId: string;
};

export async function buildAwaitingOutcomeScenario(): Promise<AwaitingOutcomeScenario> {
  await cryptoWaitReady();

  const signatories = [account('e2e-await-a'), account('e2e-await-b'), account('e2e-await-c')];
  const recipient = account('e2e-await-recipient');

  const msigId = multisigAccountId(
    signatories.map((s) => s.accountId),
    2,
  );
  const multisigName = 'E2E Awaiting Multisig';

  const makeTransfer = (value: bigint) => ({
    chainId: ASSET_HUB_CHAIN_ID,
    accountId: msigId,
    type: 'transfer',
    section: 'balances',
    method: 'transferKeepAlive',
    args: { assetId: NATIVE_ASSET_ID, dest: { Id: recipient.accountId }, value: value.toString() },
  });

  const approval = (operationId: string, approver: Account, index: number) => ({
    id: `${operationId}-${approver.accountId}-approve`,
    accountId: approver.accountId,
    status: 'approve',
    blockCreated: BLOCK_CREATED,
    indexCreated: index,
    timestamp: TIMESTAMP_MS + index * 60_000,
  });

  const makeOperation = (params: { hashByte: string; index: number; value: bigint }) => {
    const callHash = `0x${params.hashByte.repeat(32)}`;
    const id = `${ASSET_HUB_CHAIN_ID}-${callHash}-${msigId}-${BLOCK_CREATED}-${params.index}`;

    return {
      id,
      status: 'pending',
      transaction: makeTransfer(params.value),
      method: 'transferKeepAlive',
      section: 'balances',
      callHash,
      callData: null,
      chainId: ASSET_HUB_CHAIN_ID,
      multisigAccountId: msigId,
      depositor: signatories[0]!.accountId,
      blockCreated: BLOCK_CREATED,
      indexCreated: params.index,
      timestamp: TIMESTAMP_MS + params.index * 1000,
      events: [approval(id, signatories[0]!, 0)],
    };
  };

  // Baseline: a signable pending operation, 1 of 2 signed.
  const pendingOperation = makeOperation({ hashByte: 'aa', index: 1, value: DOT * 125n });

  // Awaiting outcome: threshold reached, removed from chain storage without a
  // caught terminal event — pending + awaitingOutcome until the indexer reports.
  const awaitingBase = makeOperation({ hashByte: 'bb', index: 2, value: DOT * 50n });
  const awaitingOperation = {
    ...awaitingBase,
    events: [...awaitingBase.events, approval(awaitingBase.id, signatories[1]!, 1)],
    awaitingOutcome: true,
  };

  const walletRows: IndexedDBData = {
    database: 'spektr',
    table: 'wallets',
    injectingData: [
      { id: VAULT_WALLET_ID, name: 'E2E Awaiting Signatories', signingType: 'signing_pv', type: 'wallet_pv' },
      { id: MULTISIG_WALLET_ID, name: multisigName, signingType: 'signing_ms', type: 'wallet_ms' },
    ],
  };

  const signatoryRow = (acc: Account) => ({
    id: `${VAULT_WALLET_ID} ${acc.accountId} universal`,
    accountId: acc.accountId,
    walletId: VAULT_WALLET_ID,
    name: acc.seed,
    type: 'universal',
    accountType: 'base',
    signingType: 'signing_pv',
    cryptoType: CRYPTO_TYPE_SR25519,
  });

  const multisigRow = {
    id: `${MULTISIG_WALLET_ID} ${msigId} universal`,
    accountId: msigId,
    walletId: MULTISIG_WALLET_ID,
    name: multisigName,
    type: 'universal',
    accountType: 'multisig',
    signingType: 'signing_ms',
    cryptoType: CRYPTO_TYPE_SR25519,
    threshold: 2,
    signatories: signatories.map((s) => ({ accountId: s.accountId, name: s.seed })),
  };

  const accountRows: IndexedDBData = {
    database: 'spektr',
    table: 'accounts2',
    injectingData: [...signatories.map(signatoryRow), multisigRow],
  };

  return {
    walletRows,
    accountRows,
    operationRecords: {
      database: 'spektr-cache',
      table: 'effector',
      key: 'multisig-operations',
      value: [pendingOperation, awaitingOperation],
    },
    pendingOperationId: pendingOperation.id,
    awaitingOperationId: awaitingOperation.id,
  };
}
