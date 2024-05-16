import { combine, createEffect, createEvent, sample } from 'effector';
import { interval, once } from 'patronum';
import { GraphQLClient } from 'graphql-request';

import {
  Chain,
  MultisigAccount,
  NotificationType,
  AccountType,
  ChainType,
  CryptoType,
  ExternalType,
  SigningType,
  WalletType,
  Wallet,
  NoID,
} from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { MultisigResult, multisigService } from '@entities/multisig';
import { isEthereumAccountId, toAddress } from '@shared/lib/utils';
import { notificationModel } from '@entities/notification';
import { multisigUtils } from '../lib/mulitisigs-utils';

type SaveMultisigParams = {
  wallet: Omit<NoID<Wallet>, 'isActive' | 'accounts'>;
  accounts: Omit<NoID<MultisigAccount>, 'walletId'>[];
};

const MULTISIG_DISCOVERY_TIMEOUT = 30000;

const multisigsDiscoveryStarted = createEvent();
const multisigSaved = createEvent<GetMultisigsResult>();

const $multisigChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter((chain) => {
    const isMultisigSupported = multisigUtils.isMultisigSupported(chain);
    const hasIndexerUrl = chain.externalApi?.[ExternalType.MULTISIG]?.[0]?.url;

    return isMultisigSupported && hasIndexerUrl;
  });
});

type GetMultisigsParams = {
  chains: Chain[];
  wallets: Wallet[];
};

type GetMultisigsResult = {
  chain: Chain;
  indexedMultisigs: MultisigResult[];
};

const getMultisigsFx = createEffect(({ chains, wallets }: GetMultisigsParams) => {
  chains.forEach((chain) => {
    const accounts = walletUtils.getAccountsBy(wallets, (a) => accountUtils.isChainIdMatch(a, chain.chainId));
    const multisigIndexerUrl = chain.externalApi?.[ExternalType.MULTISIG]?.[0]?.url;

    if (!multisigIndexerUrl || !accounts.length) {
      return;
    }

    const client = new GraphQLClient(multisigIndexerUrl);
    const accountIds = accounts.map((account) => account.accountId);

    multisigService
      .filterMultisigsAccounts(client, accountIds)
      .then((indexedMultisigs) => {
        const multisigsToSave = indexedMultisigs.filter((multisigrResult) => {
          // we filter out the multisigs that we already have
          const existingWallet = walletUtils.getWalletFilteredAccounts(wallets, {
            accountFn: (account) => account.accountId === multisigrResult.accountId,
          });

          return !existingWallet;
        });

        multisigsToSave.length > 0 && multisigSaved({ indexedMultisigs: multisigsToSave, chain });
      })
      .catch(console.error);
  });
});

const saveMultisigFx = createEffect((multisigsToAdd: SaveMultisigParams[]) => {
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

const { tick: multisigDiscoveryTriggered } = interval({
  start: multisigsDiscoveryStarted,
  timeout: MULTISIG_DISCOVERY_TIMEOUT,
});

sample({
  clock: [multisigDiscoveryTriggered, once(networkModel.$connections)],
  source: {
    chains: $multisigChains,
    wallets: walletModel.$wallets,
    connections: networkModel.$connections,
  },
  fn: ({ chains, wallets, connections }) => {
    const filteredChains = chains.filter(
      (chain) => connections[chain.chainId] && !networkUtils.isDisabledConnection(connections[chain.chainId]),
    );

    return {
      chains: filteredChains,
      wallets,
    };
  },
  target: getMultisigsFx,
});

sample({
  clock: multisigSaved,
  fn: ({ indexedMultisigs, chain }) => {
    return indexedMultisigs.map(
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
        } as SaveMultisigParams),
    );
  },
  target: saveMultisigFx,
});

export const multisigsModel = {
  events: {
    multisigsDiscoveryStarted,
  },
};
