import { describe, expect, it } from 'vitest';

import { buildFlatItems } from './build-flat-items';
import { type OperationWithAccount } from './types';

const operation = (id: string): OperationWithAccount =>
  ({ operation: { id }, account: { accountId: '0x00' } }) as unknown as OperationWithAccount;

describe('buildFlatItems', () => {
  it('suppresses the first heading only when it is drawn above the list', () => {
    const sections = [
      { section: 'in_progress' as const, items: [operation('a')] },
      { section: 'completed' as const, items: [operation('b')] },
    ];

    expect(buildFlatItems(sections, {}, { firstHeadingAbove: true })).toEqual([
      { type: 'operation', item: sections[0]!.items[0] },
      { type: 'section', section: 'completed', count: 1 },
      { type: 'operation', item: sections[1]!.items[0] },
    ]);

    expect(buildFlatItems(sections, {}, { firstHeadingAbove: false })[0]).toEqual({
      type: 'section',
      section: 'in_progress',
      count: 1,
    });
  });

  it('a collapsed section keeps its heading but drops its rows', () => {
    const sections = [{ section: 'completed' as const, items: [operation('a'), operation('b')] }];

    expect(buildFlatItems(sections, { completed: true }, { firstHeadingAbove: false })).toEqual([
      { type: 'section', section: 'completed', count: 2 },
    ]);
  });

  it('a collapsed empty section drops its placeholder too', () => {
    const sections = [{ section: 'in_progress' as const, items: [] }];

    expect(buildFlatItems(sections, { in_progress: true }, { firstHeadingAbove: false })).toEqual([
      { type: 'section', section: 'in_progress', count: 0 },
    ]);
  });

  it('an expanded empty section emits the placeholder', () => {
    const sections = [{ section: 'in_progress' as const, items: [] }];

    expect(buildFlatItems(sections, {}, { firstHeadingAbove: false })).toEqual([
      { type: 'section', section: 'in_progress', count: 0 },
      { type: 'empty', section: 'in_progress' },
    ]);
    expect(buildFlatItems(sections, {}, { firstHeadingAbove: true })).toEqual([
      { type: 'empty', section: 'in_progress' },
    ]);
  });
});
