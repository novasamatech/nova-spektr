import { attach, createApi, createEvent, createStore, forward, sample, combine } from 'effector';
import { createForm } from 'effector-forms';
import { u8aToHex } from '@polkadot/util';

import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { toAccountId } from '@shared/lib/utils';
import { chainsService } from '@entities/network';
import { walletModel, accountUtils } from '@entities/wallet';
import {
  AccountType,
  ChainAccount,
  ChainType,
  CryptoType,
  KeyType,
  ShardAccount,
  WalletType,
  SigningType,
  DraftAccount,
} from '@shared/core';

const chains = chainsService.getChainsData();

const WALLET_NAME_MAX_LENGTH = 256;
const MAIN_ACCOUNT_NAME = 'Main';

export type Callbacks = {
  onSubmit: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const $accounts = createStore<DraftAccount<ChainAccount | ShardAccount>[]>([]);

const $accountsGroups = combine($accounts, (accounts): Array<ChainAccount | ShardAccount[]> => {
  return accountUtils.getAccountsAndShardGroups(accounts as Array<ChainAccount | ShardAccount>);
});

const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const formInitiated = createEvent<SeedInfo[]>();
const keysAdded = createEvent<DraftAccount<ChainAccount | ShardAccount>[]>();
const derivationsImported = createEvent<DraftAccount<ChainAccount | ShardAccount>[]>();

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
  clock: $walletForm.formValidated,
  source: $accounts,
  fn: (accounts, form) => ({
    root: {} as any,
    accounts: accounts as any[],
    wallet: {
      name: form.name.trim(),
      type: WalletType.POLKADOT_VAULT,
      signingType: SigningType.PARITY_SIGNER,
    },
  }),
  target: walletModel.events.polkadotVaultCreated,
});

sample({
  clock: walletModel.watch.polkadotVaultCreatedDone,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onSubmit(),
  }),
});

forward({ from: keysAdded, to: $accounts });

forward({ from: derivationsImported, to: $accounts });

export const manageDynamicDerivationsModel = {
  $walletForm,
  $accounts,
  $accountsGroups,
  events: {
    callbacksChanged: callbacksApi.callbacksChanged,
    formInitiated,
    keysAdded,
    derivationsImported,
  },
};
