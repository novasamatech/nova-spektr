import { combine, createEffect, createEvent, sample } from 'effector';
import { GraphQLClient } from 'graphql-request';
import { interval } from 'patronum';

import {
  type Account,
  type Chain,
  type MultisigAccount,
  type MultisigCreated,
  type MultisigWallet,
  type NoID,
  NotificationType,
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

type SaveMultisigParams = {
  wallet: Omit<NoID<Wallet>, 'isActive' | 'accounts'>;
  accounts: Omit<NoID<MultisigAccount>, 'walletId'>[];
  external: boolean;
};

const MULTISIG_DISCOVERY_TIMEOUT = 30000;

const multisigsDiscoveryStarted = createEvent();

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
};

type GetMultisigResponse = {
  account: CreatedMultisigAccount;
  chain: Chain;
};

type PopulatedMultisig = {
  wallet: NoID<Omit<MultisigWallet, 'accounts' | 'isActive'>>;
  account: CreatedMultisigAccount;
};

type CreatedMultisigAccount = NoID<Omit<MultisigAccount, 'walletId'>>;

const getMultisigsFx = createEffect(({ chains, accounts }: GetMultisigsParams): Promise<GetMultisigResponse[]> => {
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
        .map(({ threshold, accountId, signatories }) => ({
          account: multisigUtils.buildMultisigAccount({ threshold, accountId, signatories, chain }),
          chain,
        }))
    );
  });

  return Promise.all(requests).then((accounts) => accounts.flat());
});

const populateMultisigWalletFx = createEffect(({ account, chain }: GetMultisigResponse): PopulatedMultisig => {
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

const saveMultisigFx = createEffect(({ wallet, account }: PopulatedMultisig) => {
  walletModel.events.multisigCreated({
    wallet,
    accounts: [account],
  });

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

  notificationModel.events.notificationsAdded([event]);
});

const { tick: multisigsDiscoveryTriggered } = interval({
  start: multisigsDiscoveryStarted,
  timeout: MULTISIG_DISCOVERY_TIMEOUT,
});

const accountsUpdated = sample({
  clock: [multisigsDiscoveryTriggered, walletModel.$wallets, walletModel.$hiddenWallets],
  source: {
    chains: $multisigChains,
    wallets: walletModel.$allWallets,
    connections: networkModel.$connections,
  },
  fn: ({ chains, wallets, connections }) => {
    const filteredChains = chains.filter(
      (chain) => connections[chain.chainId] && !networkUtils.isDisabledConnection(connections[chain.chainId]),
    );

    return {
      chains: filteredChains,
      wallets: wallets,
    };
  },
});

sample({
  clock: accountsUpdated,
  source: $multisigChains,
  fn: (chains, accounts) => ({
    chains,
    accounts,
  }),
  target: getMultisigsFx,
});

sample({
  clock: getMultisigsFx.doneData,
  target: series(populateMultisigWalletFx),
});

sample({
  source: populateMultisigWalletFx.doneData,
  target: saveMultisigFx,
});

export const multisigsModel = {
  events: {
    multisigsDiscoveryStarted,
  },
};
