import { createQueuedRequest } from '@/shared/lib/utils';
import {
  type SubsquareFullReferendum,
  type SubsquareReferendumListResponse,
  type SubsquareReferendumVote,
} from '../lib/types';

type ReferendumType = 'gov2' | 'fellowship';
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
  referendumType: ReferendumType;
  limit?: number;
};

const fetchReferendumList = async (
  { network, referendumType, limit = Number.MAX_SAFE_INTEGER }: FetchReferendumListParams,
  callback?: ChunkDataCallback<SubsquareFullReferendum[]>,
): Promise<SubsquareFullReferendum[]> => {
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

  const requestParams = { method: 'GET' };

  return createQueuedRequest<SubsquareReferendumListResponse, SubsquareFullReferendum>({
    makeRequest: (index) => fetch(getApiUrl(index + 1, pageSize), requestParams).then((res) => res.json()),
    getRecords: (res) => res.items,
    getTotalRequests: (res) => Math.ceil(res.total / pageSize),
    callback,
  });
};

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
  const url = createURL(network, `/api/${referendumType}/referendums/${referendumId}`);

  return fetch(url, { method: 'GET' }).then((r) => r.json());
};

type FetchVotesParams = {
  network: string;
  referendumType: ReferendumType;
  referendumId: string;
};

const fetchReferendumVotes = async (
  { network, referendumType, referendumId }: FetchVotesParams,
  callback?: ChunkDataCallback<SubsquareReferendumVote[]>,
): Promise<SubsquareReferendumVote[]> => {
  const url = createURL(network, `/api/${referendumType}/referenda/${referendumId}/votes`);

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
