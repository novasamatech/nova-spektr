import type Provider from '@walletconnect/universal-provider';

import { type Chain, type ChainId, type Wallet } from '@/shared/core';
import { walletUtils } from '@/entities/wallet';

import { FIRST_CHAIN_ID_SYMBOL, LAST_CHAIN_ID_SYMBOL } from './constants';

export const walletConnectUtils = {
  getWalletConnectChains,
  getWalletConnectChainId,
  isConnected,
  isConnectedByAccounts,
};

function getWalletConnectChains(chains: Chain[]): string[] {
  return chains.map((c) => getWalletConnectChainId(c.chainId));
}

function getWalletConnectChainId(chainId: ChainId): string {
  return `polkadot:${chainId.slice(FIRST_CHAIN_ID_SYMBOL, LAST_CHAIN_ID_SYMBOL)}`;
}

function isConnected(provider: Provider, sessionTopic: string): boolean {
  const sessions = provider.client.session.getAll() || [];

  return sessions.some((session) => session.topic === sessionTopic);
}

function isConnectedByAccounts(provider: Provider, wallet: Wallet): boolean {
  if (!walletUtils.isWalletConnectGroup(wallet)) return false;

  return walletConnectUtils.isConnected(provider, wallet.accounts[0].signingExtras?.sessionTopic);
}
