const { resolve } = require('path');
const { writeFile } = require('fs/promises');
const axios = require('axios');

const tokenNames = require('./assetsNameMap.json');

const NOVA_CONFIG_VERSION = process.env.CHAINS_VERSION || 'v10';
const CONFIG_PATH = 'src/renderer/services/network/common/chains';
const NOVA_CONFIG_URL = `https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/${NOVA_CONFIG_VERSION}/`;

const CHAINS_ENV = ['chains_dev.json', 'chains.json'];

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
    if (!chain.options?.includes('ethereumBased')) {
      chain.chainId = `0x${chain.chainId}`;
      if (chain.parentId) chain.parentId = `0x${chain.parentId}`;
      chain.assets.forEach((asset) => {
        asset.name = tokenNames[asset.symbol] || 'Should be included in assetsNameMap';
      });

      // Update Subscan explorer object
      if (chain.explorers) {
        const subscanExplorer = chain.explorers.find((explorer) => explorer.name === 'Subscan');
        if (subscanExplorer) {
          const accountParam = subscanExplorer.account;
          const domain = accountParam.substring(0, accountParam.indexOf('account'));
          subscanExplorer.multisig = `${domain}multisig_extrinsic/{index}?call_hash={callHash}`;
        }
      }

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
  CHAINS_ENV.forEach(async (chain) => {
    const novaChainsConfig = await getDataViaHttp(NOVA_CONFIG_URL, chain);
    const modifiedData = await getTransformedData(novaChainsConfig);
    await saveNewFile(modifiedData, 'omni-' + chain);
    console.log('Was successfuly generated for omni-' + chain);
  });
}

buildFullChainsJSON();
