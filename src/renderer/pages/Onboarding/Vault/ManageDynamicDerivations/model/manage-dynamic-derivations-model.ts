import { attach, createApi, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { u8aToHex } from '@polkadot/util';

import { AccountType, ChainAccount, ChainType, CryptoType, KeyType, NoID, ShardAccount } from '@renderer/shared/core';
import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { toAccountId } from '@renderer/shared/lib/utils';
import { chainsService } from '@renderer/entities/network';
import { walletModel } from '@/src/renderer/entities/wallet';

const chains = chainsService.getChainsData();

const WALLET_NAME_MAX_LENGTH = 256;
const MAIN_ACCOUNT_NAME = 'Main';

const validateMaxLength = (value: string) => value.length <= WALLET_NAME_MAX_LENGTH;

export type Callbacks = {
  onSubmit: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const $accounts = createStore<Omit<NoID<ShardAccount | ChainAccount>, 'walletId'>[]>([]);

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
    const accounts = chains.reduce<Record<string, any>>((acc, chain) => {
      if (!chain.specName) return acc;

      const derivationPath = `//${chain.specName}`;

      acc[derivationPath] = {
        name: MAIN_ACCOUNT_NAME,
        derivationPath,
        chainId: chain.chainId,
        cryptoType: CryptoType.SR25519,
        chainType: ChainType.SUBSTRATE,
        type: AccountType.CHAIN,
        keyType: KeyType.MAIN,
      };

      return acc;
    }, {});

    const derivedAccounts = seedInfo.derivedKeys.reduce<any[]>((acc, key) => {
      if (key.derivationPath && !accounts[key.derivationPath]) {
        acc.push({
          name: '',
          derivationPath: key.derivationPath || '',
          chainId: u8aToHex(key.genesisHash),
          accountId: toAccountId(key.address),
          cryptoType: CryptoType.SR25519,
          chainType: ChainType.SUBSTRATE,
          type: AccountType.CHAIN,
          keyType: KeyType.CUSTOM,
        });
      }

      return acc;
    }, []);

    return Object.values(accounts).concat(derivedAccounts);
  },
  target: $accounts,
});

sample({
  clock: walletModel.effects.polkadotVaultCreatedFx.doneData,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onSubmit(),
  }),
});

export const manageDynamicDerivationsModel = {
  $walletForm,
  $accounts,
  $submitPending: false,
  events: {
    callbacksChanged: callbacksApi.callbacksChanged,
    formInitiated,
  },
};
