import { createAsyncPipeline } from '@/shared/di';
import { type ValidationResult } from '@/features/operations/OperationsValidation';

const validationAsyncPipeline = createAsyncPipeline<
  number[],
  {
    id: number;
    result: ValidationResult;
  }
>();

export const validate = {
  validationAsyncPipeline,
};
