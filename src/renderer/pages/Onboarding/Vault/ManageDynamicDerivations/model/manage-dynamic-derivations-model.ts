import { attach, createApi, createEvent, createStore, forward, sample } from 'effector';
import { createForm } from 'effector-forms';
import { u8aToHex } from '@polkadot/util';

import { AccountType, ChainAccount, ChainType, CryptoType, KeyType, ShardAccount } from '@renderer/shared/core';
import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { toAccountId } from '@shared/lib/utils';
import { chainsService } from '@entities/network';
import { walletModel } from '@entities/wallet';
import { DraftAccount } from '@shared/core/types/account';

const chains = chainsService.getChainsData();

const WALLET_NAME_MAX_LENGTH = 256;
const MAIN_ACCOUNT_NAME = 'Main';

export type Callbacks = {
  onSubmit: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const $accounts = createStore<DraftAccount<ShardAccount | ChainAccount>[]>([]);

const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const formInitiated = createEvent<SeedInfo[]>();
const derivationsImported = createEvent<DraftAccount<ShardAccount | ChainAccount>[]>();

const $walletForm = createForm({
  fields: {
    name: {
      init: '',
      rules: [
        { name: 'required', errorText: 'onboarding.watchOnly.walletNameRequiredError', validator: Boolean },
        {
          name: 'maxLength',
          errorText: 'onboarding.watchOnly.walletNameMaxLenError',
          validator: (value): boolean => value.length <= WALLET_NAME_MAX_LENGTH,
        },
      ],
    },
  },
  validateOn: ['change', 'submit'],
});

const formInitiated = createEvent<SeedInfo[]>();
const keysAdded = createEvent<Array<ChainAccount | ShardAccount[]>>();

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

forward({ from: keysAdded, to: $accounts });

const createWalletFx = attach({
  effect: walletModel.effects.polkadotVaultWalletCreatedFx,
  source: {
    accounts: $accounts,
    walletForm: $walletForm.$values,
  },
  mapParams: (_, { walletForm, accounts }) => ({
    accounts: accounts as any[],
    wallet: {
      name: walletForm.name.trim(),
      type: WalletType.POLKADOT_VAULT,
      signingType: SigningType.PARITY_SIGNER,
    },
  }),
});

forward({
  from: $walletForm.formValidated,
  to: createWalletFx,
});

sample({
  clock: walletModel.effects.polkadotVaultCreatedFx.doneData,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onSubmit(),
  }),
});

forward({
  from: derivationsImported,
  to: $accounts,
});

export const manageDynamicDerivationsModel = {
  $walletForm,
  $accounts,
  events: {
    callbacksChanged: callbacksApi.callbacksChanged,
    formInitiated,
    keysAdded,
    derivationsImported,
  },
};
