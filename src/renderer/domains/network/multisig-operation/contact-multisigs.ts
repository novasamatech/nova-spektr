import { createEffect, createStore } from 'effector';
import { GraphQLClient, gql } from 'graphql-request';
import { z } from 'zod';

import {
  type CryptoType,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  AccountType,
  CryptoType as CT,
  SigningType,
} from '@/shared/core';
import { isEthereumAccountId } from '@/shared/lib/utils';
import { type AccountId, pjsSchema } from '@/shared/polkadotjs-schemas';
import { INDEXER_URL } from '../account-sync/constants';

import { multisigOperationService } from './service';

/**
 * A multisig discovered by inspecting the user's address book. The user does
 * NOT own any signatory keys for these — they flow through the Operations page
 * as read-only. The UI's signing buttons naturally hide themselves when no
 * signatory matches a wallet account.
 */
export type ContactMultisig = {
  accountId: AccountId;
  name: string;
  signatories: AccountId[];
  threshold: number;
  cryptoType: CryptoType;
  contactIds: string[];
};

/**
 * Reserved sentinel walletId for synthetic `MultisigAccount` records built from
 * contact multisigs. Negative so it cannot collide with IndexedDB
 * auto-increment ids. Downstream `walletModel.$wallets.find(...)` lookups
 * cleanly return `undefined`, and every affected render path already handles
 * that case.
 *
 * Prefer the `isContactMultisigAccount` predicate over directly comparing to
 * this constant so the sentinel can be refactored later without touching every
 * call site.
 */
export const CONTACT_MULTISIG_WALLET_ID = -1;

/**
 * Predicate: true when the given multisig account is a synthetic record built
 * from a contact multisig (the user holds no signatory keys for it).
 */
export function isContactMultisigAccount(account: { walletId: number }): boolean {
  return account.walletId === CONTACT_MULTISIG_WALLET_ID;
}

const QUERY = gql`
  query ContactMultisigs($accounts: [String!]) {
    accounts(filter: { accountId: { in: $accounts } }) {
      nodes {
        accountId
        threshold
        signatories {
          nodes {
            signatoryId
          }
        }
      }
    }
  }
`;

const accountIdSchema = z.string().transform(pjsSchema.helpers.toAccountId);
const rowSchema = z.object({
  accountId: accountIdSchema,
  threshold: z.number().nullable(),
  signatories: z.object({ nodes: z.array(z.object({ signatoryId: accountIdSchema })) }),
});

const inferCryptoType = (accountId: AccountId): CryptoType =>
  isEthereumAccountId(accountId) ? CT.ETHEREUM : CT.SR25519;

/**
 * Zero-trust cryptographic check — even though the data came from our own
 * indexer, we re-derive the multisig address from `(signatories, threshold)`
 * via the same `createKeyMulti` derivation the Substrate runtime uses.
 */
function verifyMultisig(
  accountId: AccountId,
  signatories: AccountId[],
  threshold: number,
  cryptoType: CryptoType,
): boolean {
  if (!Number.isInteger(threshold) || threshold <= 0) return false;
  if (signatories.length < threshold) return false;
  try {
    return multisigOperationService.getMultisigAccountId(signatories, threshold, cryptoType) === accountId;
  } catch {
    return false;
  }
}

/**
 * Build a minimal `MultisigAccount`-shaped record from a `ContactMultisig`.
 * Lets existing operations lookup maps + rendering consume contact-backed
 * multisigs without any branching. Wallet lookups return `undefined` (sentinel
 * walletId) and the UI falls back to the contact-name rendering path.
 */
export function toSyntheticMultisigAccount(cm: ContactMultisig): MultisigAccount {
  return {
    id: `contact-multisig:${cm.accountId}`,
    type: 'universal',
    accountType: AccountType.MULTISIG,
    name: cm.name,
    walletId: CONTACT_MULTISIG_WALLET_ID,
    accountId: cm.accountId,
    cryptoType: cm.cryptoType,
    signingType: SigningType.MULTISIG,
    createdAt: 0,
    signatories: cm.signatories.map(accountId => ({ accountId })),
    threshold: cm.threshold,
  };
}

/**
 * Resolves the multisig accountId for any multisig-shaped account. For flexible
 * multisigs the proxied `multisigAccountId` is returned; for regular multisigs
 * the plain `accountId` is returned. Structural check keeps this
 * dependency-free so it can live in the domain layer.
 */
function resolveMultisigAccountId(account: MultisigAccount | FlexibleMultisigAccount): AccountId {
  return 'multisigAccountId' in account ? account.multisigAccountId : account.accountId;
}

type DiscoverParams = {
  accountIds: AccountId[];
  excluded: ReadonlySet<AccountId>;
  nameByAccountId: ReadonlyMap<AccountId, { name: string; contactIds: string[] }>;
};

const discoverFx = createEffect<DiscoverParams, ContactMultisig[]>(
  async ({ accountIds, excluded, nameByAccountId }) => {
    if (accountIds.length === 0) return [];

    try {
      const client = new GraphQLClient(INDEXER_URL);
      const response = await client.request<{ accounts: { nodes: unknown[] } }, { accounts: AccountId[] }>(QUERY, {
        accounts: accountIds,
      });

      const result: ContactMultisig[] = [];
      for (const raw of response.accounts.nodes) {
        const row = rowSchema.safeParse(raw);
        if (!row.success) continue;

        const { accountId, threshold } = row.data;
        if (threshold === null) continue;
        if (excluded.has(accountId)) continue;

        const signatories = row.data.signatories.nodes.map(n => n.signatoryId);
        const cryptoType = inferCryptoType(accountId);
        if (!verifyMultisig(accountId, signatories, threshold, cryptoType)) continue;

        const meta = nameByAccountId.get(accountId);
        result.push({
          accountId,
          name: meta?.name ?? accountId,
          signatories,
          threshold,
          cryptoType,
          contactIds: meta?.contactIds ?? [],
        });
      }
      return result;
    } catch (error) {
      console.error('[contact-multisigs] indexer discovery failed', error);
      return [];
    }
  },
);

// updateFilter: reject structurally-identical rediscovery results so that
// re-subscription and context store combines don't churn.
const $contactMultisigs = createStore<ContactMultisig[]>([], {
  updateFilter: (next, prev) => {
    if (next.length !== prev.length) return true;
    for (let i = 0; i < next.length; i++) {
      const n = next[i];
      const p = prev[i];
      if (!n || !p) return true;
      if (n.accountId !== p.accountId) return true;
      if (n.threshold !== p.threshold) return true;
      if (n.signatories.length !== p.signatories.length) return true;
    }
    return false;
  },
});
$contactMultisigs.on(discoverFx.doneData, (_, next) => next);

export const contactMultisigsModel = {
  $contactMultisigs,
  discoverFx,
  verifyMultisig,
  resolveMultisigAccountId,
  toSyntheticMultisigAccount,
};
