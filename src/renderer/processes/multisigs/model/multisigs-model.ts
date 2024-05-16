import { combine, createEffect, createEvent, sample, scopeBind } from 'effector';
import { interval, once } from 'patronum';
import { GraphQLClient } from 'graphql-request';

import { Chain, MultisigAccount, NotificationType, ExternalType, Wallet, NoID } from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { MultisigResult, multisigService } from '@entities/multisig';
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
    const boundMultisigSaved = scopeBind(multisigSaved, { safe: true });

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

        if (multisigsToSave.length > 0) {
          boundMultisigSaved({ indexedMultisigs: multisigsToSave, chain });
        }
      })
      .catch(console.error);
  });
});

const saveMultisigFx = createEffect((multisigsToSave: SaveMultisigParams[]) => {
  console.log('multisigsToAdd--> ', multisigsToSave);
  multisigsToSave.forEach((multisig) => {
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
  clock: once(networkModel.$connections),
  target: multisigsDiscoveryStarted,
});

const { tick: multisigsDiscoveryTriggered } = interval({
  start: multisigsDiscoveryStarted,
  timeout: MULTISIG_DISCOVERY_TIMEOUT,
});

sample({
  clock: multisigsDiscoveryTriggered,
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
        multisigUtils.buildMultisig({ threshold, accountId, signatories, chain }) as SaveMultisigParams,
    );
  },
  target: saveMultisigFx,
});

export const multisigsModel = {
  events: {
    multisigsDiscoveryStarted,
  },
};
