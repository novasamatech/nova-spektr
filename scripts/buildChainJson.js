const { resolve } = require('path');
const { writeFile } = require('fs/promises');
const axios = require('axios');

const tokenNames = require('./assetsNameMap.json');

const CONFIG_PATH = 'src/renderer/services/network/common';
const NOVA_CONFIG_URL = 'https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/v5/chains_dev.json';
const DO_NOT_SUPPORT_CHAINS = ['Moonriver', 'Moonbeam'];

async function getDataViaHttp(url) {
  return await axios
    .get(url)
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

async function saveNewFile(new_json) {
  try {
    await writeFile(resolve(CONFIG_PATH, 'full-chains.json'), JSON.stringify(new_json, null, 2));
  } catch ({ message }) {
    console.log(`
    🛑 Something went wrong!\n
      👀 Error: ${message}
    `);
  }
}

async function buildFullChainsJSON() {
  /*
  What we should to do:
  1. Get chains.json from nova-utils
  2. Modified all received data
  3. Save new file
  */

  const novaChainsConfig = await getDataViaHttp(NOVA_CONFIG_URL);
  const modifiedData = await modifydData(novaChainsConfig);
  await saveNewFile(modifiedData);
}

buildFullChainsJSON();
