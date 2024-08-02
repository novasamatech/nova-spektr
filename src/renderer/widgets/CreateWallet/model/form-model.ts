import { combine } from 'effector';
import { createForm } from 'effector-forms';

import chains from '@shared/config/chains/chains.json';
import { type Chain, CryptoType, type MultisigAccount } from '@shared/core';
import { toAccountId } from '@shared/lib/utils';
import { networkUtils } from '@entities/network';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { type FormParams } from '../lib/types';

import { signatoryModel } from './signatory-model';

const $createMultisigForm = createForm<FormParams>({
  fields: {
    threshold: {
      init: 0,
      rules: [
        {
          name: 'moreOrEqualToTwo',
          validator: (threshold) => threshold >= 2,
        },
      ],
    },
    chain: {
      init: chains[0] as Chain,
    },
    name: {
      init: '',
      rules: [
        {
          name: 'notEmpty',
          validator: (name) => name !== '',
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const $multisigAccountId = combine(
  {
    formValues: $createMultisigForm.$values,
    signatories: signatoryModel.$signatories,
  },
  ({ formValues: { threshold, chain }, signatories }) => {
    if (!threshold) return null;

    const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

    return accountUtils.getMultisigAccountId(
      Array.from(signatories.values()).map((s) => toAccountId(s.address)),
      threshold,
      cryptoType,
    );
  },
);

const $multisigAlreadyExists = combine(
  { wallets: walletModel.$wallets, multisigAccountId: $multisigAccountId, formValues: $createMultisigForm.$values },
  ({ multisigAccountId, wallets, formValues: { chain } }) =>
    !!walletUtils.getWalletFilteredAccounts(wallets, {
      walletFn: (w) => walletUtils.isMultisig(w),
      accountFn: (multisigAccount) => {
        const isSameAccountId = multisigAccount.accountId === multisigAccountId;
        const chainId = (multisigAccount as MultisigAccount).chainId;
        const isSameChainId = !chainId || chainId === chain.chainId;

        return isSameAccountId && isSameChainId;
      },
    }),
  { skipVoid: false },
);

const $availableAccounts = combine(
  {
    wallets: walletModel.$wallets,
    formValues: $createMultisigForm.$values,
  },
  ({ formValues: { chain }, wallets }) => {
    if (!chain) return [];

    const filteredAccounts = walletUtils.getAccountsBy(wallets, (a, w) => {
      const isValidWallet = !walletUtils.isWatchOnly(w) && !walletUtils.isProxied(w) && !walletUtils.isMultisig(w);
      const isChainMatch = accountUtils.isChainAndCryptoMatch(a, chain);

      return isValidWallet && isChainMatch;
    });

    const baseAccounts = filteredAccounts.filter((a) => accountUtils.isBaseAccount(a) && a.name);

    return [...filteredAccounts, ...baseAccounts];
  },
);

export const formModel = {
  $createMultisigForm,
  $multisigAccountId,
  $multisigAlreadyExists,
  $availableAccounts,
  output: {
    formSubmitted: $createMultisigForm.formValidated,
  },
};
