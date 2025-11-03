import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { nonNullable, nullable } from '@/shared/lib/utils';
import { memberService, salaryService, useMembers, useSalary } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';
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
  const { data: salaries, pending: pendingSalaries } = useSalary('fellowship', api);
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
