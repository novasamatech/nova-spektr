import { combine } from 'effector';

import { member, memberService } from '@/domains/collectives';
import { accountService } from '@/domains/network';
import { walletModel } from '@/entities/wallet';
import { fellowshipNetwork } from '@/aggregates/fellowship-network';
import { walletSelect } from '@/aggregates/wallet-select';

const $fellowshipMembers = member.membersSubscriptionResource.$cache.map(members => members['fellowship'] ?? {});
const $chainMembers = combine(fellowshipNetwork.$network, $fellowshipMembers, (network, members) =>
  network ? (members[network.chainId] ?? []) : [],
);

const $accounts = combine(fellowshipNetwork.$network, walletModel.$availableAccounts, (network, accounts) =>
  network ? accountService.filterAccountsOnChain(accounts, network.chain) : [],
);

const $currentMember = combine(
  {
    accounts: $accounts,
    walletId: walletSelect.$selectedWalletId,
    members: $chainMembers,
  },
  ({ accounts, walletId, members }) => memberService.findMatchingMember(accounts, members, walletId),
);

const $currentMemberAccount = combine(
  {
    accounts: $accounts,
    member: $currentMember,
    walletId: walletSelect.$selectedWalletId,
  },
  ({ accounts, walletId, member }) => (member ? memberService.findMatchingAccount(accounts, member, walletId) : null),
);

const $currentMemberWallet = combine(
  {
    account: $currentMemberAccount,
    wallets: walletModel.$wallets,
  },
  ({ account, wallets }) => (account ? wallets.find(w => w.id === account.walletId) : null),
);

export const fellowshipMember = {
  $chainMembers,
  $currentMember,
  $currentMemberAccount,
  $currentMemberWallet,
};
