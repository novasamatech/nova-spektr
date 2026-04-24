import { type Store, combine, createStore } from 'effector';

import { type ChainId, type WalletType } from '@/shared/core';
import { type BackendContact } from '@/shared/core/types/contact';
import { type ProxyAccount } from '@/shared/core/types/proxy';
import { dictionary } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { contactModel } from '@/entities/contact';
import { proxyModel } from '@/entities/proxy';

export type PathSource = {
  accountId: AccountId;
  name: string;
  isProxy: boolean;
  walletType?: WalletType | null;
};

export type PathNextOption =
  | { kind: 'multisig'; accountId: AccountId; name: string; threshold?: number; signatoriesCount?: number }
  | { kind: 'signer'; accountId: AccountId; name: string };

const isMultisigContact = (c: BackendContact): boolean =>
  Array.isArray(c.signatories) && c.signatories.length > 0 && typeof c.threshold === 'number' && c.threshold >= 1;

function buildSources(
  contacts: BackendContact[],
  proxies: Record<AccountId, ProxyAccount[] | undefined>,
  chainId: ChainId,
): PathSource[] {
  const multisigAccountIds = new Set(contacts.filter(isMultisigContact).map((c) => c.accountId));

  const getSignerMultisigIds = (contactAccountId: AccountId): AccountId[] => {
    const signers = proxies[contactAccountId] ?? [];

    return signers
      .filter((p) => p.chainId === chainId)
      .map((p) => p.accountId)
      .filter((id) => multisigAccountIds.has(id));
  };

  return contacts
    .filter((c) => {
      if (isMultisigContact(c)) return true;

      return getSignerMultisigIds(c.accountId).length > 0;
    })
    .map((c) => {
      const isProxy = !isMultisigContact(c);

      return {
        accountId: c.accountId,
        name: c.name,
        isProxy,
        walletType: null,
      };
    });
}

function buildNextOptions(
  node: PathNode,
  contacts: BackendContact[],
  proxies: Record<AccountId, ProxyAccount[] | undefined>,
  chainId: ChainId,
): PathNextOption[] {
  if (node.kind === 'signer') return [];

  const contactByAccountId = new Map<AccountId, BackendContact>(contacts.map((c) => [c.accountId, c]));

  if (node.kind === 'proxied') {
    const nodeAccountId = node.accountId as AccountId;
    const signers = proxies[nodeAccountId] ?? [];

    return signers
      .filter((p) => p.chainId === chainId)
      .flatMap((p) => {
        const contact = contactByAccountId.get(p.accountId);
        if (!contact || !isMultisigContact(contact)) return [];

        return [
          {
            kind: 'multisig' as const,
            accountId: contact.accountId,
            name: contact.name,
            threshold: contact.threshold ?? undefined,
            signatoriesCount: contact.signatories?.length ?? undefined,
          },
        ];
      });
  }

  const nodeAccountId = node.accountId as AccountId;
  const multisigContact = contactByAccountId.get(nodeAccountId);

  if (!multisigContact || !isMultisigContact(multisigContact)) return [];

  const signatories = multisigContact.signatories ?? [];

  return signatories.map((sigId) => {
    const sigAccountId = sigId as AccountId;
    const sigContact = contactByAccountId.get(sigAccountId);

    if (sigContact && isMultisigContact(sigContact)) {
      return {
        kind: 'multisig' as const,
        accountId: sigAccountId,
        name: sigContact.name,
        threshold: sigContact.threshold ?? undefined,
        signatoriesCount: sigContact.signatories?.length ?? undefined,
      };
    }

    return {
      kind: 'signer' as const,
      accountId: sigAccountId,
      name: sigContact?.name ?? sigId,
    };
  });
}

const sourcesForCache = new Map<ChainId, Store<PathSource[]>>();

function $sourcesFor(chainId: ChainId): Store<PathSource[]> {
  const $cached = sourcesForCache.get(chainId);
  if ($cached) return $cached;

  const $store = combine(contactModel.$backendContacts, proxyModel.$proxies, (contacts, proxies) =>
    buildSources(contacts, proxies as Record<AccountId, ProxyAccount[] | undefined>, chainId),
  );
  sourcesForCache.set(chainId, $store);

  return $store;
}

const nextOptionsCache = new Map<string, Store<PathNextOption[]>>();

function $nextOptionsForNode(node: PathNode, chainId: ChainId): Store<PathNextOption[]> {
  const key = `${node.kind}:${node.accountId}:${chainId}`;
  const $cached = nextOptionsCache.get(key);
  if ($cached) return $cached;

  const $store = combine(contactModel.$backendContacts, proxyModel.$proxies, (contacts, proxies) =>
    buildNextOptions(node, contacts, proxies as Record<AccountId, ProxyAccount[] | undefined>, chainId),
  );
  nextOptionsCache.set(key, $store);

  return $store;
}

const $contactNameByAccountId = contactModel.$backendContacts.map<Record<string, string>>((contacts) =>
  dictionary(contacts, 'accountId', (c) => c.name),
);

const $empty = createStore<PathNextOption[]>([]);

export const graphModel = {
  $sourcesFor,
  $nextOptionsForNode,
  $contactNameByAccountId,
  $empty,
};
