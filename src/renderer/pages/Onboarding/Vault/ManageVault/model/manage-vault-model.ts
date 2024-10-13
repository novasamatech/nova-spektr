import { attach, combine, createApi, createEffect, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';

import { storageService } from '@/shared/api/storage';
import {
  type BaseAccount,
  type ChainAccount,
  type DraftAccount,
  type NoID,
  type ShardAccount,
  type Wallet,
} from '@/shared/core';
import { AccountType, ChainType, CryptoType, KeyType } from '@/shared/core';
import { dictionary } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { type SeedInfo } from '@/entities/transaction';
import { KEY_NAMES, accountUtils, walletModel } from '@/entities/wallet';
import { walletSelectModel } from '@/features/wallets';

const WALLET_NAME_MAX_LENGTH = 256;

export type Callbacks = {
  onSubmit: () => void;
};

type VaultCreateParams = {
  root: Omit<NoID<BaseAccount>, 'walletId'>;
  wallet: Omit<NoID<Wallet>, 'isActive' | 'accounts'>;
  accounts: DraftAccount<ChainAccount | ShardAccount>[];
};

const formInitiated = createEvent<SeedInfo[]>();
const keysRemoved = createEvent<DraftAccount<ChainAccount | ShardAccount>[]>();
const keysAdded = createEvent<DraftAccount<ChainAccount | ShardAccount>[]>();
const derivationsImported = createEvent<DraftAccount<ChainAccount | ShardAccount>[]>();
const vaultCreated = createEvent<VaultCreateParams>();

const $callbacks = createStore<Callbacks | null>(null);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const $keys = createStore<DraftAccount<ChainAccount | ShardAccount>[]>([]);

const $keysGroups = combine($keys, (accounts): (ChainAccount | ShardAccount[])[] => {
  return accountUtils.getAccountsAndShardGroups(accounts as (ChainAccount | ShardAccount)[]);
});

const $hasKeys = combine($keys, (keys): boolean => {
  return keys.some((key) => {
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

const createVaultFx = createEffect(
  async ({ wallet, accounts, root }: VaultCreateParams): Promise<Wallet | undefined> => {
    const dbWallet = await storageService.wallets.create({ ...wallet, isActive: false });

    if (!dbWallet) return undefined;

    const dbRootAccount = await storageService.accounts.create({ ...root, walletId: dbWallet.id });

    if (!dbRootAccount) return undefined;

    const accountsToCreate = accounts.map((account) => ({
      ...account,
      ...(accountUtils.isChainAccount(account) && { baseId: dbRootAccount.id }),
      walletId: dbWallet.id,
    })) as (ChainAccount | ShardAccount)[];

    const dbAccounts = await storageService.accounts.createAll(accountsToCreate);

    if (!dbAccounts || dbAccounts.length === 0) return undefined;

    return { ...dbWallet, accounts: [dbRootAccount, ...dbAccounts] };
  },
);

sample({
  clock: formInitiated,
  fn: (seedInfo: SeedInfo[]) => ({ name: seedInfo[0].name.trim() }),
  target: $walletForm.setInitialForm,
});

sample({
  clock: formInitiated,
  source: networkModel.$chains,
  fn: (chains) => {
    const defaultChains = networkUtils.getMainRelaychains(Object.values(chains));

    return defaultChains.reduce<DraftAccount<ChainAccount | ShardAccount>[]>((acc, chain) => {
      if (!chain.specName) return acc;

      acc.push({
        chainId: chain.chainId,
        name: KEY_NAMES[KeyType.MAIN],
        derivationPath: `//${chain.specName}`,
        cryptoType: networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519,
        chainType: ChainType.SUBSTRATE,
        type: AccountType.CHAIN,
        keyType: KeyType.MAIN,
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

    return existingKeys.filter((key) => !derivationsMap[key.derivationPath]);
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

sample({ clock: vaultCreated, target: createVaultFx });

// TODO: should use factory
sample({
  clock: createVaultFx.doneData,
  source: walletModel.$wallets,
  filter: (_, data) => Boolean(data),
  fn: (wallets, data) => wallets.concat(data!),
  target: walletModel.$wallets,
});

sample({
  clock: createVaultFx.doneData,
  filter: (data: Wallet | undefined): data is Wallet => Boolean(data),
  fn: (data) => data.id,
  target: walletSelectModel.events.walletSelected,
});

sample({
  clock: createVaultFx.doneData,
  target: attach({
    source: $callbacks,
    effect: (state) => state?.onSubmit(),
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
