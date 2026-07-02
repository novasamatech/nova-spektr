import { type MultisigOperation } from '@/domains/network';

export type OperationSection = 'in_progress' | 'completed' | 'rejected';

export const SECTION_ORDER: OperationSection[] = ['in_progress', 'completed', 'rejected'];

export const getOperationSection = (operation: MultisigOperation): OperationSection => {
  if (operation.status === 'pending') return 'in_progress';
  if (operation.status === 'executed') return 'completed';

  return 'rejected';
};
