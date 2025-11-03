import { useSalaryClaimStatusResource } from '@/domains/collectives';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useMemberSalaryClaimStatus = () => {
  const api = useFellowshipApi();
  const member = useFellowshipMember();
  const { data: claimStatuses, pending } = useSalaryClaimStatusResource({
    palletType: 'fellowship',
    api,
    accounts: member ? [member.accountId] : null,
  });

  return {
    data: member ? (claimStatuses[member.accountId] ?? null) : null,
    pending,
  };
};
