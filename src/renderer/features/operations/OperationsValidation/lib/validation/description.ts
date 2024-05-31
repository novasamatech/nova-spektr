export const DESCRIPTION_LENGTH = 120;

export const descriptionValidation = {
  isMaxLength,
};

function isMaxLength(value: string): boolean {
  return !value || value.length <= DESCRIPTION_LENGTH;
}
