/**
 * Validate WebSocket address
 * @param address address to validate
 * @return {Boolean}
 */
const validateWsAddress = (address: string): boolean => {
  return /^ws(s)?:\/\/.+(\.[a-z]{2,}|:\d{4,5})(\/[a-z\d_-]+)*\W{0}\/?/i.test(address);
};

export const customRpcUtils = {
  validateWsAddress,
};
