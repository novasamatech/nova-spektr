import { createEffect, createEvent, sample, scopeBind } from 'effector';
import { once } from 'patronum';
import { GraphQLClient } from 'graphql-request';

import {
  Account,
  Chain,
  ChainId,
  Connection,
  MultisigAccount,
  NotificationType,
  AccountType,
  ChainType,
  CryptoType,
  ExternalType,
  SigningType,
  WalletType,
} from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { MultisigResult, multisigService } from '@entities/multisig';
import { multisigUtils } from '../lib/mulitisigs-utils';
import { isEthereumAccountId, toAddress } from '@shared/lib/utils';
import { CreateParams } from '@entities/wallet/model/wallet-model';
import { notificationModel } from '@entities/notification';

const multisigsDiscoveryStarted = createEvent();
const chainConnected = createEvent<ChainId>();

type GetMultisigsParams = {
  chain: Chain;
  accounts: Account[];
};

type StartChainsParams = {
  chains: Chain[];
  connections: Record<ChainId, Connection>;
};

type GetMultisigsResult = {
  chain: Chain;
  indexedMultisigs: MultisigResult[];
};

const connectChainsFx = createEffect(({ chains, connections }: StartChainsParams) => {
  const boundConnected = scopeBind(chainConnected, { safe: true });

  chains.forEach((chain) => {
    if (networkUtils.isDisabledConnection(connections[chain.chainId])) {
      return;
    }

    boundConnected(chain.chainId);
  });
});

const getMultisigsFx = createEffect(async ({ chain, accounts }: GetMultisigsParams): Promise<GetMultisigsResult> => {
  const multisigIndexerUrl =
    networkUtils.isMultisigSupported(chain.options) && chain.externalApi?.[ExternalType.MULTISIG]?.[0]?.url;

  if (multisigIndexerUrl && accounts.length) {
    const client = new GraphQLClient(multisigIndexerUrl);

    const indexedMultisigs = await multisigService.filterMultisigsAccounts(
      client,
      accounts.map((account) => account.accountId),
    );

    return {
      indexedMultisigs,
      chain,
    };
  }

  return {
    indexedMultisigs: [],
    chain,
  };
});

const saveMultisigFx = createEffect((multisigsToAdd: CreateParams<MultisigAccount>[]) => {
  multisigsToAdd.forEach((multisig) => {
    walletModel.events.multisigCreated(multisig);

    notificationModel.events.notificationsAdded([
      {
        read: false,
        type: NotificationType.MULTISIG_CREATED,
        dateCreated: Date.now(),
      },
    ]);
  });
});

sample({
  clock: [multisigsDiscoveryStarted, once(networkModel.$connections)],
  source: {
    connections: networkModel.$connections,
    chains: networkModel.$chains,
  },
  fn: ({ connections, chains }) => ({
    chains: Object.values(chains).filter((chain) => multisigUtils.isMultisigSupported(chain)),
    connections,
  }),
  target: connectChainsFx,
});

sample({
  clock: chainConnected,
  source: {
    chains: networkModel.$chains,
    wallets: walletModel.$wallets,
  },
  fn: ({ chains, wallets }, chainId) => ({
    chainId,
    chain: chains[chainId],
    accounts: walletUtils.getAccountsBy(wallets, (a) => accountUtils.isChainIdMatch(a, chainId)),
    wallets,
  }),
  target: getMultisigsFx,
});

sample({
  clock: getMultisigsFx.doneData,
  source: {
    wallets: walletModel.$wallets,
  },
  filter: (_, { indexedMultisigs }) => {
    return indexedMultisigs.length > 0;
  },
  fn: ({ wallets }, { indexedMultisigs, chain }) => {
    const multisigsToSave = indexedMultisigs.filter((multisigrResult) => {
      // we filter out the multisigs that we already have
      const sameWallet = walletUtils.getWalletFilteredAccounts(wallets, {
        accountFn: (account) => {
          return account.accountId === multisigrResult.accountId;
        },
      });

      const walletAllreadyExist = Boolean(sameWallet);

      return !walletAllreadyExist;
    });

    const walletsToSave = multisigsToSave.map(
      ({ threshold, accountId, signatories }) =>
        ({
          wallet: {
            name: toAddress(accountId, { chunk: 5, prefix: chain.addressPrefix }),
            type: WalletType.MULTISIG,
            signingType: SigningType.MULTISIG,
          },
          accounts: [
            {
              threshold: threshold,
              accountId: accountId,
              signatories: signatories.map((signatory) => ({
                accountId: signatory,
                address: toAddress(signatory),
              })),
              name: toAddress(accountId, { chunk: 5, prefix: chain.addressPrefix }),
              chainId: chain.chainId,
              cryptoType: isEthereumAccountId(accountId) ? CryptoType.ETHEREUM : CryptoType.SR25519,
              chainType: ChainType.SUBSTRATE,
              type: AccountType.MULTISIG,
            },
          ],
        } as CreateParams<MultisigAccount>),
    );

    return walletsToSave;
  },
  target: saveMultisigFx,
});

export const multisigsModel = {
  events: {
    multisigsDiscoveryStarted,
  },
};
