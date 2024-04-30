import type { ChainId } from '@shared/core';
import { OpenGov } from '@shared/lib/utils';

export const offChainUtils = {
  getChainName,
};

function getChainName(chainId: ChainId): string | undefined {
  return OpenGov[chainId];
}
