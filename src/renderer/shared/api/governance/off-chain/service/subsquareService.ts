import { dictionary } from '@shared/lib/utils';
import type { ChainId } from '@shared/core';
import type { IGovernanceApi } from '../lib/types';
import { offChainUtils } from '../lib/off-chain-utils';

// TODO: use callback to return the data, instead of waiting all at once
export const subsquareService: IGovernanceApi = {
  getReferendumList,
  getReferendumDetails,
};

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
 * @param chainId chainId value
 * @param callback returns portions of data
 */
async function getReferendumList(chainId: ChainId, callback: (data: Record<string, string>) => void) {
  const chainName = offChainUtils.getChainName(chainId);

  if (chainName) {
    const getApiUrl = (chainName: string, page: number, size = 100): string => {
      return `https://${chainName}.subsquare.io/api/gov2/referendums?page=${page}&page_size=${size}&simple=true`;
    };

    fetch(getApiUrl(chainName, 1), { method: 'GET' })
      .then((res) => res.json())
      .then((ping: SubsquareData) => {
        callback(dictionary(ping.items, 'referendumIndex', (item) => item.title));

        for (let index = 2; index <= Math.ceil(ping.total / 100); index++) {
          fetch(getApiUrl(chainName, index), { method: 'GET' })
            .then((res) => res.json())
            .then((data: SubsquareData) => {
              callback(dictionary(data.items, 'referendumIndex', (item) => item.title));
            });
        }
      });
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
