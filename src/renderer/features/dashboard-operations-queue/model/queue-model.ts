import { type Chain, type ChainId } from '@/shared/core';
import { type Draft } from '@/domains/backend';
import { type AnyAccount, type MultisigOperation, multisigOperationService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

export function filterScopedDrafts(drafts: Draft[], selectedAccountIds: Set<string>): Draft[] {
  if (selectedAccountIds.size === 0) return [];

  return drafts.filter((d) => {
    if (d.multisigAccountId && selectedAccountIds.has(d.multisigAccountId)) return true;
    if (d.proxyAccountId && selectedAccountIds.has(d.proxyAccountId)) return true;
    if (d.initiatorAccountId && selectedAccountIds.has(d.initiatorAccountId)) return true;

    return false;
  });
}

export function filterAwaitingSignature(
  operations: MultisigOperation[],
  walletAccounts: AnyAccount[],
  selectedAccountIds: Set<string>,
  chains: Record<ChainId, Chain>,
): MultisigOperation[] {
  if (selectedAccountIds.size === 0) return [];

  const multisigByAccountId = new Map<string, AnyAccount>();
  for (const account of walletAccounts) {
    if (accountUtils.isAnyMultisigAccount(account) && selectedAccountIds.has(account.accountId)) {
      multisigByAccountId.set(account.accountId, account);
    }
  }

  if (multisigByAccountId.size === 0) return [];

  return operations.filter((op) => {
    const multisig = multisigByAccountId.get(op.multisigAccountId);
    if (!multisig || !accountUtils.isAnyMultisigAccount(multisig)) return false;

    return multisigOperationService.needsUserSignature(op, multisig, walletAccounts, chains[op.chainId]);
  });
}
