export const operationColumns = {
  leftBlock: 'w-[388px] shrink-0', // icon + title/chain (240) + gap (8) + value (140)
  titleCell: 'flex-1 min-w-0',
  value: 'w-[140px] shrink-0',
  submitter: 'w-[180px] shrink-0',
  description: 'flex-1 min-w-0 pl-4',
  status: 'w-[110px] shrink-0',
  actions: 'w-[168px] shrink-0',
  chevron: 'w-4 shrink-0',
} as const;

// Fits the default 1372px window with the expanded 240px sidebar (1100px of content):
// fixed columns sum to 950px, leaving >=110px for the description cell.
export const OPERATIONS_MIN_WIDTH = 'min-w-[1060px]';
export const ROW_HEIGHT = 68;
// Vertical gap between operation cards; matches the `pb-1.5` on each virtualized row.
export const ROW_GAP = 6;
// Section header estimate: 16px top padding + 20px content + 6px bottom padding.
export const SECTION_HEADER_HEIGHT = 42;
