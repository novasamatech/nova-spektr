import { type Chain } from '@/shared/core';
import { CHAINS_CONFIG_URL } from '../BaseTestConfig';

export async function readConfig(): Promise<Chain[]> {
  const response = await fetch(CHAINS_CONFIG_URL);
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
