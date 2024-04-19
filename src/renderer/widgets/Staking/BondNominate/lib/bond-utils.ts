import { walletUtils, accountUtils } from '@entities/wallet';
import { dictionary } from '@shared/lib/utils';
import { transactionService } from '@entities/transaction';
import { Wallet, Account, Chain } from '@shared/core';
import { Step } from './types';

export const bondUtils = {
  isNoneStep,
  isInitStep,
  isValidatorsStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,

  getTxWrappers,
};

function isNoneStep(step: Step): boolean {
  return step === Step.NONE;
}

function isInitStep(step: Step): boolean {
  return step === Step.INIT;
}

function isValidatorsStep(step: Step): boolean {
  return step === Step.VALIDATORS;
}

function isConfirmStep(step: Step): boolean {
  return step === Step.CONFIRM;
}

function isSignStep(step: Step): boolean {
  return step === Step.SIGN;
}

function isSubmitStep(step: Step): boolean {
  return step === Step.SUBMIT;
}

type TxWrapperParams = {
  chain: Chain;
  wallet: Wallet_NEW;
  wallets: Wallet_NEW[];
  account: Account;
  accounts: Account[];
  signatories: Account[];
};
function getTxWrappers({ chain, wallet, wallets, account, accounts, signatories }: TxWrapperParams) {
  const walletFiltered = wallets.filter((wallet) => {
    return !walletUtils.isProxied(wallet) && !walletUtils.isWatchOnly(wallet);
  });
  const walletsMap = dictionary(walletFiltered, 'id');
  const chainFilteredAccounts = accounts.filter((account) => {
    if (accountUtils.isBaseAccount(account) && walletUtils.isPolkadotVault(walletsMap[account.walletId])) {
      return false;
    }

    return accountUtils.isChainAndCryptoMatch(account, chain);
  });

  return transactionService.getTxWrappers({
    wallet,
    wallets: walletFiltered,
    account,
    accounts: chainFilteredAccounts,
    signatories,
  });
}
