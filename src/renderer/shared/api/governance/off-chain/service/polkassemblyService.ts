import type { Chain } from '@shared/core';
import type { IGovernanceApi } from '../lib/types';
import { dictionary } from '@shared/lib/utils';

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
 * @param chain
 * @param callback returns portions of data
 */
const getReferendumList: IGovernanceApi['getReferendumList'] = async (chain, callback) => {
  const chainName = chain.specName;

  if (chainName) {
    const getApiUrl = (page: number, size = 100) => {
      return `https://api.polkassembly.io/api/v1/listing/on-chain-posts?proposalType=referendums_v2&page=${page}&listingLimit=${size}&sortBy=newest`;
    };

    const headers = new Headers();
    headers.append('x-network', chainName);
    headers.append('Cache-Control', 'public, max-age=600, must-revalidate');

    fetch(getApiUrl(1), { method: 'GET', headers })
      .then((res) => res.json())
      .then((ping: PolkassemblyData) => {
        const totalPages = Math.ceil(ping.count / 100);

        callback(
          dictionary(ping.posts, 'post_id', (item) => item.title),
          totalPages === 1,
        );

        for (let index = 2; index <= totalPages; index++) {
          fetch(getApiUrl(index), { method: 'GET', headers })
            .then((res) => res.json())
            .then((data: PolkassemblyData) => {
              callback(
                dictionary(data.posts, 'post_id', (item) => item.title),
                index === totalPages - 1,
              );
            });
        }
      });
  }
};

/**
 * Request referendum details
 * @param chain chainId value
 * @param index referendum index
 * @return {Promise}
 */
async function getReferendumDetails(chain: Chain, index: string): Promise<string | undefined> {
  const chainName = chain.specName;
  if (!chainName) return undefined;

  try {
    const headers = new Headers();
    headers.append('x-network', chainName);
    headers.append('Cache-Control', 'public, max-age=600, must-revalidate');

    const apiUrl = `https://api.polkassembly.io/api/v1/posts/on-chain-post?proposalType=referendums_v2&postId=${index}`;

    const details = await (await fetch(apiUrl, { method: 'GET', headers })).json();

    return details.content;
  } catch {
    return undefined;
  }
}

// TODO: use callback to return the data, instead of waiting all at once
export const polkassemblyService: IGovernanceApi = {
  getReferendumList,
  getReferendumDetails,
};
