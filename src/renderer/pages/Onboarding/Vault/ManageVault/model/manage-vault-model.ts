import { attach, createApi, createEvent, createStore, forward, sample, combine } from 'effector';
import { createForm } from 'effector-forms';
import { u8aToHex } from '@polkadot/util';

import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { toAccountId } from '@shared/lib/utils';
import { chainsService } from '@entities/network';
import { walletModel, accountUtils } from '@entities/wallet';
import { AccountType, ChainType, CryptoType, KeyType } from '@shared/core';
import type { ChainAccount, ShardAccount, DraftAccount } from '@shared/core';

const chains = chainsService.getChainsData();

const WALLET_NAME_MAX_LENGTH = 256;
const MAIN_ACCOUNT_NAME = 'Main';

export type Callbacks = {
  onSubmit: () => void;
};

const $callbacks = createStore<Callbacks | null>(null);
const $keys = createStore<DraftAccount<ChainAccount | ShardAccount>[]>([]);

const $keysGroups = combine($keys, (accounts): Array<ChainAccount | ShardAccount[]> => {
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

const $hasKeys = combine($keys, (keys): boolean => {
  return keys.some((key) => {
    const keyData = Array.isArray(key) ? key[0] : key;

    return keyData.keyType !== KeyType.MAIN;
  });
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
  target: $keys,
});

sample({
  clock: walletModel.watch.polkadotVaultCreatedDone,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onSubmit(),
  }),
});

forward({ from: keysAdded, to: $keys });

forward({ from: derivationsImported, to: $keys });

export const manageVaultModel = {
  $walletForm,
  $keys,
  $keysGroups,
  $hasKeys,
  events: {
    callbacksChanged: callbacksApi.callbacksChanged,
    formInitiated,
    keysAdded,
    derivationsImported,
  },
};
