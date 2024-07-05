import type { Chain, ReferendumId } from '@shared/core';
import type { IGovernanceApi } from '../lib/types';
import { dictionary } from '@shared/lib/utils';
import { offChainUtils } from '../lib/off-chain-utils';

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
  const pageSize = 100;

  if (chainName) {
    const getApiUrl = (page: number, size = pageSize) => {
      return `https://api.polkassembly.io/api/v1/listing/on-chain-posts?proposalType=referendums_v2&page=${page}&listingLimit=${size}&sortBy=newest`;
    };

    const headers = new Headers();
    headers.append('x-network', chainName);
    headers.append('Cache-Control', 'public, max-age=600, must-revalidate');

    const ping: PolkassemblyData = await fetch(getApiUrl(1), { method: 'GET', headers }).then((r) => r.json());
    const totalPages = Math.ceil(ping.count / pageSize);

    callback(parsePolkassemblyData(ping), totalPages === 1);

    return offChainUtils.createChunkedTasks({
      items: Array.from({ length: totalPages - 1 }),
      chunkSize: 6,
      task: (_, index) => {
        return fetch(getApiUrl(index + 2), { method: 'GET', headers })
          .then((res) => res.json())
          .then((data: PolkassemblyData) => {
            callback(parsePolkassemblyData(data), index === totalPages - 1);
          });
      },
    });
  }
};

function parsePolkassemblyData(data: PolkassemblyData) {
  return dictionary(data.posts, 'post_id', (item) => item.title);
}

/**
 * Request referendum details
 * @param chain
 * @param referendumId referendum index
 * @return {Promise}
 */
async function getReferendumDetails(chain: Chain, referendumId: ReferendumId): Promise<string | undefined> {
  const chainName = chain.specName;
  if (!chainName) return undefined;

  try {
    const headers = new Headers();
    headers.append('x-network', chainName);
    headers.append('Cache-Control', 'public, max-age=600, must-revalidate');

    const apiUrl = `https://api.polkassembly.io/api/v1/posts/on-chain-post?proposalType=referendums_v2&postId=${referendumId}`;

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
