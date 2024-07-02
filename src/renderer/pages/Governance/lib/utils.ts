import { ChainId, ReferendumId } from '@shared/core';
import { includes } from '@shared/lib/utils';

type ReferendumMap<T> = Record<ReferendumId, T>;
type Props<T> = {
  referendums: ReferendumMap<T>;
  query: string;
  titles: Record<ChainId, Record<ReferendumId, string>>;
  chainId: ChainId;
};

export function filterReferendums<T>({ referendums, query, titles, chainId }: Props<T>): ReferendumMap<T> {
  if (!query || referendums.size === 0) {
    return referendums;
  }

  const filteredReferendums = Object.entries(referendums).filter(([key]) => {
    const title = titles[chainId]?.[key];
    const hasIndex = includes(key, query);
    const hasTitle = includes(title, query);

    return hasIndex || hasTitle;
  });

  return Object.fromEntries(filteredReferendums);
}
