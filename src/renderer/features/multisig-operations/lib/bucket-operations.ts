import { type MultisigOperation } from '@/domains/network';

import { type OperationSection, SECTION_ORDER, getOperationSection } from './operations-sections';

type Bucketable = { operation: Pick<MultisigOperation, 'id' | 'status'> };

type Options = {
  hiddenIds: string[];
  /** Merged "All operations" scope surfaces hidden ops in a trailing section. */
  isScopeMerged: boolean;
  /**
   * Pending tab without a narrowing Status filter: the In-progress group stays
   * even with zero rows.
   */
  alwaysShowInProgress: boolean;
};

export type OperationBucket<T> = { section: OperationSection; items: T[] };

export const bucketOperations = <T extends Bucketable>(
  operations: T[],
  { hiddenIds, isScopeMerged, alwaysShowInProgress }: Options,
): OperationBucket<T>[] => {
  const buckets = new Map<OperationSection, T[]>();
  if (alwaysShowInProgress) buckets.set('in_progress', []);

  for (const item of operations) {
    const isHidden = isScopeMerged && hiddenIds.includes(item.operation.id);
    const section = isHidden ? 'hidden' : getOperationSection(item.operation);
    const list = buckets.get(section) ?? [];
    list.push(item);
    buckets.set(section, list);
  }

  return SECTION_ORDER.flatMap(section => {
    const items = buckets.get(section);

    return items ? [{ section, items }] : [];
  });
};
