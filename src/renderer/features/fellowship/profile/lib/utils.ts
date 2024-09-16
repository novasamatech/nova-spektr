import { type Chain, type Wallet } from '@shared/core';
import { type Member } from '@/domains/collectives/models/members';
import { accountUtils } from '@/entities/wallet';

export const profileUtils = {
  findMachingAccount,
};

function findMachingAccount(wallet: Wallet, members: Member[], chain: Chain) {
  const walletAccounts = wallet.accounts.filter((account) => {
    if (!accountUtils.isNonBaseVaultAccount(account, wallet)) return false;

    return accountUtils.isChainAndCryptoMatch(account, chain);
  });

  return members.find((member) => walletAccounts.some((account) => account.accountId === member.accountId));
}
