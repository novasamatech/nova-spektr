import { createAsyncTaskPool } from '../../substrate-helpers';
import {
  type PolkassemblyDetailedPost,
  type PolkassemblyListingPost,
  type PolkassemblyPostVote,
  type PolkassemblyPostVotesResponse,
  type PolkassemblyProposalType,
  type PolkassemblyTrackStatus,
  type PolkassemblyVoteType,
} from '../lib/types';

type ChunkDataCallback<T> = (chunk: T, done: boolean) => unknown;

const polkassemblyRequestPool = createAsyncTaskPool({
  retryCount: 4,
  poolSize: 2,
  retryDelay: 150,
});

const origin = 'https://api.polkassembly.io';

const createURL = (href: string, query?: Record<string, string | number | undefined>) => {
  const url = new URL(href, origin);
  if (query) {
    for (const [name, value] of Object.entries(query)) {
      if (typeof value !== 'undefined') {
        url.searchParams.set(name, value.toString());
      }
    }
  }

  return url;
};

const createHeaders = (network: string) => {
  const headers = new Headers();
  headers.append('x-network', network);

  return headers;
};

type PostListingParams = {
  network: string;
  proposalType: PolkassemblyProposalType;
  trackNo?: number;
  trackStatus?: PolkassemblyTrackStatus;
  sortBy?: 'commented' | 'newest' | 'oldest';
  limit?: number;
};

async function* fetchPostsList({
  network,
  trackStatus,
  trackNo,
  proposalType,
  sortBy,
  limit = Number.MAX_SAFE_INTEGER,
}: PostListingParams) {
  const pageSize = Math.min(100, limit);

  const getApiUrl = (page: number, size: number) => {
    return createURL('/api/v1/listing/on-chain-posts', {
      proposalType,
      trackNo,
      trackStatus,
      page,
      listingLimit: size,
      sortBy,
    });
  };

  const requestParams = { method: 'GET', headers: createHeaders(network) };

  const request = (page: number): Promise<{ count: number; posts: PolkassemblyListingPost[] }> =>
    polkassemblyRequestPool.call(() => fetch(getApiUrl(page, pageSize), requestParams).then((res) => res.json()));

  const firstPage = await request(1);
  yield firstPage.posts;

  if (firstPage.count < pageSize) {
    return;
  }

  const totalRequests = Math.ceil(firstPage.count / pageSize) + 1;
  for (let pageNumber = 2; pageNumber < totalRequests; pageNumber++) {
    yield request(pageNumber).then((x) => x.posts);
  }
}

type FetchPostParams = {
  network: string;
  proposalType: PolkassemblyProposalType;
  postId: string;
};

async function fetchPost({ network, postId, proposalType }: FetchPostParams): Promise<PolkassemblyDetailedPost> {
  const url = createURL('/api/v1/posts/on-chain-post', {
    proposalType,
    postId,
  });

  return polkassemblyRequestPool.call(() =>
    fetch(url, { method: 'GET', headers: createHeaders(network) }).then((r) => r.json()),
  );
}

type FetchPostVotesParams = {
  network: string;
  postId: string;
  voteType: PolkassemblyVoteType;
  sortBy?: 'balance' | 'time';
  limit?: number;
};

const fetchPostVotes = async (
  { network, postId, voteType, sortBy, limit = Number.MAX_SAFE_INTEGER }: FetchPostVotesParams,
  callback?: ChunkDataCallback<PolkassemblyPostVote[]>,
): Promise<PolkassemblyPostVote[]> => {
  const pageSize = Math.min(50, limit);

  const getApiUrl = (page: number, size: number) => {
    return createURL('/api/v1/votes', {
      postId,
      voteType,
      page,
      listingLimit: size,
      sortBy,
    });
  };

  const requestParams = { method: 'GET', headers: createHeaders(network) };
  let result: PolkassemblyPostVote[] = [];

  const createRequest = async (page: number): Promise<PolkassemblyPostVote[]> => {
    const res: PolkassemblyPostVotesResponse = await fetch(getApiUrl(page, pageSize), requestParams).then((res) =>
      res.json(),
    );
    const data = res.abstain.votes.concat(res.yes.votes, res.no.votes);
    const shouldContinue = res.abstain.count + res.yes.count + res.no.count === pageSize;

    result = result.concat(data);
    callback?.(data, !shouldContinue);

    if (!shouldContinue) {
      return result;
    }

    return createRequest(page + 1);
  };

  return createRequest(1);
};

export const polkassemblyApiService = {
  fetchPost,
  fetchPostsList,
  fetchPostVotes,
};
