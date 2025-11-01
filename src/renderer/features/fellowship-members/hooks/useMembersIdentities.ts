import { type ChainId } from '@/shared/core';
import { type Member } from '@/domains/collectives';

import { useIdentities } from './useIdentities';

export const useMembersIdentities = (members: Member[], chainId?: ChainId) => {
  return useIdentities(
    members.map(member => member.accountId),
    chainId,
  );
};
