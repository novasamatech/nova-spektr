import { type BackendContact } from '@/shared/core';
import { type Draft } from '@/domains/backend';
import { type AnyAccount } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { createSyntheticProxiedAccount, scopeProxiedAccount } from '@/features/signing-path';

export function resolveDraftProxyAccount(
  draft: Draft,
  allAccounts: AnyAccount[],
  backendContacts: BackendContact[],
): AnyAccount | null {
  if (!draft.proxyAccountId) return null;

  const proxiedNode = draft.signingPath.find(
    (node, index) => index === 0 && node.kind === 'proxied' && node.accountId === draft.proxyAccountId,
  );
  const nextNode = proxiedNode ? draft.signingPath[1] : undefined;

  const existingProxyAccount = allAccounts.find(
    (account) =>
      account.accountId === draft.proxyAccountId &&
      (accountUtils.isProxiedAccount(account) || accountUtils.isFlexibleMultisigAccount(account)),
  );

  if (existingProxyAccount) {
    return scopeProxiedAccount(existingProxyAccount, nextNode?.accountId, proxiedNode?.proxyType);
  }

  if (!proxiedNode?.proxyType || !nextNode) {
    return allAccounts.find((account) => account.accountId === draft.proxyAccountId) ?? null;
  }

  const sameAddressAccount = allAccounts.find((account) => account.accountId === draft.proxyAccountId);
  const contactName =
    draft.proxyContact?.name ?? backendContacts.find((contact) => contact.accountId === draft.proxyAccountId)?.name;

  return createSyntheticProxiedAccount({
    id: `draft:${draft.id}:proxy:${draft.proxyAccountId}`,
    name: contactName,
    baseAccount: sameAddressAccount,
    accountId: draft.proxyAccountId,
    chainId: draft.chainId,
    proxyAccountId: nextNode.accountId,
    proxyType: proxiedNode.proxyType,
  });
}
