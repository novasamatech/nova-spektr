import { combine, createEffect, createEvent, sample } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { interval } from 'patronum';

import {
  type Account,
  type Chain,
  type ChainId,
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

type CreatedMultisigAccount = NoID<Omit<MultisigAccount, 'walletId'>>;

type GetMultisigResponse = {
  type: 'multisig' | 'flexibleMultisig';
  account: CreatedMultisigAccount;
  chain: Chain;
};

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
          .map(({ threshold, accountId, signatories }) => {
            const proxiesList = proxies[accountId];

            if (nullable(proxiesList) || proxiesList.length === 0) {
              return {
                type: 'multisig',
                account: multisigUtils.buildMultisigAccount({ threshold, accountId, signatories, chain }),
                chain,
              };
            }

            const proxy = proxiesList.find((p) => p.chainId === chain.chainId);
          })
      );
    });

    return Promise.all(requests).then((res) => res.flat());
  },
);

const populateMultisigWalletFx = createEffect(({ account, chain }: GetMultisigResponse) => {
  const wallet: NoID<Omit<MultisigWallet, 'accounts' | 'isActive'>> = {
    name: toAddress(account.accountId, { chunk: 5, prefix: chain.addressPrefix }),
    type: WalletType.MULTISIG,
    signingType: SigningType.MULTISIG,
  };

  return {
    wallet,
    account,
  };
});

sample({
  clock: [updateRequested, request],
  source: { chains: $multisigChains, proxies: proxyModel.$proxies },
  fn: ({ chains, proxies }, accounts) => ({ chains, accounts, proxies }),
  target: getMultisigsFx,
});

sample({
  clock: getMultisigsFx.doneData,
  target: series(populateMultisigWalletFx),
});

sample({
  source: populateMultisigWalletFx.doneData,
  fn: ({ wallet, account }) => ({
    wallet,
    accounts: [account],
  }),
  target: walletModel.events.multisigCreated,
});

sample({
  clock: populateMultisigWalletFx.doneData,
  fn: ({ wallet, account }) => {
    const signatories = account.signatories.map((signatory) => signatory.accountId);
    const event: NoID<MultisigCreated> = {
      read: false,
      type: NotificationType.MULTISIG_CREATED,
      dateCreated: Date.now(),
      multisigAccountId: account.accountId,
      multisigAccountName: wallet.name,
      chainId: account.chainId,
      signatories,
      threshold: account.threshold,
    };

    return event;
  },
  target: notificationModel.events.notificationAdded,
});

export const multisigsModel = {
  events: {
    subscribe,
    request,
  },
};
