import type { ChainId } from '@shared/core';
import { dictionary } from '@shared/lib/utils';
import type { IGovernanceApi } from '../lib/types';
import { offChainUtils } from '../lib/off-chain-utils';

export const polkassemblyService: IGovernanceApi = {
  getReferendumList,
  getReferendumDetails,
};

type PolkassemblyData = {
  count: number;
  posts: {
    title: string;
    post_id: string;
  }[];
};
/**
 * Request referendum list without details 100 units of data each round
 * Ping their API to check "total" referendums and request remaining with Promise.allSettled
 * @param chainId chainId value
 * @param callback returns portions of data
 */
async function getReferendumList(chainId: ChainId, callback: (data: Record<string, string>) => void) {
  const chainName = offChainUtils.getChainName(chainId);

  if (chainName) {
    const getApiUrl = (page: number, size = 100): string => {
      return `https://api.polkassembly.io/api/v1/listing/on-chain-posts?proposalType=referendums_v2&page=${page}&listingLimit=${size}`;
    };
    const headers = new Headers();
    headers.append('x-network', chainName);
    headers.append('Cache-Control', 'public, max-age=600, must-revalidate');

    fetch(getApiUrl(1), { method: 'GET', headers })
      .then((res) => res.json())
      .then((ping: PolkassemblyData) => {
        callback(parsePolkassemblyData(ping));

        for (let index = 2; index <= Math.ceil(ping.count / 100); index++) {
          fetch(getApiUrl(index), { method: 'GET', headers })
            .then((res) => res.json())
            .then((data: PolkassemblyData) => callback(parsePolkassemblyData(data)));
        }
      });
  }
}

function parsePolkassemblyData(data: PolkassemblyData): Record<string, string> {
  return dictionary(data.posts, 'post_id', (item) => item.title);
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
    headers.append('Cache-Control', 'public, max-age=600, must-revalidate');

    const apiUrl = `https://api.polkassembly.io/api/v1/posts/on-chain-post?proposalType=referendums_v2&postId=${index}`;

    const details = await (await fetch(apiUrl)).json();

    return details.content;
  } catch {
    return undefined;
  }
}
