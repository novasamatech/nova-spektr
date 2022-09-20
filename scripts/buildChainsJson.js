const { resolve } = require('path');
const { writeFile } = require('fs/promises');
const axios = require('axios');

const tokenNames = require('./assetsNameMap.json');

const NOVA_CONFIG_VERSION = process.env.CHAINS_VERSION || 'v5';
const CONFIG_PATH = 'src/renderer/services/network/common';
const NOVA_CONFIG_URL = `https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/${NOVA_CONFIG_VERSION}/`;

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

const DO_NOT_SUPPORT_CHAINS = ['Moonriver', 'Moonbeam'];

async function getDataViaHttp(url, filePath) {
  try {
    const response = await axios.get(url + filePath);

    return response.data;
  } catch (error) {
    console.log('Error: ', error?.message || 'getDataViaHttp failed');
  }
}

function getTransformedData(rawData) {
  return rawData.reduce((acc, chain) => {
    if (!DO_NOT_SUPPORT_CHAINS.includes(chain.name)) {
      chain.chainId = `0x${chain.chainId}`;
      if (chain.parentId) chain.parentId = `0x${chain.parentId}`;
      chain.assets.forEach((asset) => {
        asset.name = tokenNames[asset.symbol] || 'Should be included in assetsNameMap';
      });
      acc.push(chain);
    }

    return acc;
  }, []);
}

async function saveNewFile(newJson, file_name) {
  try {
    await writeFile(resolve(CONFIG_PATH, file_name), JSON.stringify(newJson, null, 2));
  } catch (error) {
    console.log('Error: ', error?.message || '🛑 Something went wrong in writing file');
  }
}

async function buildFullChainsJSON() {
  CHAINS_ENV.forEach(async function (chain) {
    const novaChainsConfig = await getDataViaHttp(NOVA_CONFIG_URL, chain);
    const modifiedData = await getTransformedData(novaChainsConfig);
    await saveNewFile(modifiedData, 'omni-' + chain);
    console.log('Was successfuly generated for ', chain);
  });
}

buildFullChainsJSON();
