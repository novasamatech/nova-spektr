import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type BlockHeight } from '@/shared/polkadotjs-schemas';
import {
  evidenceService,
  memberService,
  salaryService,
  useEvidencePeriod,
  useEvidences,
  useMembers,
  useSalaries,
  useSalaryClaimStatusResource,
  useTracks,
  useVotes,
} from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { useFellowshipApi, useFellowshipBlock, useFellowshipChain } from '@/aggregates/fellowship-network';
import { walletSelect } from '@/aggregates/wallet-select';

const useChainAccounts = () => {
  const chain = useFellowshipChain();
  const availableAccounts = useUnit(walletModel.$availableAccounts);

  const accounts = useMemo(() => {
    return nonNullable(chain) ? accountService.filterAccountsOnChain(availableAccounts, chain) : [];
  }, [chain, availableAccounts]);

  return accounts;
};

export const useFellowshipMember = () => {
  const api = useFellowshipApi();
  const accounts = useChainAccounts();
  const walletId = useUnit(walletSelect.$selectedWalletId);
  const { data: members, pending } = useMembers({ palletType: 'fellowship', api });

  const member = useMemo(() => {
    return memberService.findMatchingMember(accounts, members, walletId);
  }, [accounts, members, walletId]);

  return { data: member, pending };
};

export const useFellowshipAccount = () => {
  const walletId = useUnit(walletSelect.$selectedWalletId);
  const accounts = useChainAccounts();
  const { data: member, pending: pendingMember } = useFellowshipMember();

  const account = useMemo(() => {
    return member ? memberService.findMatchingAccount(accounts, member, walletId) : null;
  }, [accounts, member, walletId]);

  return { data: account, pending: pendingMember };
};

export const useFellowshipWallet = () => {
  const { data: account, pending } = useFellowshipAccount();
  const wallets = useUnit(walletModel.$wallets);

  const wallet = useMemo(() => {
    return account ? wallets.find(w => w.id === account.walletId) : null;
  }, [account, wallets]);

  return { data: wallet, pending };
};

export const useFellowshipMemberSalary = () => {
  const api = useFellowshipApi();
  const { data: salaries, pending: pendingSalaries } = useSalaries({ palletType: 'fellowship', api });
  const { data: member, pending: pendingMember } = useFellowshipMember();

  const salary = useMemo(() => {
    if (nullable(member) || nullable(salaries)) {
      return null;
    }

    return salaryService.getMemberSalary(member, salaries);
  }, [member, salaries]);

  return {
    data: salary,
    pending: pendingSalaries || pendingMember,
  };
};

export const useFellowshipMemberLeftToDemotion = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: member, pending: memberPending } = useFellowshipMember();
  const { data: periods, pending: periodsPending } = useEvidencePeriod({ palletType: 'fellowship', api, chain });
  const { data: block, pending: blockPending } = useFellowshipBlock();

  let data: BlockHeight | null = null;
  if (nonNullable(block) && nonNullable(periods) && nonNullable(member)) {
    data = evidenceService.getBlocksUntilDemotion(member, periods, block);
  }

  return {
    data,
    pending: memberPending || blockPending || periodsPending,
  };
};

export const useFellowshipMemberLeftToPromotion = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: member, pending: memberPending } = useFellowshipMember();
  const { data: periods, pending: periodsPending } = useEvidencePeriod({ palletType: 'fellowship', api, chain });
  const { data: block, pending: blockPending } = useFellowshipBlock();

  let data: BlockHeight | null = null;
  if (nonNullable(block) && nonNullable(periods) && nonNullable(member) && memberService.isCoreMember(member)) {
    data = evidenceService.getBlockUntilNextPromotion(member, periods, block);
  }

  return {
    data,
    pending: memberPending || blockPending || periodsPending,
  };
};

export const useFellowshipMemberEndPromotionBlock = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: member, pending: memberPending } = useFellowshipMember();
  const { data: periods, pending: periodsPending } = useEvidencePeriod({ palletType: 'fellowship', api, chain });

  let data: BlockHeight | null = null;
  if (nonNullable(periods) && nonNullable(member) && memberService.isCoreMember(member)) {
    data = evidenceService.getEndPromotionBlock(member, periods);
  }

  return {
    data,
    pending: memberPending || periodsPending,
  };
};

export const useFellowshipMemberEndDemotionBlock = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: member, pending: memberPending } = useFellowshipMember();
  const { data: periods, pending: periodsPending } = useEvidencePeriod({ palletType: 'fellowship', api, chain });

  let data: BlockHeight | null = null;
  if (nonNullable(periods) && nonNullable(member) && memberService.isCoreMember(member)) {
    data = evidenceService.getEndDemotionBlock(member, periods);
  }

  return {
    data,
    pending: memberPending || periodsPending,
  };
};

export const useFellowshipMemberEvidence = () => {
  const api = useFellowshipApi();
  const { data: member, pending: pendingMember } = useFellowshipMember();
  const { data: evidences, pending: pendingEvidence } = useEvidences({
    palletType: 'fellowship',
    api,
    accounts: member ? [member.accountId] : null,
  });

  const evidence = useMemo(() => {
    if (nullable(member)) return null;
    return evidences.find(x => x.accountId === member.accountId) ?? null;
  }, [evidences, member]);

  return { data: evidence, pending: pendingMember || pendingEvidence };
};

export const useFellowshipMemberSalaryClaimStatus = () => {
  const api = useFellowshipApi();
  const { data: member, pending: pendingMember } = useFellowshipMember();
  const { data: claimStatuses, pending: pendingClaimStatus } = useSalaryClaimStatusResource({
    palletType: 'fellowship',
    api,
    accounts: member ? [member.accountId] : null,
  });

  const claimStatus = nonNullable(member) ? (claimStatuses[member.accountId] ?? null) : null;

  return { data: claimStatus, pending: pendingMember || pendingClaimStatus };
};

export const useFellowshipMemberVotes = (referendums: ReferendumId[]) => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: member, pending: pendingMember } = useFellowshipMember();
  const { data: votes, pending: pendingVotes } = useVotes({
    palletType: 'fellowship',
    api,
    chain,
    accounts: member ? [member.accountId] : null,
    referendums,
  });

  return { data: votes, pending: pendingMember || pendingVotes };
};

export const useFellowshipMemberCurrentTrack = () => {
  const api = useFellowshipApi();
  const { data: tracks, pending: pendingTracks } = useTracks({ palletType: 'fellowship', api });
  const { data: member, pending: pendingMember } = useFellowshipMember();

  const track = useMemo(() => {
    if (nullable(member)) return null;
    return tracks.find(t => t.id === member.rank) ?? null;
  }, [tracks, member]);

  return { data: track, pending: pendingTracks || pendingMember };
};

export const useFellowshipMemberNextTrack = () => {
  const api = useFellowshipApi();
  const { data: tracks, pending: pendingTracks } = useTracks({ palletType: 'fellowship', api });
  const { data: member, pending: pendingMember } = useFellowshipMember();

  const track = useMemo(() => {
    if (nullable(member)) return null;
    const index = tracks.findIndex(t => t.id === member.rank);
    return tracks.at(index + 1) ?? null;
  }, [tracks, member]);

  return { data: track, pending: pendingTracks || pendingMember };
};
