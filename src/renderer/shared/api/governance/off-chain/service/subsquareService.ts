import type { ChainId } from '@shared/core';
import { OpenGov } from '@shared/lib/utils';
import type { IGovernanceApi } from '../lib/types';

export const subsquareService: IGovernanceApi = {
  getReferendumList,
  getReferendumDetails,
};

/**
 * Request referendum list without details
 * Subsquare can give us only 100 units of data each round
 * Ping their API to check "total" referendums and request remaining with Promise.all
 * @param chainId chainId value
 * @return {Promise}
 */
async function getReferendumList(chainId: ChainId): Promise<unknown[]> {
  const chainName = getChainName(chainId);
  if (!chainName) return [];

  const api = (page: number, size = 100) =>
    `https://${chainName}.subsquare.io/api/gov2/referendums?page=${page}&page_size=${size}&simple=true`;

  try {
    const ping = await (await fetch(api(1))).json();
    const iterations = Math.ceil(ping.total / 100) - 1;

    const requests = Array.from({ length: iterations }, (_, index) => fetch(api(index + 2)));
    const responses = await Promise.all(requests);
    const referendums = await Promise.all(responses.map((res) => res.json()));

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
