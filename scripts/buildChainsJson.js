const { resolve } = require('path');
const { writeFile } = require('fs/promises');
const axios = require('axios');

const tokenNames = require('./assetsNameMap.json');

const NOVA_CONFIG_VERSION = process.env.CHAINS_VERSION ? process.env.CHAINS_VERSION : 'v5';
const CONFIG_PATH = 'src/renderer/services/network/common';
const NOVA_CONFIG_URL = `https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/${NOVA_CONFIG_VERSION}/`;

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

const DO_NOT_SUPPORT_CHAINS = ['Moonriver', 'Moonbeam'];

async function getDataViaHttp(url, file_path) {
  return await axios
    .get(url + file_path)
    .then((res) => {
      return res.data;
    })
    .catch((err) => {
      console.log('Error: ', err.message);
    });
}

async function modifydData(rawData) {
  const newDataSet = rawData.map((chain) => {
    if (!DO_NOT_SUPPORT_CHAINS.includes(chain.name)) {
      chain.chainId = ['0x', chain.chainId].join('');
      chain.assets.forEach((asset) => {
        asset.name = tokenNames[asset.symbol] ? tokenNames[asset.symbol] : 'Need to add in assetsNameMap';
      });

      return chain;
    }

    return null;
  });

  return newDataSet.filter((chain) => {
    return chain != null;
  });
}

async function saveNewFile(new_json, file_name) {
  try {
    await writeFile(resolve(CONFIG_PATH, file_name), JSON.stringify(new_json, null, 2));
  } catch ({ message }) {
    console.log(`
    🛑 Something went wrong!\n
      👀 Error: ${message}
    `);
  }
}

async function buildFullChainsJSON() {
  CHAINS_ENV.forEach(async function (chain) {
    const novaChainsConfig = await getDataViaHttp(NOVA_CONFIG_URL, chain);
    const modifiedData = await modifydData(novaChainsConfig);
    await saveNewFile(modifiedData, 'omni-' + chain);
    console.log('Was successfuly generated for ', chain);
  });
}

buildFullChainsJSON();
