import { combine, createEffect, createEvent, sample, scopeBind } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { interval, once } from 'patronum';

import {
  type Chain,
  ExternalType,
  type MultisigAccount,
  type MultisigCreated,
  type NoID,
  NotificationType,
  type Wallet,
} from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type MultisigResult, multisigService } from '@/entities/multisig';
import { networkModel, networkUtils } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { multisigUtils } from '../lib/mulitisigs-utils';

type SaveMultisigParams = {
  wallet: Omit<NoID<Wallet>, 'isActive' | 'accounts'>;
  accounts: Omit<NoID<MultisigAccount>, 'walletId'>[];
  external: boolean;
};

const MULTISIG_DISCOVERY_TIMEOUT = 30000;

const multisigsDiscoveryStarted = createEvent();
const multisigSaved = createEvent<GetMultisigsResult>();

const $multisigChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter((chain) => {
    const isMultisigSupported = networkUtils.isMultisigSupported(chain.options);
    const hasIndexerUrl = chain.externalApi?.[ExternalType.PROXY]?.at(0)?.url;

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
  for (const chain of chains) {
    const multisigIndexerUrl = chain.externalApi?.[ExternalType.PROXY]?.at(0)?.url;
    if (!multisigIndexerUrl) continue;

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isMultisig(w) && !walletUtils.isWatchOnly(w) && !walletUtils.isProxied(w),
      accountFn: (a) => accountUtils.isChainIdMatch(a, chain.chainId),
    });

    const accountIds = (filteredWallets || []).flatMap(({ accounts }) => accounts).map(({ accountId }) => accountId);
    if (accountIds.length === 0) continue;

    const client = new GraphQLClient(multisigIndexerUrl);
    const boundMultisigSaved = scopeBind(multisigSaved, { safe: true });

    multisigService
      .filterMultisigsAccounts(client, accountIds)
      .then((indexedMultisigs) => {
        const multisigWallets = walletUtils.getWalletsFilteredAccounts(wallets, { walletFn: walletUtils.isMultisig });
        const walletsToSave: MultisigResult[] = [];

        for (const multisig of indexedMultisigs) {
          const existingWallet = walletUtils.getWalletFilteredAccounts(multisigWallets || [], {
            accountFn: (a) => a.accountId === multisig.accountId && accountUtils.isChainIdMatch(a, chain.chainId),
          });
          if (existingWallet) continue;

          walletsToSave.push(multisig);
        }

        if (walletsToSave.length > 0) {
          boundMultisigSaved({ indexedMultisigs: walletsToSave, chain });
        }
      })
      .catch(console.error);
  }
});

const saveMultisigFx = createEffect((multisigsToSave: SaveMultisigParams[]) => {
  for (const multisig of multisigsToSave) {
    walletModel.events.multisigCreated(multisig);

    const signatories = multisig.accounts[0].signatories.map((signatory) => signatory.accountId);
    notificationModel.events.notificationsAdded([
      {
        read: false,
        type: NotificationType.MULTISIG_CREATED,
        dateCreated: Date.now(),
        multisigAccountId: multisig.accounts[0].accountId,
        multisigAccountName: multisig.wallet.name,
        chainId: multisig.accounts[0].chainId,
        signatories,
        threshold: multisig.accounts[0].threshold,
        originatorAccountId: '' as string,
      } as NoID<MultisigCreated>,
    ]);
  }
});

const { tick: multisigsDiscoveryTriggered } = interval({
  start: multisigsDiscoveryStarted,
  timeout: MULTISIG_DISCOVERY_TIMEOUT,
});

sample({
  clock: [multisigsDiscoveryTriggered, once(networkModel.$connections)],
  source: {
    chains: $multisigChains,
    wallets: walletModel.$allWallets,
    connections: networkModel.$connections,
  },
  fn: ({ chains, wallets, connections }) => {
    const filteredChains = chains.filter((chain) => {
      if (nullable(connections[chain.chainId])) return false;

      return !networkUtils.isDisabledConnection(connections[chain.chainId]);
    });

    return { wallets, chains: filteredChains };
  },
  target: getMultisigsFx,
});

sample({
  clock: multisigSaved,
  fn: ({ indexedMultisigs, chain }) => {
    return indexedMultisigs.map(
      ({ threshold, accountId, signatories }) =>
        ({
          ...multisigUtils.buildMultisig({ threshold, accountId, signatories, chain }),
          external: true,
        }) as SaveMultisigParams,
    );
  },
  target: saveMultisigFx,
});

export const multisigsModel = {
  events: {
    multisigsDiscoveryStarted,
  },

  _test: {
    saveMultisigFx,
  },
};
