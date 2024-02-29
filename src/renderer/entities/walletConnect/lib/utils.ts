import Client from '@walletconnect/sign-client';

import type { Chain, Wallet, Account } from '@shared/core';
import { walletUtils } from '../../wallet';

export const walletConnectUtils = {
  getWalletConnectChains,
  isConnected,
  isConnectedByAccounts,
};

function getWalletConnectChains(chains: Chain[]): string[] {
  return chains.map((c) => `polkadot:${c.chainId.slice(2, 34)}`);
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
