import type { Chain, ReferendumId } from '@shared/core';
import type { IGovernanceApi } from '../lib/types';
import { dictionary } from '@shared/lib/utils';
import { polkassemblyApiService, ListingOnChainPost } from '../../../polkassembly';

/**
 * Request referendum list without details 100 units of data each round
 * Ping their API to check "total" referendums and request remaining with Promise.allSettled
 * @param chain
 * @param callback returns portions of data
 */
const getReferendumList: IGovernanceApi['getReferendumList'] = async (chain, callback) => {
  const chainName = chain.specName;

  return polkassemblyApiService
    .fetchListingOnChainPosts(
      {
        network: chainName,
        proposalType: 'referendums_v2',
      },
      (data, done) => {
        console.log({ data, after: parsePolkassemblyData(data) });
        callback(parsePolkassemblyData(data), done);
      },
    )
    .then(parsePolkassemblyData);
};

function parsePolkassemblyData(data: ListingOnChainPost[]) {
  return dictionary(data, 'post_id', (item) => item.title);
}

// /**
//  * Request referendum list without details 100 units of data each round
//  * Ping their API to check "total" referendums and request remaining with Promise.allSettled
//  * @param chain
//  * @param callback returns portions of data
//  */
// const getReferendumVotes: IGovernanceApi['getReferendumList'] = async (chain, callback) => {
//   const chainName = chain.specName;
//   const pageSize = 100;
//
//   if (chainName) {
//     const getApiUrl = (page: number, size = pageSize) => {
//       return createURL('/api/v1/votes', {
//         postId:
//       });
//
//       return new URL(`/api/v1/votes`, origin);
//     };
//
//     const headers = new Headers();
//     headers.append('x-network', chainName);
//     headers.append('Cache-Control', 'public, max-age=600, must-revalidate');
//
//     const ping: PolkassemblyData = await fetch(getApiUrl(1), { method: 'GET', headers }).then((r) => r.json());
//     const totalPages = Math.ceil(ping.count / pageSize);
//
//     callback(parsePolkassemblyData(ping), totalPages === 1);
//
//     return offChainUtils.createChunkedTasks({
//       items: Array.from({ length: totalPages - 1 }),
//       chunkSize: 6,
//       task: (_, index) => {
//         return fetch(getApiUrl(index + 2), { method: 'GET', headers })
//           .then((res) => res.json())
//           .then((data: PolkassemblyData) => {
//             callback(parsePolkassemblyData(data), index === totalPages - 1);
//           });
//       },
//     });
//   }
// };

/**
 * Request referendum details
 * @param chain
 * @param referendumId referendum index
 */
async function getReferendumDetails(chain: Chain, referendumId: ReferendumId): Promise<string | undefined> {
  const chainName = chain.specName;

  return polkassemblyApiService
    .fetchOnChainPost({
      network: chainName,
      postId: referendumId,
      proposalType: 'referendums_v2',
    })
    .then((r) => {
      console.log({ referendumId, data: r });

      return r.description ?? '';
    });
}

// TODO: use callback to return the data, instead of waiting all at once
export const polkassemblyService: IGovernanceApi = {
  getReferendumList,
  getReferendumDetails,
};
