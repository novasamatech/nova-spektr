import { createChunkedRequest } from '../lib/createChunkedRequest';
import {
  type SubsquareFullReferendum,
  type SubsquareReferendumListResponse,
  type SubsquareReferendumVote,
  type SubsquareSimpleReferendum,
} from '../lib/types';

type ChunkDataCallback<T> = (chunk: T, done: boolean) => unknown;

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
  limit?: number;
};

const fetchReferendumList = async (
  { network, limit = Number.MAX_SAFE_INTEGER }: FetchReferendumListParams,
  callback?: ChunkDataCallback<SubsquareSimpleReferendum[]>,
): Promise<SubsquareSimpleReferendum[]> => {
  const pageSize = Math.min(100, limit);

  const getApiUrl = (page: number, size: number) => {
    return createURL(network, '/api/gov2/referendums', {
      page,
      page_size: size,
      simple: 'true',
    });
  };

  const requestParams = { method: 'GET' };

  return createChunkedRequest<SubsquareReferendumListResponse, SubsquareSimpleReferendum>({
    makeRequest: (index) => fetch(getApiUrl(index + 1, pageSize), requestParams).then((res) => res.json()),
    getRecords: (res) => res.items,
    getTotalRequests: (res) => Math.ceil(Math.min(res.total, limit) / pageSize),
    chunkSize: 5,
    callback,
  });
};

type FetchReferendumParams = {
  network: string;
  referendumId: string;
};

const fetchReferendum = async ({ network, referendumId }: FetchReferendumParams): Promise<SubsquareFullReferendum> => {
  const url = createURL(network, `/api/gov2/referendums/${referendumId}`);

  return fetch(url, { method: 'GET' }).then((r) => r.json());
};

type FetchVotesParams = {
  network: string;
  referendumId: string;
};

const fetchReferendumVotes = async (
  { network, referendumId }: FetchVotesParams,
  callback?: ChunkDataCallback<SubsquareReferendumVote[]>,
): Promise<SubsquareReferendumVote[]> => {
  const url = createURL(network, `/api/gov2/referenda/${referendumId}/votes`);

  return fetch(url, { method: 'GET' })
    .then((r) => r.json())
    .then((votes: SubsquareReferendumVote[]) => {
      callback?.(votes, true);

      return votes;
    });
};

export const subsquareApiService = {
  fetchReferendum,
  fetchReferendumList,
  fetchReferendumVotes,
};
