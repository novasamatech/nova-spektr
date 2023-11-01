import Client from '@walletconnect/sign-client';

import type { Chain } from '@renderer/shared/core';

export const walletConnectUtils = {
  getWalletConnectChains,
  isConnected,
};

function getWalletConnectChains(chains: Chain[]): string[] {
  return chains.map((c) => `polkadot:${c.chainId.slice(2, 34)}`);
}

function isConnected(sessionTopic: string, client: Client): boolean {
  const sessions = client.session.getAll() || [];

  return sessions.some((session) => session.topic === sessionTopic);
}
