import { nonNullable } from '@/shared/lib/utils';
import { type Referendum, referendumService } from '@/domains/collectives';

import { useMetadata } from './useReferendumMeta';

export const useDescription = (referendum: Referendum | null) => {
  const { data: metadata } = useMetadata(referendum);

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
