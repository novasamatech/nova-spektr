import { describe, expect, it } from 'vitest';

import { partitionWidgets } from '../widget-visibility';

const widget = (key: string | null, order: number, available: () => boolean = () => true) => ({
  key,
  available,
  body: { order },
});

describe('partitionWidgets', () => {
  it('splits available widgets by the hidden set', () => {
    const a = widget('a', 0);
    const b = widget('b', 1);

    const { visible, hidden } = partitionWidgets([a, b], ['b']);

    expect(visible.map((h) => h.key)).toEqual(['a']);
    expect(hidden.map((h) => h.key)).toEqual(['b']);
  });

  it('orders both lists by body.order, not registration order', () => {
    const { visible, hidden } = partitionWidgets(
      [widget('c', 20), widget('a', 0), widget('d', 30), widget('b', 10)],
      ['d', 'b'],
    );

    expect(visible.map((h) => h.key)).toEqual(['a', 'c']);
    expect(hidden.map((h) => h.key)).toEqual(['b', 'd']);
  });

  it('drops an unavailable widget from both lists even when it is hidden', () => {
    const { visible, hidden } = partitionWidgets([widget('a', 0, () => false), widget('b', 1)], ['a']);

    expect(visible.map((h) => h.key)).toEqual(['b']);
    expect(hidden).toEqual([]);
  });

  it('drops a widget whose availability check throws', () => {
    const throwing = widget('a', 0, () => {
      throw new Error('feature exploded');
    });

    const { visible, hidden } = partitionWidgets([throwing, widget('b', 1)], ['a']);

    expect(visible.map((h) => h.key)).toEqual(['b']);
    expect(hidden).toEqual([]);
  });

  it('drops a widget without a key', () => {
    const { visible, hidden } = partitionWidgets([widget(null, 0), widget('b', 1)], []);

    expect(visible.map((h) => h.key)).toEqual(['b']);
    expect(hidden).toEqual([]);
  });

  it('ignores hidden keys that no longer match a widget', () => {
    const { visible, hidden } = partitionWidgets([widget('a', 0)], ['gone']);

    expect(visible.map((h) => h.key)).toEqual(['a']);
    expect(hidden).toEqual([]);
  });
});
