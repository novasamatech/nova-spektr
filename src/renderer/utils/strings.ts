export const toShortText = (text = ''): string => {
  return text.length < 13 ? text : `${text.slice(0, 6)}...${text.slice(-6)}`;
};

export const copyToClipboard = (text = '') => {
  navigator.clipboard.writeText(text);
};
