import { type OperationSection, type StatusFilterValue } from './operations-sections';
import { type OperationWithAccount } from './types';

/**
 * One row of the virtualized list: a group heading, an empty-group placeholder,
 * or an operation.
 */
export type FlatItem =
  | { type: 'section'; section: OperationSection; count: number }
  | { type: 'empty'; section: OperationSection }
  | { type: 'operation'; item: OperationWithAccount };

type Section = { section: OperationSection; items: OperationWithAccount[] };

/**
 * Flattens the sectioned operations into the list the virtualizer walks.
 *
 * `firstHeadingAbove` says the first group's heading is already drawn above the
 * sticky column header (page → section → table), so the list must not repeat
 * it. A collapsed group keeps its heading but contributes no rows; an expanded
 * group with nothing in it emits the dashed placeholder instead.
 */
export const buildFlatItems = (
  sections: Section[],
  collapsed: Partial<Record<StatusFilterValue, boolean>>,
  { firstHeadingAbove }: { firstHeadingAbove: boolean },
): FlatItem[] => {
  const items: FlatItem[] = [];

  for (const [index, { section, items: sectionItems }] of sections.entries()) {
    const headingIsAbove = firstHeadingAbove && index === 0;
    if (!headingIsAbove) items.push({ type: 'section', section, count: sectionItems.length });
    if (collapsed[section]) continue;

    if (sectionItems.length === 0) {
      items.push({ type: 'empty', section });
      continue;
    }
    for (const item of sectionItems) items.push({ type: 'operation', item });
  }

  return items;
};
