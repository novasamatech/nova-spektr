/**
 * Get short address representation
 * `5DXYNRXmNmFLFxxUjMXSzKh3vqHRDfDGGbY3BnSdQcta1SkX --> 5DXYNR...ta1SkX`
 * @param address value to make short
 * @param size how many letters should be visible from start/end
 * @return {String}
 */
export const getShortAddress = (address = '', size = 6): string => {
  return address.length < 13 ? address : `${address.slice(0, size)}...${address.slice(-1 * size)}`;
};

/**
 * Copies string value to clipboard
 * @param text value to copy
 */
export const copyToClipboard = (text = '') => {
  navigator.clipboard.writeText(text);
};
