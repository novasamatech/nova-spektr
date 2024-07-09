import { createChunkedRequest } from '../lib/createChunkedRequest';
import { ListingOnChainPost, DetailedOnChainPost, ProposalType, TrackStatus } from '../lib/types';

type ChunkDataCallback<T> = (chunk: T[], done: boolean) => unknown;

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

type ListingOnChainPostsParams = {
  network: string;
  proposalType: ProposalType;
  trackNo?: number;
  trackStatus?: TrackStatus;
  sortBy?: 'commented' | 'newest' | 'oldest';
  limit?: number;
};

const fetchListingOnChainPosts = async (
  { network, trackStatus, trackNo, proposalType, sortBy, limit = Number.MAX_SAFE_INTEGER }: ListingOnChainPostsParams,
  callback?: ChunkDataCallback<ListingOnChainPost>,
): Promise<ListingOnChainPost[]> => {
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

  return createChunkedRequest<
    {
      count: number;
      posts: ListingOnChainPost[];
    },
    ListingOnChainPost
  >({
    makeRequest: (index) => fetch(getApiUrl(index + 1, pageSize), requestParams).then((res) => res.json()),
    getRecords: (res) => res.posts,
    getTotalRequests: (res) => Math.ceil(Math.min(res.count, limit) / pageSize),
    chunkSize: 5,
    callback,
  });
};

type OnChainPostParams = {
  network: string;
  proposalType: ProposalType;
  postId: string;
};

async function fetchOnChainPost({ network, postId, proposalType }: OnChainPostParams): Promise<DetailedOnChainPost> {
  const url = createURL('/api/v1/posts/on-chain-post', {
    proposalType,
    postId,
  });

  return fetch(url, { method: 'GET', headers: createHeaders(network) }).then((r) => r.json());
}

export const polkassemblyApiService = {
  fetchOnChainPost,
  fetchListingOnChainPosts,
};
