import { combine, sample } from 'effector';
import { createForm } from 'effector-forms';
import { createGate } from 'effector-react';

import {
  AccountType,
  CryptoType,
  SigningType,
  type VaultBaseAccount,
  WalletType,
  type WatchOnlyWallet,
} from '@/shared/core';
import { isEthereumAccountId, toAccountId, validateAddress } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { networkModel, networkUtils } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { navigationModel } from '@/features/navigation';

type FormValues = {
  walletName: string;
  address: string;
};

const form = createForm<FormValues>({
  fields: {
    walletName: {
      init: '',
      rules: [
        {
          name: 'required',
          errorText: 'onboarding.watchOnly.walletNameRequiredError',
          validator: Boolean,
        },
        {
          name: 'maxLength',
          errorText: 'onboarding.watchOnly.walletNameMaxLenError',
          validator: value => !value || value.length <= 256,
        },
      ],
    },
    address: {
      init: '',
      rules: [
        {
          name: 'correctAddress',
          errorText: 'onboarding.watchOnly.accountAddressError',
          validator: validateAddress,
        },
      ],
    },
  },
  validateOn: ['submit', 'change'],
});

const flow = createGate();

const $walletDraft = form.fields.walletName.$value.map(
  (walletName): Pick<WatchOnlyWallet, 'name' | 'type' | 'signingType'> => {
    return {
      name: walletName,
      type: WalletType.WATCH_ONLY,
      signingType: SigningType.WATCH_ONLY,
    };
  },
);

const $accountDraft = form.$values.map(({ address, walletName }): Omit<VaultBaseAccount, 'id' | 'walletId'> => {
  const accountId = toAccountId(address);
  const cryptoType = isEthereumAccountId(accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519;

  return {
    name: walletName.trim(),
    accountId,
    cryptoType,
    signingType: SigningType.WATCH_ONLY,
    accountType: AccountType.BASE,
    type: 'universal',
  };
});

const $chains = combine($accountDraft, networkModel.$chains, (account, chains) => {
  const chainsList = Object.values(chains);

  switch (account.cryptoType) {
    case CryptoType.ETHEREUM:
    case CryptoType.ECDSA:
      return chainsList.filter(c => networkUtils.isEthereumBased(c.options));
    case CryptoType.SR25519:
      return chainsList.filter(c => !networkUtils.isEthereumBased(c.options));
    default:
      return [];
  }
});

sample({
  clock: form.formValidated,
  source: { accountDraft: $accountDraft, walletDraft: $walletDraft },
  fn: ({ accountDraft, walletDraft }) => ({
    external: false,
    wallet: walletDraft,
    accounts: [accountDraft],
  }),
  target: walletModel.events.watchOnlyCreated,
});

sample({
  clock: walletModel.events.walletCreatedDone,
  source: $walletDraft,
  filter: (draft, { wallet }) => draft.type === wallet.type,
  fn: () => Paths.ASSETS,
  target: [flow.close, navigationModel.events.navigateTo],
});

sample({
  clock: flow.close,
  target: form.reset,
});

// TODO move wallet select here

export const pairingFormModel = {
  form,
  flow,
  $accountDraft,
  $chains,
};
