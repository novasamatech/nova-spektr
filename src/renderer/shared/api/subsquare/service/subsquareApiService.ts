import { createAsyncTaskPool } from '../../substrate-helpers';
import {
  type SubsquareFullReferendum,
  type SubsquareReferendumListResponse,
  type SubsquareReferendumVote,
} from '../lib/types';

type ReferendumType = 'gov2' | 'fellowship';

const subsquareRequestPool = createAsyncTaskPool({
  retryCount: 3,
  poolSize: 5,
  retryDelay: 100,
});

const createURL = (network: string, href: string, query?: Record<string, string | number | undefined>) => {
  const url = new URL(href, `https://${network}.subsquare.io`);
  if (query) {
    for (const [name, value] of Object.entries(query)) {
      if (typeof value !== 'undefined') {
        url.searchParams.set(name, value.toString());
      }
    }
  }

  return url;
};

type FetchReferendumListParams = {
  network: string;
  referendumType: ReferendumType;
  limit?: number;
};

async function* fetchReferendumList({
  network,
  referendumType,
  limit = Number.MAX_SAFE_INTEGER,
}: FetchReferendumListParams) {
  const pageSize = Math.min(100, limit);

  const getApiUrl = (page: number, size: number) => {
    return createURL(
      network,
      `/api/${referendumType === 'fellowship' ? `${referendumType}/referenda` : `${referendumType}/referendums`}`,
      {
        page,
        page_size: size,
      },
    );
  };

  const request = (page: number): Promise<SubsquareReferendumListResponse> =>
    subsquareRequestPool.call(() => fetch(getApiUrl(page, pageSize), { method: 'GET' }).then((res) => res.json()));

  const firstPage = await request(1);
  yield firstPage.items;

  if (firstPage.total < pageSize) {
    return;
  }

  const totalRequests = Math.ceil(firstPage.total / pageSize) + 1;
  for (let pageNumber = 2; pageNumber < totalRequests; pageNumber++) {
    yield request(pageNumber).then((x) => x.items);
  }
}

type FetchReferendumParams = {
  network: string;
  referendumType: ReferendumType;
  referendumId: string;
};

const fetchReferendum = async ({
  network,
  referendumType,
  referendumId,
}: FetchReferendumParams): Promise<SubsquareFullReferendum> => {
  const url = createURL(
    network,
    `/api/${referendumType === 'fellowship' ? `${referendumType}/referenda/${referendumId}` : `${referendumType}/referendums/${referendumId}`}`,
  );

  return subsquareRequestPool.call(() => fetch(url, { method: 'GET' }).then((r) => r.json()));
};

type FetchVotesParams = {
  network: string;
  referendumType: ReferendumType;
  referendumId: string;
};

const fetchReferendumVotes = async ({
  network,
  referendumType,
  referendumId,
}: FetchVotesParams): Promise<SubsquareReferendumVote[]> => {
  const url = createURL(network, `/api/${referendumType}/referenda/${referendumId}/votes`);

  return subsquareRequestPool.call(() => fetch(url, { method: 'GET' }).then((r) => r.json()));
};

export const subsquareApiService = {
  fetchReferendum,
  fetchReferendumList,
  fetchReferendumVotes,
};
