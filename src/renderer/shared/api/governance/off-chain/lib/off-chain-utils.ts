import type { ChainId } from '@shared/core';
import { OpenGov, isFulfilled } from '@shared/lib/utils';

export const offChainUtils = {
  getChainName,
  getRemainingReferendums,
};

function getChainName(chainId: ChainId): string | undefined {
  return OpenGov[chainId];
}

async function getRemainingReferendums(
  iterations: number,
  getApiUrl: (page: number) => string,
  fetchParams?: RequestInit,
): Promise<any[]> {
  const requests = Array.from({ length: iterations }, (_, index) => {
    return fetch(getApiUrl(index + 1), { method: 'GET', ...fetchParams });
  });
  const responses = await Promise.allSettled(requests);
  const dataRequests = responses.filter(isFulfilled).map((res) => res.value.json());

  return Promise.all(dataRequests);
}
