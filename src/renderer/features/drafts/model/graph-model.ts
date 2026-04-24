import { type Store, combine, createEffect, createEvent, createStore, sample } from 'effector';

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

type ContactsByAccountId = Map<AccountId, BackendContact>;

const $contactByAccountId = contactModel.$backendContacts.map<ContactsByAccountId>(
  (contacts) => new Map(contacts.map((c) => [c.accountId, c])),
);

function buildSources(
  contactByAccountId: ContactsByAccountId,
  proxies: Record<AccountId, ProxyAccount[] | undefined>,
  chainId: ChainId,
): PathSource[] {
  const sources: PathSource[] = [];

  for (const contact of contactByAccountId.values()) {
    if (isMultisigContact(contact)) {
      sources.push({ accountId: contact.accountId, name: contact.name, isProxy: false, walletType: null });
      continue;
    }

    const signers = proxies[contact.accountId] ?? [];
    const hasMultisigSigner = signers.some(
      (p) => p.chainId === chainId && isMultisigContact(contactByAccountId.get(p.accountId) ?? (null as never)),
    );

    if (hasMultisigSigner) {
      sources.push({ accountId: contact.accountId, name: contact.name, isProxy: true, walletType: null });
    }
  }

  return sources;
}

function buildNextOptions(
  node: PathNode,
  contactByAccountId: ContactsByAccountId,
  proxies: Record<AccountId, ProxyAccount[] | undefined>,
  chainId: ChainId,
): PathNextOption[] {
  if (node.kind === 'signer') return [];

  const nodeAccountId = node.accountId as AccountId;

  if (node.kind === 'proxied') {
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

  const multisigContact = contactByAccountId.get(nodeAccountId);
  if (!multisigContact || !isMultisigContact(multisigContact)) return [];

  return (multisigContact.signatories ?? []).map((sigId) => {
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

  const $store = combine($contactByAccountId, proxyModel.$proxies, (contactByAccountId, proxies) =>
    buildSources(contactByAccountId, proxies as Record<AccountId, ProxyAccount[] | undefined>, chainId),
  );
  sourcesForCache.set(chainId, $store);

  return $store;
}

const nextOptionsCache = new Map<string, Store<PathNextOption[]>>();

function $nextOptionsForNode(node: PathNode, chainId: ChainId): Store<PathNextOption[]> {
  const key = `${node.kind}:${node.accountId}:${chainId}`;
  const $cached = nextOptionsCache.get(key);
  if ($cached) return $cached;

  const $store = combine($contactByAccountId, proxyModel.$proxies, (contactByAccountId, proxies) =>
    buildNextOptions(node, contactByAccountId, proxies as Record<AccountId, ProxyAccount[] | undefined>, chainId),
  );
  nextOptionsCache.set(key, $store);

  return $store;
}

const $contactNameByAccountId = contactModel.$backendContacts.map<Record<string, string>>((contacts) =>
  dictionary(contacts, 'accountId', (c) => c.name),
);

const $empty = createStore<PathNextOption[]>([]);

const cachesCleared = createEvent();
const clearCachesFx = createEffect(() => {
  nextOptionsCache.clear();
});
sample({ clock: cachesCleared, target: clearCachesFx });

export const graphModel = {
  $sourcesFor,
  $nextOptionsForNode,
  $contactNameByAccountId,
  $empty,
  cachesCleared,
};
