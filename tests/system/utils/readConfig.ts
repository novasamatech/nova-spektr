import fs from 'fs';
import url from 'node:url';

export async function readConfig(): Promise<any> {
  const chainsJsonURL = new URL('../../../src/renderer/shared/config/chains/chains.json', import.meta.url);
  const chainsFilePath = url.fileURLToPath(chainsJsonURL);
  const chainsData = JSON.parse(fs.readFileSync(chainsFilePath, 'utf-8'));

  return chainsData;
}
