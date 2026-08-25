import { createFlowConfirmModel } from '@/features/operations';
import { type PayeeFlowConfirm } from '../types';

export const confirmModel = createFlowConfirmModel<PayeeFlowConfirm>();
