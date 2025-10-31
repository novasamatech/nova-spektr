import { u8aToHex } from '@polkadot/util';
import { attach, combine, createApi, createEvent, createStore, sample } from 'effector';
import { createForm } from 'effector-forms';
import { t } from 'i18next';

import {
  type DraftAccount,
  type NoID,
  type PolkadotVaultGroup,
  SigningType,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
} from '@/shared/core';
import { AccountType, CryptoType, KeyType } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { type SeedInfo } from '@/entities/transaction';
import { KEY_NAMES, accountUtils, walletModel } from '@/entities/wallet';
import { polkadotVaultService } from '@/features/polkadot-vault-wallet';
import { type DerivationKeyDraft } from '@/features/wallets';

const WALLET_NAME_MAX_LENGTH = 256;

export type Callbacks = {
  onSubmit: () => void;
};

type VaultCreateParams = {
  wallet: Omit<NoID<PolkadotVaultGroup>, 'accounts'>;
  accounts: (
    | Omit<NoID<VaultBaseAccount>, 'walletId'>
    | Omit<NoID<VaultChainAccount>, 'walletId'>
    | Omit<NoID<VaultShardAccount>, 'walletId'>
  )[];
};

const formInitiated = createEvent<SeedInfo>();
const derivationsImported = createEvent<DerivationKeyDraft[]>();
const vaultCreated = createEvent<VaultCreateParams>();

const createWalletFx = attach({ effect: walletModel.createWallet });

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
        { name: 'required', errorText: t('onboarding.watchOnly.walletNameRequiredError'), validator: Boolean },
        {
          name: 'maxLength',
          errorText: t('onboarding.watchOnly.walletNameMaxLenError'),
          validator: (value): boolean => value.length <= WALLET_NAME_MAX_LENGTH,
        },
      ],
    },
  },
  validateOn: ['submit'],
});

sample({
  clock: formInitiated,
  fn: seedInfo => ({ name: seedInfo.name.trim() }),
  target: $walletForm.setInitialForm,
});

sample({
  clock: formInitiated,
  source: networkModel.$chains,
  fn: (chains, { derivedKeys }) => {
    const defaultChains = networkUtils.getMainRelaychains(Object.values(chains));
    const derivationPaths = new Set<string>();

    const keys: DraftAccount<VaultChainAccount>[] = [];

    for (const chain of defaultChains) {
      if (!chain.specName) continue;

      derivationPaths.add(`//${chain.specName}`);

      keys.push({
        chainId: chain.chainId,
        name: KEY_NAMES[KeyType.MAIN],
        derivationPath: `//${chain.specName}`,
        cryptoType: networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.CHAIN,
        keyType: KeyType.MAIN,
        type: 'chain',
      });
    }

    for (const key of derivedKeys) {
      const chain = chains[u8aToHex(key.genesisHash)];
      if (nullable(chain) || nullable(key.derivationPath) || derivationPaths.has(key.derivationPath)) continue;

      keys.push({
        chainId: chain.chainId,
        name: key.derivationPath,
        derivationPath: key.derivationPath,
        cryptoType: networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.CHAIN,
        keyType: KeyType.CUSTOM,
        type: 'chain',
      });
    }

    return keys;
  },
  target: $keys,
});

sample({
  clock: derivationsImported,
  source: networkModel.$chains,
  filter: (_, draftKeys) => draftKeys.length > 0,
  fn: (chains, draftKeys) => polkadotVaultService.populateDraftAccounts(draftKeys, chains),
  target: $keys,
});

sample({
  clock: vaultCreated,
  target: createWalletFx,
});

sample({
  clock: createWalletFx,
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
    derivationsImported,
    vaultCreated,
  },
};
