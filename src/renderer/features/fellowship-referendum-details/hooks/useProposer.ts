import { nonNullable } from '@/shared/lib/utils';
import { type Referendum, referendumService } from '@/domains/collectives';

export const useProposer = (referendum: Referendum | null) => {
  return nonNullable(referendum) ? referendumService.getProposer(referendum) : null;
};
