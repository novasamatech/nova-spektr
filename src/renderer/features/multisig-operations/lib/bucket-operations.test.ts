import { describe, expect, it } from 'vitest';

import { type MultisigOperation } from '@/domains/network';

import { bucketOperations } from './bucket-operations';

const op = (id: string, status: MultisigOperation['status']) => ({
  operation: { id, status } as unknown as MultisigOperation,
  account: {} as never,
});

describe('bucketOperations', () => {
  it('groups by section in display order and drops empty sections', () => {
    const sections = bucketOperations([op('a', 'executed'), op('b', 'pending'), op('c', 'cancelled')], {
      hiddenIds: [],
      isScopeMerged: false,
      alwaysShowInProgress: false,
    });
    expect(sections.map(s => s.section)).toEqual(['in_progress', 'completed', 'rejected']);
  });

  it('keeps an empty in-progress section on the pending tab', () => {
    const sections = bucketOperations([], { hiddenIds: [], isScopeMerged: false, alwaysShowInProgress: true });
    expect(sections).toEqual([{ section: 'in_progress', items: [] }]);
  });

  it('routes hidden operations to their own section only in the merged scope', () => {
    const ops = [op('a', 'pending'), op('h', 'executed')];
    expect(
      bucketOperations(ops, { hiddenIds: ['h'], isScopeMerged: true, alwaysShowInProgress: false }).map(s => s.section),
    ).toEqual(['in_progress', 'hidden']);
    expect(
      bucketOperations(ops, { hiddenIds: ['h'], isScopeMerged: false, alwaysShowInProgress: false }).map(
        s => s.section,
      ),
    ).toEqual(['in_progress', 'completed']);
  });
});
