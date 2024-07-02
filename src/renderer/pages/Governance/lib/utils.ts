import { ChainId, ReferendumId } from '@shared/core';
import { includes } from '@shared/lib/utils';

type ReferendumMap<T> = Map<ReferendumId, T>;
type Props<T> = {
  referendums: ReferendumMap<T>;
  query: string;
  details: Record<ChainId, Record<ReferendumId, string>>;
  chainId: ChainId;
};

export function filterReferendums<T>({ referendums, query, details, chainId }: Props<T>): ReferendumMap<T> {
  if (!query || referendums.size === 0) return referendums;

  const filteredReferendums = Array.from(referendums.entries()).filter(([key]) => {
    const title = details[chainId]?.[key];
    const hasIndex = includes(key, query);
    const hasTitle = includes(title, query);

    return hasIndex || hasTitle;
  });

  return new Map(filteredReferendums);
}
