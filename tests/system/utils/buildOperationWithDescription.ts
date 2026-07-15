import { Keyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';
import { createKeyMulti, cryptoWaitReady } from '@polkadot/util-crypto';

import { type IndexedDBData } from './interactWithDatabase';

/**
 * Builder for the "multisig operation (not a draft) with a backend description"
 * e2e scenario.
 *
 * A seeded operation carries its own pre-built `transaction`, so the app
 * renders its title without decoding — the harness can block every websocket
 * and the row still shows "Transfer". The **description** is address-book data:
 * the app fetches it from the backend keyed by the operation's id, so the test
 * mocks the operations endpoint to return a description for exactly this
 * operation's id (and mocks auth + contacts so the address book is connected
 * and healthy).
 *
 * Fully hermetic — no chain node needed.
 */

// Polkadot Asset Hub genesis (chainId). Present in both `chains` and `chains_dev`.
const ASSET_HUB_CHAIN_ID = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f';

const CRYPTO_TYPE_SR25519 = 0; // CryptoType.SR25519
const NATIVE_ASSET_ID = '0'; // DOT on Asset Hub (matches the decoder's nativeAssetId)

const DOT = 10n ** 10n; // 10 decimals
const TRANSFER_AMOUNT = (DOT / 4n).toString(); // 0.25 DOT

// Wallet ids (arbitrary, unique — distinct from the other builders).
const VAULT_WALLET_ID = 970;
const MULTISIG_WALLET_ID = 980;

// Deterministic synthetic time point.
const BLOCK_CREATED = 2_000_000;
const INDEX_CREATED = 7;
const TIMESTAMP_MS = 1_700_500_000_000;

const keyring = new Keyring({ type: 'sr25519' });

type Account = { seed: string; accountId: string };

const account = (seed: string): Account => {
  const pair = keyring.addFromUri(`//${seed}`);

  return { seed, accountId: u8aToHex(pair.publicKey) };
};

const sortIds = (ids: string[]) => Array.from(ids).sort((a, b) => a.localeCompare(b));

const multisigAccountId = (signatories: string[], threshold: number) =>
  u8aToHex(createKeyMulti(sortIds(signatories), threshold));

export type OperationWithDescriptionScenario = {
  backendUrl: string;
  /** Payload for the mocked `GET /auth/me`. */
  session: { accountId: string; permissions: string[] };
  /** Payload for the mocked `GET /contacts`. */
  contacts: { data: unknown[]; total: number };
  /** Payload for the mocked operations endpoints (`GET /operations`, `by-ids`). */
  operationDescriptions: { id: string; description: string; draftId: string | null }[];
  walletRows: IndexedDBData;
  accountRows: IndexedDBData;
  operationRecords: { database: string; table: string; key: string; value: unknown[] };
  expected: {
    title: string;
    description: string;
    submitter: string;
  };
};

export async function buildOperationWithDescription(backendUrl: string): Promise<OperationWithDescriptionScenario> {
  await cryptoWaitReady();

  const signatories = [account('e2e-opdesc-a'), account('e2e-opdesc-b'), account('e2e-opdesc-c')];
  const recipient = account('e2e-opdesc-recipient');
  const sessionAccount = signatories[0]!;

  const msigId = multisigAccountId(
    signatories.map((s) => s.accountId),
    2,
  );
  const multisigName = 'E2E Op Multisig';
  const description = 'Q2 grant disbursement to the tooling team';

  // Hand-built decoded transaction (what the row displays without decoding).
  const transaction = {
    chainId: ASSET_HUB_CHAIN_ID,
    accountId: msigId,
    type: 'transfer',
    section: 'balances',
    method: 'transferKeepAlive',
    args: { assetId: NATIVE_ASSET_ID, dest: { Id: recipient.accountId }, value: TRANSFER_AMOUNT },
  };

  // A synthetic-but-well-formed call hash; the id ties the operation to its
  // backend description (the app looks up descriptions by operation id).
  const callHash = `0x${'cd'.repeat(32)}`;
  const operationId = `${ASSET_HUB_CHAIN_ID}-${callHash}-${msigId}-${BLOCK_CREATED}-${INDEX_CREATED}`;

  const operation = {
    id: operationId,
    status: 'pending',
    transaction,
    method: transaction.method,
    section: transaction.section,
    callHash,
    callData: null,
    chainId: ASSET_HUB_CHAIN_ID,
    multisigAccountId: msigId,
    depositor: signatories[0]!.accountId,
    blockCreated: BLOCK_CREATED,
    indexCreated: INDEX_CREATED,
    timestamp: TIMESTAMP_MS,
    events: [
      {
        id: `${operationId}-${signatories[0]!.accountId}-approve`,
        accountId: signatories[0]!.accountId,
        status: 'approve',
        blockCreated: BLOCK_CREATED,
        indexCreated: INDEX_CREATED,
        timestamp: TIMESTAMP_MS,
      },
    ],
  };

  const walletRows: IndexedDBData = {
    database: 'spektr',
    table: 'wallets',
    injectingData: [
      { id: VAULT_WALLET_ID, name: 'E2E Op Signatories', signingType: 'signing_pv', type: 'wallet_pv' },
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

  const contact = (id: string, name: string, accountId: string, extra: Record<string, unknown> = {}) => ({
    id,
    name,
    accountId,
    ...extra,
  });

  const contacts = [
    contact('contact-op-msig', multisigName, msigId, {
      signatories: signatories.map((s) => s.accountId),
      threshold: 2,
    }),
    ...signatories.map((s, i) => contact(`contact-op-sig-${i}`, s.seed, s.accountId)),
  ];

  return {
    backendUrl,
    session: {
      accountId: sessionAccount.accountId,
      permissions: ['operation:read', 'operation:write', 'address-book:read'],
    },
    contacts: { data: contacts, total: contacts.length },
    operationDescriptions: [{ id: operationId, description, draftId: null }],
    walletRows,
    accountRows,
    operationRecords: {
      database: 'spektr-cache',
      table: 'effector',
      key: 'multisig-operations',
      value: [operation],
    },
    expected: {
      title: 'Transfer',
      description,
      submitter: multisigName,
    },
  };
}
