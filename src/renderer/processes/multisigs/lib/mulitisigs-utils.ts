import { Chain, ChainOptions } from '@shared/core';

export const multisigUtils = {
  isMultisigSupported,
};

function isMultisigSupported(chain: Chain): boolean {
  return Boolean(chain.options?.includes(ChainOptions.MULTISIG));
}
