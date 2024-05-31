import { createForm } from 'effector-forms';
import { combine, createEvent, restore } from 'effector';

import { Chain, CryptoType, MultisigAccount } from '@shared/core';
import chains from '@shared/config/chains/chains.json';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { networkUtils } from '@entities/network';
import { ExtendedAccount, ExtendedContact } from '../ui/MultisigWallet/common/types';
import { FormParams } from '../lib/types';

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
          errorText: 'createMultisigAccount.disabledError.emptyName',
        },
      ],
    },
  },
  validateOn: ['submit'],
});

const reset = createEvent();
const accountSignatoriesChanged = createEvent<ExtendedAccount[]>();
const contactSignatoriesChanged = createEvent<ExtendedContact[]>();

const $accountSignatories = restore(accountSignatoriesChanged, []).reset(reset);
const $contactSignatories = restore(contactSignatoriesChanged, []).reset(reset);

const $signatories = combine(
  {
    accountSignatories: $accountSignatories,
    contactSignatories: $contactSignatories,
  },
  ({ accountSignatories, contactSignatories }) => [...accountSignatories, ...contactSignatories],
);

const $multisigAccountId = combine(
  {
    formValues: $createMultisigForm.$values,
    signatories: $signatories,
  },
  ({ formValues: { threshold, chain }, signatories }) => {
    if (!threshold) return null;

    const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

    return accountUtils.getMultisigAccountId(
      signatories.map((s) => s.accountId),
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

const $hasOwnSignatory = combine(
  { wallets: walletModel.$wallets, signatories: $signatories },
  ({ wallets, signatories }) =>
    !!walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isWatchOnly(w) && !walletUtils.isMultisig(w),
      accountFn: (a) => signatories.some((s) => s.accountId === a.accountId),
    })?.length,
);

export const formModel = {
  $createMultisigForm,
  $multisigAccountId,
  $multisigAlreadyExists,
  $availableAccounts,
  $signatories,
  $accountSignatories,
  $contactSignatories,
  $hasOwnSignatory,
  events: {
    contactSignatoriesChanged,
    accountSignatoriesChanged,
  },
};
