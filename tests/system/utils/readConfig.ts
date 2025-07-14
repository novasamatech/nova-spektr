import fs from 'fs';
import url from 'node:url';

export async function readConfig(): Promise<any> {
  const chainsJsonURL = new URL('../../../src/renderer/shared/config/chains/chains_dev.json', import.meta.url);
  const chainsFilePath = url.fileURLToPath(chainsJsonURL);
  const chainsData = JSON.parse(fs.readFileSync(chainsFilePath, 'utf-8'));

  return chainsData;
}

export function getChainByName(chains: any[], name: string) {
  const chain = chains.find((chain) => chain.name === name);
  if (!chain) {
    throw new Error(`Chain with name "${name}" not found`);
  }
  return chain;
}
