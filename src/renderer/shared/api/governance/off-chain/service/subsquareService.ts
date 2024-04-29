import type { ChainId } from '@shared/core';
import { OpenGov, isFulfilled } from '@shared/lib/utils';
import type { IGovernanceApi } from '../lib/types';

// TODO: use callback to return the data, instead of waiting all at once
export const subsquareService: IGovernanceApi = {
  getReferendumList,
  getReferendumDetails,
};

/**
 * Request referendum list without details
 * Subsquare can give us only 100 units of data each round
 * Ping their API to check "total" referendums and request remaining with Promise.allSettled
 * @param chainId chainId value
 * @return {Promise}
 */
async function getReferendumList(chainId: ChainId): Promise<unknown[]> {
  const chainName = getChainName(chainId);
  if (!chainName) return [];

  const getApiUrl = (chainName: string, page: number, size = 100): string => {
    return `https://${chainName}.subsquare.io/api/gov2/referendums?page=${page}&page_size=${size}&simple=true`;
  };

  try {
    const ping = await (await fetch(getApiUrl(chainName, 1, 1), { method: 'GET' })).json();
    const iterations = Math.ceil(ping.total / 100);

    const requests = Array.from({ length: iterations }, (_, index) => {
      return fetch(getApiUrl(chainName, index + 1), { method: 'GET' });
    });
    const responses = await Promise.allSettled(requests);
    const data = responses.filter(isFulfilled).map((res) => res.value.json());
    const referendums = await Promise.all(data);

    return [...ping.items, ...referendums.flatMap((ref) => ref.items)];
  } catch {
    return [];
  }
}

/**
 * Request referendum details
 * @param chainId chainId value
 * @param index referendum index
 * @return {Promise}
 */
async function getReferendumDetails(chainId: ChainId, index: number): Promise<unknown | undefined> {
  const chainName = getChainName(chainId);
  if (!chainName) return undefined;

  const api = `https://${chainName}.subsquare.io/api/gov2/referendums/${index}`;

  try {
    return (await fetch(api)).json();
  } catch {
    return undefined;
  }
}

function getChainName(chainId: ChainId): string | undefined {
  return OpenGov[chainId];
}
