import Client from '@walletconnect/sign-client';

import type { Chain, Wallet, Account } from '@shared/core';
import { walletUtils } from '@entities/wallet';
// TODO: resolve cross import
import { networkUtils } from '@entities/network';

export const walletConnectUtils = {
  getWalletConnectChains,
  isConnected,
  isConnectedByAccounts,
};

function getWalletConnectChains(chains: Chain[]): string[] {
  return chains
    .filter((c) => !networkUtils.isEthereumBased(c.options))
    .map((c) => `polkadot:${c.chainId.slice(2, 34)}`);
}

function isConnected(client: Client, sessionTopic: string): boolean {
  const sessions = client.session.getAll() || [];

  return sessions.some((session) => session.topic === sessionTopic);
}

function isConnectedByAccounts(client: Client, wallet: Wallet, accounts: Account[]): boolean {
  if (!walletUtils.isWalletConnectGroup(wallet)) return false;

  const account = accounts.find((a) => a.walletId === wallet.id);

  if (!account) return false;

  return walletConnectUtils.isConnected(client, account.signingExtras?.sessionTopic);
}
