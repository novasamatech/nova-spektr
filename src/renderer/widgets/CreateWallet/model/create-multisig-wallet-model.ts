import { combine, createApi, createEffect, createEvent, createStore, sample } from 'effector';
import sortBy from 'lodash/sortBy';

import { AccountType, ChainId, ChainType, CryptoType, Signatory, SigningType, WalletType } from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { networkModel, networkUtils } from '@entities/network';
import { Step } from '../lib/types';
import { formModel } from './create-multisig-form-model';

const reset = createEvent();
const stepChanged = createEvent<Step>();

export type Callbacks = {
  onComplete: () => void;
};

const walletCreated = createEvent<{
  name: string;
  threshold: number;
}>();
const $step = createStore<Step>(Step.INIT);

const $callbacks = createStore<Callbacks | null>(null).reset(reset);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const $error = createStore('').reset(reset);
const $api = combine(
  {
    apis: networkModel.$apis,
    chainId: formModel.$createMultisigForm.fields.chain.$value,
  },
  ({ apis, chainId }) => {
    return chainId ? apis[chainId] : undefined;
  },
  { skipVoid: false },
);

type CreateWalletParams = {
  name: string;
  threshold: number;
  signatories: Signatory[];
  chainId: ChainId | null;
  isEthereumChain: boolean;
};

const createWalletFx = createEffect(
  async ({ name, threshold, signatories, chainId, isEthereumChain }: CreateWalletParams) => {
    const cryptoType = isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519;
    const accountIds = signatories.map((s) => s.accountId);
    const accountId = accountUtils.getMultisigAccountId(accountIds, threshold, cryptoType);

    walletModel.events.multisigCreated({
      wallet: {
        name,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [
        {
          signatories,
          chainId: chainId || undefined,
          name: name.trim(),
          accountId: accountId,
          threshold: threshold,
          cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
          chainType: isEthereumChain ? ChainType.ETHEREUM : ChainType.SUBSTRATE,
          type: AccountType.MULTISIG,
        },
      ],
    });
  },
);

const $hasOwnSignatory = combine(
  { wallets: walletModel.$wallets, signatories: formModel.$signatories },
  ({ wallets, signatories }) =>
    walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isWatchOnly(w) && !walletUtils.isMultisig(w),
      accountFn: (a) => signatories.some((s) => s.accountId === a.accountId),
    }),
);

sample({
  clock: walletCreated,
  source: {
    signatories: formModel.$signatories,
    chainId: formModel.$createMultisigForm.fields.chain.$value,
    chains: networkModel.$chains,
  },
  fn: ({ signatories, chains, chainId }, resultValues) => ({
    ...resultValues,
    chainId,
    signatories: sortBy(signatories, 'accountId'),
    isEthereumChain: networkUtils.isEthereumBased(chains[chainId].options),
  }),
  target: createWalletFx,
});

sample({
  clock: createWalletFx.failData,
  fn: (error) => error.message,
  target: $error,
});

export const createMultisigWalletModel = {
  $isLoading: createWalletFx.pending,
  $error,
  $step,
  $hasOwnSignatory,
  events: {
    reset,
    callbacksChanged: callbacksApi.callbacksChanged,
    walletCreated,
    stepChanged,
  },
};
