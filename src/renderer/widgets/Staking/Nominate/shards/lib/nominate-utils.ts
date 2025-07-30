import { type Account, type Chain, type Wallet } from '@/shared/core';
import { transactionService } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';

import { Step } from './types';

export const nominateUtils = {
  isNoneStep,
  isInitStep,
  isValidatorsStep,
  isConfirmStep,
  isSignStep,
  isSubmitStep,
  isBasketStep,

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

function isBasketStep(step: Step): boolean {
  return step === Step.BASKET;
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
      const isBase = accountUtils.isVaultBaseAccount(a);
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
