import { type Chain, type Wallet } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';
import { transactionService } from '@/entities/transaction';
import { accountUtils, walletUtils } from '@/entities/wallet';

import { Step } from './types';

export const bondNominateUtils = {
  isNoneStep: (step: Step): boolean => step === Step.NONE,
  isInitStep: (step: Step): boolean => step === Step.INIT,
  isValidatorsStep: (step: Step): boolean => step === Step.VALIDATORS,
  isConfirmStep: (step: Step): boolean => step === Step.CONFIRM,
  isSignStep: (step: Step): boolean => step === Step.SIGN,
  isSubmitStep: (step: Step): boolean => step === Step.SUBMIT,
  isBasketStep: (step: Step): boolean => step === Step.BASKET,

  getTxWrappers,
};

type TxWrapperParams = {
  chain: Chain;
  wallet: Wallet;
  wallets: Wallet[];
  account: AnyAccount;
  signatories: AnyAccount[];
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
