import { attach, combine, createApi, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';

import {
  type DraftAccount,
  type NoID,
  SigningType,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  type Wallet,
} from '@/shared/core';
import { AccountType, CryptoType, KeyType } from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { type SeedInfo } from '@/entities/transaction';
import { KEY_NAMES, accountUtils, walletModel, walletUtils } from '@/entities/wallet';

const WALLET_NAME_MAX_LENGTH = 256;

export type Callbacks = {
  onSubmit: () => void;
};

type VaultCreateParams = {
  root: Omit<NoID<VaultBaseAccount>, 'walletId'>;
  wallet: Omit<NoID<Wallet>, 'isActive' | 'accounts'>;
  accounts: (Omit<NoID<VaultChainAccount>, 'walletId'> | Omit<NoID<VaultShardAccount>, 'walletId'>)[];
};

const formInitiated = createEvent<SeedInfo[]>();
const keysRemoved = createEvent<(DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]>();
const keysAdded = createEvent<(DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]>();
const derivationsImported = createEvent<(DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]>();
const vaultCreated = createEvent<VaultCreateParams>();

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const $keys = createStore<(DraftAccount<VaultChainAccount> | DraftAccount<VaultShardAccount>)[]>([]);

const $keysGroups = combine($keys, (accounts): (VaultChainAccount | VaultShardAccount[])[] => {
  return accountUtils.getAccountsAndShardGroups(accounts as (VaultChainAccount | VaultShardAccount)[]);
});

const $hasKeys = combine($keys, (keys): boolean => {
  return keys.some(key => {
    const keyData = Array.isArray(key) ? key[0] : key;

    return keyData.keyType !== KeyType.MAIN;
  });
});

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
  validateOn: ['submit'],
});

sample({
  clock: formInitiated,
  fn: (seedInfo: SeedInfo[]) => ({ name: seedInfo[0].name.trim() }),
  target: $walletForm.setInitialForm,
});

sample({
  clock: formInitiated,
  source: networkModel.$chains,
  fn: chains => {
    const defaultChains = networkUtils.getMainRelaychains(Object.values(chains));

    return defaultChains.reduce<DraftAccount<VaultChainAccount>[]>((acc, chain) => {
      if (!chain.specName) return acc;

      acc.push({
        chainId: chain.chainId,
        name: KEY_NAMES[KeyType.MAIN],
        derivationPath: `//${chain.specName}`,
        cryptoType: networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.CHAIN,
        keyType: KeyType.MAIN,
        type: 'chain',
      });

      return acc;
    }, []);
  },
  target: $keys,
});

sample({
  clock: keysRemoved,
  source: $keys,
  filter: (_, keysToAdd) => keysToAdd.length > 0,
  fn: (existingKeys, keysToRemove) => {
    const derivationsMap = dictionary(keysToRemove, 'derivationPath', () => true);

    return existingKeys.filter(key => !derivationsMap[key.derivationPath]);
  },
  target: $keys,
});

sample({
  clock: keysAdded,
  source: $keys,
  filter: (_, keysToAdd) => keysToAdd.length > 0,
  fn: (existingKeys, keysToAdd) => existingKeys.concat(keysToAdd),
  target: $keys,
});

sample({ clock: derivationsImported, target: $keys });

sample({
  clock: vaultCreated,
  fn: ({ wallet, root, accounts }) => {
    return {
      wallet,
      accounts: [root, ...accounts],
      external: false,
    };
  },
  target: walletModel.events.multishardCreated,
});

sample({
  clock: walletModel.events.walletCreatedDone,
  filter: ({ wallet }) => walletUtils.isPolkadotVault(wallet as Wallet),
  target: attach({
    source: $callbacks,
    effect: state => state?.onSubmit(),
  }),
});

export const manageVaultModel = {
  $walletForm,
  $keys,
  $keysGroups,
  $hasKeys,
  events: {
    callbacksChanged: callbacksApi.callbacksChanged,
    formInitiated,
    keysRemoved,
    keysAdded,
    derivationsImported,
    vaultCreated,
  },
};
