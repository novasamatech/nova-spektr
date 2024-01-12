import { createEffect, createEvent, sample, scopeBind } from 'effector';
import { createEndpoint } from '@remote-ui/rpc';
import { keyBy } from 'lodash';
import { once, spread } from 'patronum';

import {
  Account,
  AccountId,
  AccountType,
  Chain,
  ChainId,
  ChainType,
  Connection,
  CryptoType,
  PartialProxiedAccount,
  ProxiedAccount,
  ProxyAccount,
  SigningType,
  Wallet,
  WalletType,
} from '@shared/core';
import { chainsService, isDisabled, networkModel } from '@entities/network';
import { proxyWorkerUtils } from '../lib/utils';
import { accountUtils, walletModel } from '@entities/wallet';
import { proxyModel, proxyUtils } from '@entities/proxy';
import { balanceModel } from '@entities/balance';

// @ts-ignore
const worker = new Worker(new URL('@features/proxies/workers/proxy-worker', import.meta.url));

const endpoint = createEndpoint(worker, {
  callable: ['initConnection', 'getProxies', 'disconnect'],
});

const connected = createEvent<ChainId>();
const proxiedAccountsRemoved = createEvent<ProxiedAccount[]>();

type StartChainsProps = {
  chains: Chain[];
  connections: Record<ChainId, Connection>;
};
const startChainsFx = createEffect(({ chains, connections }: StartChainsProps) => {
  const bindedConnected = scopeBind(connected, { safe: true });

  chains.forEach((chain) => {
    if (isDisabled(connections[chain.chainId])) return;

    endpoint.call.initConnection(chain, connections[chain.chainId]).then(() => {
      bindedConnected(chain.chainId);
    });
  });
});

type GetProxiesParams = {
  chainId: ChainId;
  accounts: Account[];
  proxies: ProxyAccount[];
};
type GetProxiesResult = {
  proxiesToAdd: ProxyAccount[];
  proxiesToRemove: ProxyAccount[];
  proxiedAccountsToAdd: PartialProxiedAccount[];
  proxiedAccountsToRemove: ProxiedAccount[];
  deposits: Record<AccountId, Record<ChainId, string>>;
};
const getProxiesFx = createEffect(({ chainId, accounts, proxies }: GetProxiesParams): Promise<GetProxiesResult> => {
  const proxiedAccounts = accounts.filter((a) => accountUtils.isProxiedAccount(a));
  const nonProxiedAccounts = keyBy(
    accounts.filter((a) => !accountUtils.isProxiedAccount(a)),
    'accountId',
  );

  return endpoint.call.getProxies(chainId, nonProxiedAccounts, proxiedAccounts, proxies) as Promise<GetProxiesResult>;
});

const disconnectFx = createEffect((chainId: ChainId): Promise<unknown> => {
  return endpoint.call.disconnect(chainId);
});

const createProxiedWalletsFx = createEffect(
  (proxiedAccounts: PartialProxiedAccount[]): { wallet: Wallet; accounts: ProxiedAccount[] }[] => {
    return proxiedAccounts.map((proxied) => {
      const walletName = proxyUtils.getProxiedName(proxied, chainsService.getChainById(proxied.chainId)?.addressPrefix);
      const wallet = {
        name: walletName,
        type: WalletType.PROXIED,
        signingType: SigningType.WATCH_ONLY,
      } as Wallet;

      const accounts = [
        {
          ...proxied,
          name: walletName,
          type: AccountType.PROXIED,
          // TODO: use chain data, when ethereum chains support
          chainType: ChainType.SUBSTRATE,
          cryptoType: CryptoType.SR25519,
        } as ProxiedAccount,
      ];

      return {
        wallet,
        accounts,
      };
    });
  },
);

sample({
  clock: once(networkModel.$connections),
  source: {
    connections: networkModel.$connections,
    chains: networkModel.$chains,
  },
  fn: ({ connections, chains }) => ({
    chains: Object.values(chains).filter(proxyWorkerUtils.isRegularProxy),
    connections,
  }),
  target: startChainsFx,
});

sample({
  clock: connected,
  source: {
    accounts: walletModel.$accounts,
    proxies: proxyModel.$proxies,
  },
  fn: ({ accounts, proxies }, chainId) => ({
    chainId,
    accounts: accounts.filter((a) => accountUtils.isChainIdMatch(a, chainId)),
    proxies: Object.values(proxies).flat(),
  }),
  target: getProxiesFx,
});

spread({
  source: getProxiesFx.doneData,
  targets: {
    proxiesToAdd: proxyModel.events.proxiesAdded,
    proxiesToRemove: proxyModel.events.proxiesRemoved,
    proxiedAccountsToAdd: createProxiedWalletsFx,
    proxiedAccountsToRemove: proxiedAccountsRemoved,
  },
});

sample({
  clock: createProxiedWalletsFx.doneData,
  target: walletModel.events.proxiedWalletsCreated,
});

sample({
  clock: proxiedAccountsRemoved,
  fn: (proxiedAccounts) => proxiedAccounts.map((p) => p.walletId),
  target: walletModel.events.walletsRemoved,
});

sample({
  clock: proxiedAccountsRemoved,
  fn: (proxiedAccounts) => proxiedAccounts.map((p) => p.accountId),
  target: balanceModel.events.accountsBalancesRemoved,
});

sample({
  clock: getProxiesFx.done,
  fn: ({ params: { chainId } }) => chainId,
  target: disconnectFx,
});

export const proxiesModel = {};
