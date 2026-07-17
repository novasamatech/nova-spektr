import { type Chain, type ChainId } from '@/shared/core';
import { type Draft } from '@/domains/backend';
import {
  type AnyAccount,
  type MultisigOperation,
  MultisigOperationStatus,
  multisigOperationService,
} from '@/domains/network';
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
    if (op.status !== MultisigOperationStatus.Pending) return false;
    const multisig = multisigByAccountId.get(op.multisigAccountId);
    if (!multisig || !accountUtils.isAnyMultisigAccount(multisig)) return false;

    const actionable = multisigOperationService.findActionableSignatories(
      op,
      multisig,
      walletAccounts,
      chains[op.chainId],
    );

    return actionable.length > 0;
  });
}

export type QueueTab = 'all' | 'drafts' | 'multisig';

export type QueueItem =
  | { kind: 'draft'; key: string; date: number; draft: Draft }
  | { kind: 'multisig'; key: string; date: number; operation: MultisigOperation };

export function draftSkipKey(draft: Pick<Draft, 'id'>): string {
  return `draft:${draft.id}`;
}

export function multisigSkipKey(operation: Pick<MultisigOperation, 'id'>): string {
  return `multisig:${operation.id}`;
}

export function buildQueueItems(drafts: Draft[], operations: MultisigOperation[]): QueueItem[] {
  const byDateDesc = (a: QueueItem, b: QueueItem) => b.date - a.date;

  const draftItems: QueueItem[] = drafts
    .map((draft) => ({
      kind: 'draft' as const,
      key: draftSkipKey(draft),
      date: new Date(draft.createdAt).getTime(),
      draft,
    }))
    .sort(byDateDesc);

  const multisigItems: QueueItem[] = operations
    .map((operation) => ({
      kind: 'multisig' as const,
      key: multisigSkipKey(operation),
      date: multisigOperationService.getOperationTimestamp(operation),
      operation,
    }))
    .sort(byDateDesc);

  return [...draftItems, ...multisigItems];
}

export function filterQueueBySkip(items: QueueItem[], skipped: Set<string>): QueueItem[] {
  if (skipped.size === 0) return items;

  return items.filter((item) => !skipped.has(item.key));
}

export function filterQueueByTab(items: QueueItem[], tab: QueueTab): QueueItem[] {
  if (tab === 'all') return items;
  if (tab === 'drafts') return items.filter((item) => item.kind === 'draft');

  return items.filter((item) => item.kind === 'multisig');
}

export function countQueue(items: QueueItem[]): { drafts: number; multisig: number } {
  let drafts = 0;
  let multisig = 0;
  for (const item of items) {
    if (item.kind === 'draft') drafts += 1;
    else multisig += 1;
  }

  return { drafts, multisig };
}
