import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SPEKTR_CONFIG_VERSION = process.env.CHAINS_VERSION || 'v1';
const CONFIG_PATH = 'src/renderer/shared/config/chains';
const SPEKTR_CONFIG_URL = `https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/chains/${SPEKTR_CONFIG_VERSION}/`;

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

async function getDataViaHttp(url, filePath) {
  try {
    const response = await fetch(url + filePath).then((r) => r.json());

    return response;
  } catch (error) {
    console.log('Error: ', error?.message || 'getDataViaHttp failed');
  }
}

async function saveNewFile(newJson, file_name) {
  try {
    await writeFile(resolve(CONFIG_PATH, file_name), JSON.stringify(newJson, null, 2));
  } catch (error) {
    console.log('Error: ', error?.message || '🛑 Something went wrong in writing file');
  }
}

async function buildFullChainsJSON() {
  CHAINS_ENV.forEach(async (chain) => {
    const spektrChainsConfig = await getDataViaHttp(SPEKTR_CONFIG_URL, chain);
    await saveNewFile(spektrChainsConfig, chain);
    console.log('Was successfuly generated for ' + chain);
  });
}

buildFullChainsJSON();
