import { Step } from './types';
import { walletUtils, accountUtils } from '@entities/wallet';
import { transactionService } from '@entities/transaction';
import { Wallet, Account, Chain } from '@shared/core';

export const payeeUtils = {
  isNoneStep,
  isInitStep,
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
  wallet: Wallet;
  wallets: Wallet[];
  account: Account;
  signatories: Account[];
};
function getTxWrappers({ chain, wallet, wallets, account, signatories }: TxWrapperParams) {
  const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
    walletFn: (w) => !walletUtils.isProxied(w) && !walletUtils.isWatchOnly(w),
    accountFn: (a, w) => {
      const isBase = accountUtils.isBaseAccount(a);
      const isPolkadotVault = walletUtils.isPolkadotVault(w);

      return (!isBase || !isPolkadotVault) && accountUtils.isChainAndCryptoMatch(a, chain);
    },
  });

  return transactionService.getTxWrappers({
    wallet,
    wallets: filteredWallets || [],
    account,
    signatories,
  });
}
