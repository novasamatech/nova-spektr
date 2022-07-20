/**
 * Get short address representation
 * `5DXYNRXmNmFLFxxUjMXSzKh3vqHRDfDGGbY3BnSdQcta1SkX --> 5DXYNR...ta1SkX`
 * @param address value to make short
 * @return {String}
 */
export const getShortAddress = (address = ''): string => {
  return address.length < 13 ? address : `${address.slice(0, 6)}...${address.slice(-6)}`;
};

/**
 * Copies string value to clipboard
 * @param text value to copy
 */
export const copyToClipboard = (text = '') => {
  navigator.clipboard.writeText(text);
};
