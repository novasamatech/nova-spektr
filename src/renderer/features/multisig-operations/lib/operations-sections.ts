import { type MultisigOperation } from '@/domains/network';

export type OperationSection = 'in_progress' | 'completed' | 'rejected' | 'hidden';

export const SECTION_ORDER: readonly OperationSection[] = ['in_progress', 'completed', 'rejected', 'hidden'];

export const SECTION_LABEL_KEYS: Record<OperationSection, string> = {
  in_progress: 'operations.sections.inProgress',
  completed: 'operations.sections.completed',
  rejected: 'operations.sections.rejected',
  hidden: 'operations.sections.hidden',
};

/**
 * Values selectable in the Status filter. Extends operation sections with
 * `drafts` — not an operation status, but the drafts section obeys the same
 * filter: it is visible only when no status is selected or `drafts` is.
 */
export type StatusFilterValue = OperationSection | 'drafts';

export const STATUS_FILTER_ORDER: readonly StatusFilterValue[] = [
  'drafts',
  'in_progress',
  'completed',
  'rejected',
  'hidden',
];

export const STATUS_FILTER_LABEL_KEYS: Record<StatusFilterValue, string> = {
  ...SECTION_LABEL_KEYS,
  drafts: 'operations.drafts.title',
};

export const isOperationSection = (value: string): value is OperationSection => {
  return SECTION_ORDER.some(section => section === value);
};

export const isStatusFilterValue = (value: string): value is StatusFilterValue => {
  return STATUS_FILTER_ORDER.some(status => status === value);
};

export const getOperationSection = (operation: MultisigOperation): OperationSection => {
  if (operation.status === 'pending') return 'in_progress';
  if (operation.status === 'executed') return 'completed';

  return 'rejected';
};
