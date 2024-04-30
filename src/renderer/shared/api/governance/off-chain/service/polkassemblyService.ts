import { isFulfilled, dictionary } from '@shared/lib/utils';
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

    const requests = Array.from({ length: iterations }, (_, index) => {
      return fetch(getApiUrl(index + 1), { method: 'GET', headers });
    });
    const responses = await Promise.allSettled(requests);
    const dataRequests = responses.filter(isFulfilled).map((res) => res.value.json());
    const dataResponses = await Promise.all(dataRequests);
    const referendums = [...ping.posts, ...dataResponses.flatMap((ref) => ref.posts)];

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
async function getReferendumDetails(chainId: ChainId, index: number): Promise<unknown | undefined> {
  const chainName = offChainUtils.getChainName(chainId);
  if (!chainName) return undefined;

  try {
    const headers = new Headers();
    headers.append('x-network', chainName);
    const apiUrl = `https://api.polkassembly.io/api/v1/posts/on-chain-post?proposalType=referendums_v2&postId=${index}`;

    return (await fetch(apiUrl)).json();
  } catch {
    return undefined;
  }
}
