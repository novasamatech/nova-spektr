import { combine, createApi, createEffect, createEvent, createStore, sample } from 'effector';

import {
  AccountId,
  AccountType,
  ChainId,
  ChainType,
  CryptoType,
  Signatory,
  SigningType,
  WalletType,
} from '@shared/core';
import { accountUtils, walletModel } from '@entities/wallet';
import { RelayChains } from '@shared/lib/utils';
import { matrixModel } from '@entities/matrix';

const reset = createEvent();

export type Callbacks = {
  onComplete: () => void;
};

const $callbacks = createStore<Callbacks | null>(null).reset(reset);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const walletCreated = createEvent<{
  name: string;
  threshold: number;
  creatorId: string;
}>();
const chainSelected = createEvent<ChainId>();
const signatoriesChanged = createEvent<Signatory[]>();

const $chain = createStore<ChainId | null>(null).reset(reset);
const $signatories = createStore<Signatory[]>([]).reset(reset);
const $error = createStore('').reset(reset);

type CreateWalletParams = {
  matrix: any;
  name: string;
  threshold: number;
  creatorId: string;
  signatories: Signatory[];
  chainId: ChainId | null;
};

const createWalletFx = createEffect(
  async ({ matrix, name, threshold, creatorId, signatories, chainId }: CreateWalletParams) => {
    const accountIds = signatories.map((s) => s.accountId);
    const accountId = accountUtils.getMultisigAccountId(accountIds, threshold);
    let roomId = matrix.joinedRooms(accountId)[0]?.roomId;
    const isMyAccounts = signatories.every((s) => s.matrixId === matrix.userId);

    if (!roomId || isMyAccounts) {
      roomId = await matrix.createRoom({
        creatorAccountId: creatorId,
        accountName: name,
        accountId: accountId,
        threshold: threshold,
        signatories: signatories.map(({ accountId, matrixId }) => ({ accountId, matrixId })),
      });
    }

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
          matrixRoomId: roomId,
          threshold: threshold,
          creatorAccountId: creatorId as AccountId,
          cryptoType: CryptoType.SR25519,
          chainType: ChainType.SUBSTRATE,
          type: AccountType.MULTISIG,
        },
      ],
    });
  },
);

const $availableAccounts = combine(
  {
    accounts: walletModel.$accounts,
    chain: $chain,
  },
  ({ accounts, chain }) => {
    const chainAccounts = accounts.filter((account) => {
      const isAvailableType = !accountUtils.isMultisigAccount(account);
      const isChainIdMatch = accountUtils.isChainIdMatch(account, chain || RelayChains.POLKADOT);

      return isChainIdMatch && isAvailableType;
    });

    const baseAccounts = chainAccounts.filter((a) => accountUtils.isBaseAccount(a) && a.name);

    return [...accountUtils.getAccountsAndShardGroups(chainAccounts), ...baseAccounts];
  },
  { skipVoid: false },
);

sample({
  clock: chainSelected,
  target: $chain,
});

sample({
  clock: signatoriesChanged,
  target: $signatories,
});

sample({
  clock: walletCreated,
  source: {
    signatories: $signatories,
    matrix: matrixModel.$matrix,
    chainId: $chain,
  },
  fn: (sourceValues, resultValues) => ({ ...sourceValues, ...resultValues }),
  target: createWalletFx,
});

sample({
  clock: createWalletFx.failData,
  fn: (error) => error.message,
  target: $error,
});

export const createMultisigWalletModel = {
  $availableAccounts,
  $chain,
  $isLoading: createWalletFx.pending,
  $error,
  events: {
    reset,
    callbacksChanged: callbacksApi.callbacksChanged,
    walletCreated,
    chainSelected,
    signatoriesChanged,
  },
};
