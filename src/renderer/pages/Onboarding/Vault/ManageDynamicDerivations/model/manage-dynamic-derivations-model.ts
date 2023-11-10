import { attach, createApi, createEvent, createStore, forward, sample } from 'effector';
import { createForm } from 'effector-forms';
import { u8aToHex } from '@polkadot/util';

import { walletModel } from '@renderer/entities/wallet';
import {
  AccountType,
  BaseAccount,
  ChainAccount,
  ChainType,
  CryptoType,
  KeyType,
  NoID,
  SigningType,
  WalletType,
} from '@renderer/shared/core';
import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { toAccountId } from '@renderer/shared/lib/utils';

const WALLET_NAME_MAX_LENGTH = 256;

const validateMaxLength = (value: string) => value.length <= WALLET_NAME_MAX_LENGTH;

export type Callbacks = {
  onSubmit: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const $accounts = createStore<Omit<NoID<BaseAccount | ChainAccount>, 'walletId'>[]>([]);

const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const formInitiated = createEvent<SeedInfo[]>();

const $walletForm = createForm({
  fields: {
    name: {
      init: '',
      rules: [
        { name: 'required', errorText: 'onboarding.watchOnly.walletNameRequiredError', validator: Boolean },
        {
          name: 'maxLength',
          errorText: 'onboarding.watchOnly.walletNameMaxLenError',
          validator: validateMaxLength,
        },
      ],
    },
  },
  validateOn: ['change', 'submit'],
});

sample({
  clock: formInitiated,
  fn: (seedInfo: SeedInfo[]) => ({ name: seedInfo[0].name.trim() }),
  target: $walletForm.setInitialForm,
});

sample({
  clock: formInitiated,
  fn: ([seedInfo]: SeedInfo[]) => {
    return seedInfo.derivedKeys.map((key) => ({
      name: '',
      derivationPath: key.derivationPath || '',
      chainId: u8aToHex(key.genesisHash),
      accountId: toAccountId(key.address),
      cryptoType: CryptoType.SR25519,
      chainType: ChainType.SUBSTRATE,
      type: AccountType.CHAIN,
      keyType: KeyType.CUSTOM,
    }));
  },
  target: $accounts,
});

const createWalletFx = attach({
  effect: walletModel.effects.polkadotVaultWalletCreatedFx,
  source: {
    walletForm: $walletForm.$values,
    accounts: $accounts,
  },
  mapParams: (_, { walletForm, accounts }) => {
    return {
      wallet: {
        name: walletForm.name.trim(),
        type: WalletType.POLKADOT_VAULT,
        signingType: SigningType.PARITY_SIGNER,
      },
      accounts,
    };
  },
});

forward({
  from: $walletForm.formValidated,
  to: createWalletFx,
});

sample({
  clock: createWalletFx.doneData,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onSubmit(),
  }),
});

export const manageDynamicDerivationsModel = {
  $walletForm,
  $accounts,
  $submitPending: createWalletFx.pending,
  events: {
    callbacksChanged: callbacksApi.callbacksChanged,
    formInitiated,
  },
};
