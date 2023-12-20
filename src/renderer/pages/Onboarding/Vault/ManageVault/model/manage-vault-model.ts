import { createApi, createEvent, createStore, sample, combine, createEffect, attach } from 'effector';
import { createForm } from 'effector-forms';
import { spread } from 'patronum';

import { SeedInfo } from '@renderer/components/common/QrCode/common/types';
import { chainsService } from '@entities/network';
import { accountUtils, KEY_NAMES, walletModel } from '@entities/wallet';
import type { ChainAccount, ShardAccount, DraftAccount, BaseAccount, Wallet, Account, NoID } from '@shared/core';
import { AccountType, ChainType, CryptoType, KeyType } from '@shared/core';
import { dictionary } from '@shared/lib/utils';
import { storageService } from '@shared/api/storage';

const chains = chainsService.getChainsData();

const WALLET_NAME_MAX_LENGTH = 256;

export type Callbacks = {
  onSubmit: () => void;
};

type VaultCreateParams = {
  root: Omit<NoID<BaseAccount>, 'walletId'>;
  wallet: Omit<NoID<Wallet>, 'isActive'>;
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

const $keysGroups = combine($keys, (accounts): Array<ChainAccount | ShardAccount[]> => {
  return accountUtils.getAccountsAndShardGroups(accounts as Array<ChainAccount | ShardAccount>);
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

type CreateResult = {
  wallet: Wallet;
  accounts: Account[];
};
const createVaultFx = createEffect(
  async ({ wallet, accounts, root }: VaultCreateParams): Promise<CreateResult | undefined> => {
    const dbWallet = await storageService.wallets.create({ ...wallet, isActive: false });

    if (!dbWallet) return undefined;

    const dbRootAccount = await storageService.accounts.create({ ...root, walletId: dbWallet.id });

    if (!dbRootAccount) return undefined;

    const accountsToCreate = accounts.map((account) => ({
      ...account,
      ...(accountUtils.isChainAccount(account) && { baseId: dbRootAccount.id }),
      walletId: dbWallet.id,
    }));

    const dbAccounts = await storageService.accounts.createAll(accountsToCreate as Account[]);

    if (!dbAccounts || dbAccounts.length === 0) return undefined;

    return { wallet: dbWallet, accounts: [dbRootAccount, ...dbAccounts] };
  },
);

sample({
  clock: formInitiated,
  fn: (seedInfo: SeedInfo[]) => ({ name: seedInfo[0].name.trim() }),
  target: $walletForm.setInitialForm,
});

sample({
  clock: formInitiated,
  fn: () => {
    return chains.reduce<DraftAccount<ChainAccount | ShardAccount>[]>((acc, chain) => {
      if (!chain.specName) return acc;

      acc.push({
        chainId: chain.chainId,
        name: KEY_NAMES[KeyType.MAIN],
        derivationPath: `//${chain.specName}`,
        cryptoType: CryptoType.SR25519,
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
  source: { wallets: walletModel.$wallets, accounts: walletModel.$accounts },
  filter: (_, data) => Boolean(data),
  fn: ({ wallets, accounts }, data) => ({
    wallets: wallets.concat(data!.wallet),
    accounts: accounts.concat(data!.accounts),
  }),
  target: spread({
    targets: { wallets: walletModel.$wallets, accounts: walletModel.$accounts },
  }),
});

sample({
  clock: createVaultFx.doneData,
  filter: (data: CreateResult | undefined): data is CreateResult => Boolean(data),
  fn: (data) => data.wallet.id,
  target: walletModel.events.walletSelected,
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
