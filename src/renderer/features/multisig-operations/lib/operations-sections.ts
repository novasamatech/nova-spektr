import { type MultisigOperation } from '@/domains/network';

export type OperationSection = 'in_progress' | 'completed' | 'rejected';

export const SECTION_ORDER: readonly OperationSection[] = ['in_progress', 'completed', 'rejected'];

export const SECTION_LABEL_KEYS: Record<OperationSection, string> = {
  in_progress: 'operations.sections.inProgress',
  completed: 'operations.sections.completed',
  rejected: 'operations.sections.rejected',
};

export const isOperationSection = (value: string): value is OperationSection => {
  return SECTION_ORDER.some(section => section === value);
};

export const getOperationSection = (operation: MultisigOperation): OperationSection => {
  if (operation.status === 'pending') return 'in_progress';
  if (operation.status === 'executed') return 'completed';

  return 'rejected';
};
