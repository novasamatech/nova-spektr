const { resolve } = require('path');
const { writeFile } = require('fs/promises');
const axios = require('axios');

const tokenNames = require('./assetsNameMap.json');

const SPEKTR_CONFIG_VERSION = process.env.CHAINS_VERSION || 'v1';
const CONFIG_PATH = 'src/renderer/services/network/common/chains';
const SPEKTR_CONFIG_URL = `https://raw.githubusercontent.com/nova-wallet/nova-spektr-utils/main/chains/${SPEKTR_CONFIG_VERSION}/`;

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

async function getDataViaHttp(url, filePath) {
  try {
    const response = await axios.get(url + filePath);

    return response.data;
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
    await saveNewFile(spektrChainsConfig, 'omni-' + chain);
    console.log('Was successfuly generated for omni-' + chain);
  });
}

buildFullChainsJSON();
