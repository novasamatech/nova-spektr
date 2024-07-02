import { dictionary } from '@shared/lib/utils';
import type { Chain } from '@shared/core';
import type { IGovernanceApi } from '../lib/types';

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

  if (chainName) {
    const getApiUrl = (chainName: string, page: number, size = 100): string => {
      return `https://${chainName}.subsquare.io/api/gov2/referendums?page=${page}&page_size=${size}&simple=true`;
    };

    fetch(getApiUrl(chainName, 1), { method: 'GET' })
      .then((res) => res.json())
      .then((ping: SubsquareData) => {
        const totalPages = Math.ceil(ping.total / 100);

        callback(
          dictionary(ping.items, 'referendumIndex', (item) => item.title),
          totalPages === 1,
        );

        for (let index = 2; index <= totalPages; index++) {
          fetch(getApiUrl(chainName, index), { method: 'GET' })
            .then((res) => res.json())
            .then((data: SubsquareData) => {
              callback(
                dictionary(data.items, 'referendumIndex', (item) => item.title),
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
