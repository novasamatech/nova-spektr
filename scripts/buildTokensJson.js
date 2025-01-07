import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const SPEKTR_CONFIG_VERSION = process.env.TOKENS_VERSION || 'v1';
const CONFIG_PATH = 'src/renderer/shared/config/tokens';
const SPEKTR_CONFIG_URL = `https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/tokens/${SPEKTR_CONFIG_VERSION}/`;

const TOKENS_ENV = ['tokens_dev.json', 'tokens.json'];

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

async function buildFullTokensJSON() {
  TOKENS_ENV.forEach(async (token) => {
    const spektrTokensConfig = await getDataViaHttp(SPEKTR_CONFIG_URL, token);
    await saveNewFile(spektrTokensConfig, token);
    console.log('Was successfully generated for ' + token);
  });
}

buildFullTokensJSON();
