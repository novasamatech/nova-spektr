import { dictionary } from '@shared/lib/utils';
import type { ChainId } from '@shared/core';
import type { IGovernanceApi } from '../lib/types';
import { offChainUtils } from '../lib/off-chain-utils';

// TODO: use callback to return the data, instead of waiting all at once
export const polkassemblyService: IGovernanceApi = {
  getReferendumList,
  getReferendumDetails,
};

/**
 * Request referendum list without details 100 units of data each round
 * Ping their API to check "total" referendums and request remaining with Promise.allSettled
 * @param chainId chainId value
 * @return {Promise}
 */
async function getReferendumList(chainId: ChainId): Promise<Record<string, string>> {
  const chainName = offChainUtils.getChainName(chainId);
  if (!chainName) return {};

  const getApiUrl = (page: number, size = 100): string => {
    return `https://api.polkassembly.io/api/v1/listing/on-chain-posts?proposalType=referendums_v2&page=${page}&listingLimit=${size}`;
  };

  try {
    const headers = new Headers();
    headers.append('x-network', chainName);

    const ping = await (await fetch(getApiUrl(1, 1), { method: 'GET', headers })).json();
    const iterations = Math.ceil(ping.count / 100);
    const remainders = await offChainUtils.getRemainingReferendums(iterations, getApiUrl, { headers });
    const referendums = [...ping.posts, ...remainders.flatMap((r) => r.posts)];

    return dictionary(referendums, 'post_id', (item) => item.title);
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

  try {
    const headers = new Headers();
    headers.append('x-network', chainName);
    const apiUrl = `https://api.polkassembly.io/api/v1/posts/on-chain-post?proposalType=referendums_v2&postId=${index}`;

    const details = await (await fetch(apiUrl)).json();

    return details.content;
  } catch {
    return undefined;
  }
}
