export const toRawString = (value?: string): string => {
  if (!value) return '';

  return value.replaceAll(',', '');
};
