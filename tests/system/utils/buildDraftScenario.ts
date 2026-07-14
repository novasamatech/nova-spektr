import { Keyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';
import { createKeyMulti, cryptoWaitReady } from '@polkadot/util-crypto';

import { type IndexedDBData } from './interactWithDatabase';

/**
 * Builder for the Operations "Drafts section" e2e scenario.
 *
 * Unlike `buildMultisigOperations`, this scenario is fully **hermetic** — it
 * needs no chain node. Drafts render from backend HTTP responses (which the
 * test mocks), and the harness blocks RPC websockets, so the app never decodes
 * a draft's call data. That means the _presence_ of call data (Submit vs Add
 * call data) and the draft's persisted fields — not any decoded title — are
 * what the view shows, and what the test asserts. Account ids are derived
 * deterministically from a keyring so the seeded wallets, the mocked backend
 * contacts, and the drafts all agree.
 *
 * The scenario covers four drafts across the requested dimensions:
 *
 * 1. Regular multisig + call data + description → Submit
 * 2. Regular multisig + no call data + description → Add call data
 * 3. Flexible multisig + call data + description → Submit
 * 4. Flexible multisig + no call data + (no description) → Add call data
 */

// Polkadot Asset Hub genesis (chainId). Present in both `chains` and `chains_dev`.
const ASSET_HUB_CHAIN_ID = '0x68d56f15f85d3136970ec16946040bc1752654e906147f7e43e9d539d7c3de2f';

const CRYPTO_TYPE_SR25519 = 0; // CryptoType.SR25519

// Wallet ids (arbitrary, unique — kept distinct from buildMultisigOperations).
const VAULT_WALLET_ID = 940;
const MULTISIG_WALLET_ID = 950;
const FLEXIBLE_WALLET_ID = 960;

// An opaque, well-formed hex blob used as a draft's `callData`. The app never
// decodes it in this harness (RPC is blocked), so its only job is to be a
// truthy hex string — which flips the row's primary action from "Add call
// data" to "Submit". It is intentionally NOT a real encoded extrinsic.
const OPAQUE_CALL_DATA = '0x0a0300112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0284d717';

// Deterministic ISO timestamps (newest first drives the section's sort order).
const CREATED_AT_BASE_MS = 1_700_000_000_000;

const keyring = new Keyring({ type: 'sr25519' });

type Account = { seed: string; accountId: string };

const account = (seed: string): Account => {
  const pair = keyring.addFromUri(`//${seed}`);

  return { seed, accountId: u8aToHex(pair.publicKey) };
};

const sortIds = (ids: string[]) => Array.from(ids).sort((a, b) => a.localeCompare(b));

const multisigAccountId = (signatories: string[], threshold: number) =>
  u8aToHex(createKeyMulti(sortIds(signatories), threshold));

const isoAt = (offsetSeconds: number) => new Date(CREATED_AT_BASE_MS + offsetSeconds * 1000).toISOString();

export type DraftScenario = {
  backendUrl: string;
  /** Payload for the mocked `GET /auth/me` session-recovery response. */
  session: { accountId: string; permissions: string[] };
  /** Payload for the mocked `GET /contacts` response (`{ data, total }`). */
  contacts: { data: unknown[]; total: number };
  /**
   * Payload for the mocked `GET /draft-operations` response (`{ data, total
   * }`).
   */
  drafts: { data: unknown[]; total: number };
  walletRows: IndexedDBData;
  accountRows: IndexedDBData;
  /** What the rendered section is expected to show — drives the assertions. */
  expected: {
    total: number;
    submitCount: number;
    addCallDataCount: number;
    descriptions: string[];
  };
};

export async function buildDraftScenario(backendUrl: string): Promise<DraftScenario> {
  await cryptoWaitReady();

  // ── Deterministic accounts ──────────────────────────────────────────────────
  const regularSigs = [account('e2e-draft-a'), account('e2e-draft-b'), account('e2e-draft-c')];
  const flexSigs = [account('e2e-draft-d'), account('e2e-draft-e'), account('e2e-draft-f')];
  const proxiedFacade = account('e2e-draft-proxied');
  const sessionAccount = regularSigs[0]!;

  const regularMsigId = multisigAccountId(
    regularSigs.map((s) => s.accountId),
    2,
  );
  const flexMsigId = multisigAccountId(
    flexSigs.map((s) => s.accountId),
    2,
  );

  const regularMultisigName = 'E2E Draft Multisig';
  const flexibleMultisigName = 'E2E Draft Flexible Multisig';

  // ── The four drafts ─────────────────────────────────────────────────────────
  const descriptions = {
    regularWithData: 'Team payroll — March',
    regularNoData: 'Awaiting call data from ops',
    flexWithData: 'Rotate flexible controller',
  };

  const baseDraft = (id: string, createdOffset: number) => ({
    id,
    chainId: ASSET_HUB_CHAIN_ID,
    createdBy: sessionAccount.accountId,
    createdByContact: { name: regularSigs[0]!.seed, accountId: sessionAccount.accountId },
    createdAt: isoAt(createdOffset),
    updatedAt: isoAt(createdOffset),
  });

  const drafts = [
    {
      // 1. regular multisig + call data + description → Submit
      ...baseDraft('draft-regular-with-data', 40),
      multisigAccountId: regularMsigId,
      proxyAccountId: null,
      callData: OPAQUE_CALL_DATA,
      description: descriptions.regularWithData,
      initiatorAccountId: regularSigs[0]!.accountId,
      signingPath: [
        { kind: 'multisig', accountId: regularMsigId },
        { kind: 'signer', accountId: regularSigs[0]!.accountId },
      ],
    },
    {
      // 2. regular multisig + no call data + description → Add call data
      ...baseDraft('draft-regular-no-data', 30),
      multisigAccountId: regularMsigId,
      proxyAccountId: null,
      callData: null,
      description: descriptions.regularNoData,
      initiatorAccountId: regularSigs[0]!.accountId,
      signingPath: [
        { kind: 'multisig', accountId: regularMsigId },
        { kind: 'signer', accountId: regularSigs[0]!.accountId },
      ],
    },
    {
      // 3. flexible multisig + call data + description → Submit
      ...baseDraft('draft-flex-with-data', 20),
      multisigAccountId: flexMsigId,
      proxyAccountId: proxiedFacade.accountId,
      proxyContact: { name: flexibleMultisigName, accountId: proxiedFacade.accountId },
      callData: OPAQUE_CALL_DATA,
      description: descriptions.flexWithData,
      initiatorAccountId: flexSigs[0]!.accountId,
      signingPath: [
        { kind: 'proxied', accountId: proxiedFacade.accountId },
        { kind: 'multisig', accountId: flexMsigId },
        { kind: 'signer', accountId: flexSigs[0]!.accountId },
      ],
    },
    {
      // 4. flexible multisig + no call data + no description → Add call data
      ...baseDraft('draft-flex-no-data', 10),
      multisigAccountId: flexMsigId,
      proxyAccountId: proxiedFacade.accountId,
      proxyContact: { name: flexibleMultisigName, accountId: proxiedFacade.accountId },
      callData: null,
      description: null,
      initiatorAccountId: flexSigs[0]!.accountId,
      signingPath: [
        { kind: 'proxied', accountId: proxiedFacade.accountId },
        { kind: 'multisig', accountId: flexMsigId },
        { kind: 'signer', accountId: flexSigs[0]!.accountId },
      ],
    },
  ];

  // ── Backend contacts (the paired external address book) ─────────────────────
  // Both multisigs are present as backend contacts (with signatories + threshold)
  // so the address book is "healthy" and the multisig identity resolves even
  // before the local wallet does.
  const contact = (id: string, name: string, accountId: string, extra: Record<string, unknown> = {}) => ({
    id,
    name,
    accountId,
    ...extra,
  });

  const contacts = [
    contact('contact-regular-msig', regularMultisigName, regularMsigId, {
      signatories: regularSigs.map((s) => s.accountId),
      threshold: 2,
    }),
    contact('contact-flex-msig', flexibleMultisigName, proxiedFacade.accountId, {
      signatories: flexSigs.map((s) => s.accountId),
      threshold: 2,
    }),
    ...regularSigs.map((s, i) => contact(`contact-sig-${i}`, s.seed, s.accountId)),
  ];

  // ── Local wallets + accounts (so `hasInitiator` is true → real Submit/Add) ───
  const walletRows: IndexedDBData = {
    database: 'spektr',
    table: 'wallets',
    injectingData: [
      { id: VAULT_WALLET_ID, name: 'E2E Draft Signatories', signingType: 'signing_pv', type: 'wallet_pv' },
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
    backendUrl,
    session: {
      accountId: sessionAccount.accountId,
      permissions: ['operation-draft:read', 'operation-draft:write', 'address-book:read', 'operation:read'],
    },
    contacts: { data: contacts, total: contacts.length },
    drafts: { data: drafts, total: drafts.length },
    walletRows,
    accountRows,
    expected: {
      total: drafts.length,
      submitCount: drafts.filter((d) => d.callData).length,
      addCallDataCount: drafts.filter((d) => !d.callData).length,
      descriptions: [descriptions.regularWithData, descriptions.regularNoData, descriptions.flexWithData],
    },
  };
}
