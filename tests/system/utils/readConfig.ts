import { type Chain } from '@/shared/core';
import { CHAINS_CONFIG_BASE_URL } from '@/shared/lib/utils';

export async function readConfig(): Promise<Chain[]> {
  const CHAINS_FILE = (process.env.CHAINS_FILE || 'chains') + '.json';
  const CONFIG_VERSION = process.env.CHAINS_VERSION || 'v1';
  const CONFIG_URL = `${CHAINS_CONFIG_BASE_URL}/${CONFIG_VERSION}/${CHAINS_FILE}`;

  const response = await fetch(CONFIG_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch chains config: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export function getChainByName(chains: Pick<Chain, 'name'>[], name: string) {
  const chain = chains.find((chain) => chain.name === name);
  if (!chain) {
    throw new Error(`Chain with name "${name}" not found`);
  }
  return chain;
}
