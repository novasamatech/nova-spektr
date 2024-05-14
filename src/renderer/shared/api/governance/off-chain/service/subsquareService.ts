import { dictionary } from '@shared/lib/utils';
import type { ChainId } from '@shared/core';
import type { IGovernanceApi } from '../lib/types';
import { offChainUtils } from '../lib/off-chain-utils';

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
async function getReferendumList(chainId: ChainId): Promise<Record<string, string>> {
  const chainName = offChainUtils.getChainName(chainId);
  if (!chainName) return {};

  const getApiUrl = (chainName: string, page: number, size = 100): string => {
    return `https://${chainName}.subsquare.io/api/gov2/referendums?page=${page}&page_size=${size}&simple=true`;
  };

  try {
    const ping = await (await fetch(getApiUrl(chainName, 1, 1), { method: 'GET' })).json();
    const iterations = Math.ceil(ping.total / 100);
    const remainders = await offChainUtils.getRemainingReferendums(iterations, (index) => getApiUrl(chainName, index));
    const referendums = [...ping.items, ...remainders.flatMap((r) => r.items)];

    return dictionary(referendums, 'referendumIndex', (item) => item.title);
  } catch {
    return {};
  }
}

/**
 * Request referendum details
 * @param chainId chainId value
 * @param index referendum index
 * @return {Promise}
 */
async function getReferendumDetails(chainId: ChainId, index: string): Promise<string | undefined> {
  const chainName = offChainUtils.getChainName(chainId);
  if (!chainName) return undefined;

  const apiUrl = `https://${chainName}.subsquare.io/api/gov2/referendums/${index}`;

  try {
    const details = await (await fetch(apiUrl)).json();

    return details.content;
  } catch {
    return undefined;
  }
}
