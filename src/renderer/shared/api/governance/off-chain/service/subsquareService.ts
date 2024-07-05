import { dictionary } from '@shared/lib/utils';
import type { Chain } from '@shared/core';
import type { IGovernanceApi } from '../lib/types';
import { offChainUtils } from '../lib/off-chain-utils';

type SubsquareData = {
  total: number;
  items: {
    title: string;
    referendumIndex: string;
  }[];
};

/**
 * Request referendum list without details
 * Subsquare can give us only 100 units of data each round
 * Ping their API to check "total" referendums and request remaining with Promise.allSettled
 * @param chain chainId value
 * @param callback returns portions of data
 */
const getReferendumList: IGovernanceApi['getReferendumList'] = async (chain, callback) => {
  const chainName = chain.specName;
  const pageSize = 100;

  if (chainName) {
    const getApiUrl = (chainName: string, page: number, size = 100): string => {
      return `https://${chainName}.subsquare.io/api/gov2/referendums?page=${page}&page_size=${size}&simple=true`;
    };

    const ping: SubsquareData = await fetch(getApiUrl(chainName, 1, pageSize), {
      method: 'GET',
      mode: 'same-origin',
    }).then((r) => r.json());
    const totalPages = Math.ceil(ping.total / pageSize);

    callback(parseSubsquareData(ping), totalPages === 1);

    return offChainUtils.createChunkedTasks({
      items: Array.from({ length: totalPages - 1 }),
      chunkSize: 6,
      task: (_, index) => {
        return fetch(getApiUrl(chainName, index + 2, pageSize), { method: 'GET', mode: 'no-cors' })
          .then((res) => res.json())
          .then((data: SubsquareData) => {
            callback(parseSubsquareData(data), index === totalPages - 1);
          });
      },
    });
  }
};

function parseSubsquareData(data: SubsquareData) {
  return dictionary(data.items, 'referendumIndex', (item) => item.title);
}

/**
 * Request referendum details
 * @param chain chainId value
 * @param index referendum index
 * @return {Promise}
 */
async function getReferendumDetails(chain: Chain, index: string): Promise<string | undefined> {
  const chainName = chain.specName;
  if (!chainName) return undefined;

  const apiUrl = `https://${chainName}.subsquare.io/api/gov2/referendums/${index}`;

  try {
    const details = await fetch(apiUrl).then((r) => r.json());

    return details.content;
  } catch {
    return undefined;
  }
}

// TODO: use callback to return the data, instead of waiting all at once
export const subsquareService: IGovernanceApi = {
  getReferendumList,
  getReferendumDetails,
};
