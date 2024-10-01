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
} from '@shared/core';
import { type MultisigResult, multisigService } from '@entities/multisig';
import { networkModel, networkUtils } from '@entities/network';
import { notificationModel } from '@entities/notification';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
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
    const hasIndexerUrl =
      networkUtils.isMultisigSupported(chain.options) && chain.externalApi?.[ExternalType.PROXY]?.[0]?.url;

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
    const accounts = walletUtils.getAccountsBy(wallets, (a) => accountUtils.isChainIdMatch(a, chain.chainId));
    const multisigIndexerUrl = chain.externalApi?.[ExternalType.PROXY]?.[0]?.url;
    const boundMultisigSaved = scopeBind(multisigSaved, { safe: true });

    if (!multisigIndexerUrl || !accounts.length) continue;

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
