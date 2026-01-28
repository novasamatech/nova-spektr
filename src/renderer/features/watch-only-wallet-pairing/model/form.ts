import { attach, combine, sample } from 'effector';
import { createForm } from 'effector-forms';
import { createGate } from 'effector-react';
import { t } from 'i18next';

import { chainsService } from '@/shared/api/network';
import {
  type WatchOnlyAccount,
  type WatchOnlyWallet,
  AccountType,
  CryptoType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { isEthereumAccountId, nonNullable, toAccountId, validateAddress } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { identity } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { navigationModel } from '@/features/navigation';
import { IDENTITY_CHAIN } from '../lib/constants';

const flow = createGate();

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
          errorText: t('onboarding.watchOnly.walletNameRequiredError'),
          validator: Boolean,
        },
        {
          name: 'maxLength',
          errorText: t('onboarding.watchOnly.walletNameMaxLenError'),
          validator: value => !value || value.length <= 256,
        },
      ],
    },
    address: {
      init: '',
      rules: [
        {
          name: 'correctAddress',
          errorText: t('onboarding.watchOnly.accountAddressError'),
          validator: address => validateAddress(address),
        },
      ],
    },
  },
  validateOn: ['submit', 'change'],
});

const createWalletFx = attach({ effect: walletModel.createWallet });
const requestIdentityFx = attach({ effect: identity.request });

const $walletDraft = form.fields.walletName.$value.map((walletName): Pick<WatchOnlyWallet, 'name' | 'type'> => {
  return {
    name: walletName,
    type: WalletType.WATCH_ONLY,
  };
});

const $accountDraft = form.$values.map(({ address, walletName }): Omit<WatchOnlyAccount, 'id' | 'walletId'> => {
  const accountId = toAccountId(address);
  const cryptoType = isEthereumAccountId(accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519;

  return {
    name: walletName.trim(),
    accountId,
    cryptoType,
    type: 'universal',
    signingType: SigningType.WATCH_ONLY,
    accountType: AccountType.WATCH_ONLY,
  };
});

const $chains = combine($accountDraft, networkModel.$chains, (account, chains) => {
  const chainsList = chainsService.sortChains(Object.values(chains));

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
  clock: form.fields.address.onChange,
  filter: validateAddress,
  fn: address => ({
    chainId: IDENTITY_CHAIN,
    accounts: [toAccountId(address)],
  }),
  target: requestIdentityFx,
});

sample({
  clock: form.formValidated,
  source: {
    accountDraft: $accountDraft,
    walletDraft: $walletDraft,
  },
  fn: ({ accountDraft, walletDraft }) => ({
    wallet: walletDraft,
    accounts: [accountDraft],
  }),
  target: createWalletFx,
});

sample({
  clock: createWalletFx.done,
  fn: () => Paths.ASSETS,
  target: [flow.close, navigationModel.events.navigateTo],
});

sample({
  clock: createWalletFx.doneData.filter({ fn: nonNullable }),
  fn: ({ wallet }) => wallet.id,
  target: walletSelect.select,
});

sample({
  clock: flow.close,
  target: form.reset,
});

// TODO move wallet select here

export const pairingFormModel = {
  flow,

  form,
  $accountDraft,
  $chains,
  $identityPending: requestIdentityFx.pending,
};
