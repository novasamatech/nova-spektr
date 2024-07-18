import { type Validation, type ValidationResult } from '../types/types';

export const validationUtils = {
  applyValidationRules,
};

const applyValidationRule = ({ value, form, source, name, errorText, validator }: Validation): ValidationResult => {
  const isValid = validator(value, form, source);

  if (!isValid) {
    return { name, errorText };
  }
};

export function applyValidationRules(validation: Validation[]): ValidationResult {
  for (const rule of validation) {
    const result = applyValidationRule(rule);

    if (result) {
      return result;
    }
  }
}
