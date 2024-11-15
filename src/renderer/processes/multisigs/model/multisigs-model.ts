import { combine, createEffect, createEvent, sample } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { interval } from 'patronum';

import {
  type Account,
  type Chain,
  type ChainId,
  type FlexibleMultisigAccount,
  type FlexibleMultisigCreated,
  type FlexibleMultisigWallet,
  type MultisigAccount,
  type MultisigCreated,
  type MultisigWallet,
  type NoID,
  NotificationType,
  type ProxyAccount,
  SigningType,
  WalletType,
} from '@/shared/core';
import { series } from '@/shared/effector';
import { nonNullable, nullable, toAddress, toKeysRecord } from '@/shared/lib/utils';
import { multisigService } from '@/entities/multisig';
import { networkModel, networkUtils } from '@/entities/network';
import { notificationModel } from '@/entities/notification';
import { proxyModel } from '@/entities/proxy';
import { walletModel, walletUtils } from '@/entities/wallet';
import { multisigUtils } from '../lib/mulitisigs-utils';

const MULTISIG_DISCOVERY_TIMEOUT = 30000;

const subscribe = createEvent();
const request = createEvent<Account[]>();

const { tick: pollingRequest } = interval({
  start: subscribe,
  timeout: MULTISIG_DISCOVERY_TIMEOUT,
});

const updateRequested = sample({
  clock: [pollingRequest, networkModel.events.connectionsPopulated, walletModel.$allWallets.updates],
  source: walletModel.$allWallets,
  fn: (wallets) => {
    const filteredWallets =
      walletUtils.getWalletsFilteredAccounts(wallets, {
        walletFn: (w) => !walletUtils.isMultisig(w) && !walletUtils.isWatchOnly(w) && !walletUtils.isProxied(w),
      }) ?? [];

    return walletUtils.getAllAccounts(filteredWallets);
  },
});

const $multisigChains = combine(
  { chains: networkModel.$chains, connections: networkModel.$connections },
  ({ chains, connections }) => {
    const possibleChains = Object.values(chains).filter((chain) =>
      nonNullable(networkUtils.getProxyExternalApi(chain)),
    );
    const connectedChains = possibleChains.filter(
      (chain) => connections[chain.chainId] && !networkUtils.isDisabledConnection(connections[chain.chainId]),
    );

    return connectedChains;
  },
);

type GetMultisigsParams = {
  chains: Chain[];
  accounts: Account[];
  proxies: Record<ChainId, ProxyAccount[]>;
};

type MultisigResponse = {
  type: 'multisig';
  account: NoID<Omit<MultisigAccount, 'walletId'>>;
  chain: Chain;
};

type FlexibleMultisigResponse = {
  type: 'flexibleMultisig';
  account: NoID<Omit<FlexibleMultisigAccount, 'walletId'>>;
  chain: Chain;
};

type GetMultisigResponse = MultisigResponse | FlexibleMultisigResponse;

const getMultisigsFx = createEffect(
  ({ chains, accounts, proxies }: GetMultisigsParams): Promise<GetMultisigResponse[]> => {
    const requests = chains.map(async (chain) => {
      const multisigIndexer = networkUtils.getProxyExternalApi(chain);

      if (nullable(multisigIndexer) || accounts.length === 0) return [];

      const client = new GraphQLClient(multisigIndexer.url);
      const accountIds = accounts.map((account) => account.accountId);
      const accountsMap = toKeysRecord(accountIds);

      const indexedMultisigs = await multisigService.filterMultisigsAccounts(client, accountIds);

      return (
        indexedMultisigs
          // filter out multisigs that already exists
          .filter((multisigResult) => !(multisigResult.accountId in accountsMap))
          .map(({ threshold, accountId, signatories }): GetMultisigResponse => {
            const proxiesList = proxies[accountId];
            const proxy =
              nonNullable(proxiesList) && proxiesList.length > 0
                ? proxiesList.find((p) => {
                    return p.chainId === chain.chainId && p.proxyType === 'Any';
                  })
                : null;

            if (proxy) {
              return {
                type: 'flexibleMultisig',
                account: multisigUtils.buildFlexibleMultisigAccount({
                  threshold,
                  proxyAccountId: proxy.accountId,
                  accountId,
                  signatories,
                  chain,
                }),
                chain,
              };
            }

            return {
              type: 'multisig',
              account: multisigUtils.buildMultisigAccount({ threshold, accountId, signatories, chain }),
              chain,
            };
          })
      );
    });

    return Promise.all(requests).then((res) => res.flat());
  },
);

const populateMultisigWalletFx = createEffect(({ account, chain }: MultisigResponse) => {
  const walletName = toAddress(account.accountId, { chunk: 5, prefix: chain.addressPrefix });
  const wallet: NoID<Omit<MultisigWallet, 'accounts' | 'isActive'>> = {
    name: walletName,
    type: WalletType.MULTISIG,
    signingType: SigningType.MULTISIG,
  };

  return {
    wallet,
    accounts: [account],
  };
});

const populateFlexibleMultisigWalletFx = createEffect(({ account, chain }: FlexibleMultisigResponse) => {
  const walletName = toAddress(account.accountId, { chunk: 5, prefix: chain.addressPrefix });
  const wallet: NoID<Omit<FlexibleMultisigWallet, 'accounts' | 'isActive'>> = {
    name: walletName,
    type: WalletType.FLEXIBLE_MULTISIG,
    signingType: SigningType.MULTISIG,
  };

  return {
    wallet,
    accounts: [account],
  };
});

sample({
  clock: [updateRequested, request],
  source: { chains: $multisigChains, proxies: proxyModel.$proxies },
  fn: ({ chains, proxies }, accounts) => ({ chains, accounts, proxies }),
  target: getMultisigsFx,
});

const populateWallet = createEvent<GetMultisigResponse>();

sample({
  clock: getMultisigsFx.doneData,
  target: series(populateWallet),
});

const populateMultisigWallet = populateWallet.filter({
  fn: (x) => x.type === 'multisig',
});

const populateFlexibleMultisigWallet = populateWallet.filter({
  fn: (x) => x.type === 'flexibleMultisig',
});

sample({
  clock: populateMultisigWallet,
  target: populateMultisigWalletFx,
});

sample({
  clock: populateFlexibleMultisigWallet,
  target: populateFlexibleMultisigWalletFx,
});

sample({
  clock: populateMultisigWalletFx.doneData,
  target: walletModel.events.multisigCreated,
});

sample({
  clock: populateFlexibleMultisigWalletFx.doneData,
  target: walletModel.events.flexibleMultisigCreated,
});

sample({
  clock: populateMultisigWalletFx.doneData,
  fn: ({ accounts }) => {
    return accounts.map<NoID<MultisigCreated>>((account) => {
      return {
        read: false,
        type: NotificationType.MULTISIG_CREATED,
        dateCreated: Date.now(),
        multisigAccountId: account.accountId,
        multisigAccountName: account.name,
        chainId: account.chainId,
        signatories: account.signatories.map((signatory) => signatory.accountId),
        threshold: account.threshold,
      };
    });
  },
  target: notificationModel.events.notificationsAdded,
});

sample({
  clock: populateFlexibleMultisigWalletFx.doneData,
  fn: ({ accounts }) => {
    return accounts.map<NoID<FlexibleMultisigCreated>>((account) => {
      return {
        read: false,
        type: NotificationType.FLEXIBLE_MULTISIG_CREATED,
        dateCreated: Date.now(),
        multisigAccountId: account.accountId,
        multisigAccountName: account.name,
        proxyAccountId: account.proxyAccountId,
        chainId: account.chainId,
        signatories: account.signatories.map((signatory) => signatory.accountId),
        threshold: account.threshold,
      };
    });
  },
  target: notificationModel.events.notificationsAdded,
});

export const multisigsModel = {
  events: {
    subscribe,
    request,
  },
};
