import { nonNullable } from '@/shared/lib/utils';
import { type Referendum, referendumService } from '@/domains/collectives';

import { useMetadata } from './useMetadata';

export const useDescription = (referendum: Referendum | null) => {
  const { data: metadata, pending } = useMetadata(referendum);

  let description = metadata?.description ?? null;

  if (
    nonNullable(referendum) &&
    referendumService.isOngoing(referendum) &&
    referendum.proposal?.type === 'Unknown' &&
    referendum.proposal.description
  ) {
    description = referendum.proposal.description;
  }

  return { data: description, pending };
};
