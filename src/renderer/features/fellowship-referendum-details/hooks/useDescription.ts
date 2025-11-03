import { nonNullable } from '@/shared/lib/utils';
import { type Referendum, referendumService } from '@/domains/collectives';

import { useReferendumMetadata } from './useReferendumMeta';

export const useDescription = (referendum: Referendum | null) => {
  const { data: metadata } = useReferendumMetadata(referendum);

  let description;

  if (nonNullable(referendum) && referendumService.isOngoing(referendum) && referendum.proposal) {
    if (referendum.proposal.type === 'Unknown') {
      description = referendum.proposal.description;
    }
  } else {
    description = metadata?.description ?? null;
  }

  return { data: description, pending };
};
