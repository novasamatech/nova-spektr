const { resolve } = require('path');
const { writeFile, readFile } = require('fs/promises');

const CONFIG_PATH = 'src/renderer/services/network/common/chains';

function getUpdatedDevChains(oldConfig, newConfig) {
  const newConfigMap = newConfig.reduce((acc, config) => {
    return { ...acc, [config.chainId]: config };
  }, {});

  return oldConfig.reduce((acc, { chainId }) => {
    const updatedChain = newConfigMap[chainId];

    return updatedChain ? acc.concat(updatedChain) : acc;
  }, []);
}

async function saveNewFile(newJson, file_name) {
  try {
    await writeFile(resolve(CONFIG_PATH, file_name), JSON.stringify(newJson, null, 2));
  } catch (error) {
    console.log('Error: ', error?.message || '🛑 Something went wrong in writing file');
  }
}

async function readFileFromLocal(filePath) {
  try {
    const file = await readFile(filePath);

    return JSON.parse(file);
  } catch (error) {
    console.log('Error: ', error?.message || '🛑 Something went wrong in reading file');
  }
}

async function updateDevChainsJson() {
  const devChainsConfig = await readFileFromLocal(CONFIG_PATH + '/chains.json');
  const updatedChainsConfig = await readFileFromLocal(CONFIG_PATH + '/omni-chains_dev.json');
  const modifiedData = getUpdatedDevChains(devChainsConfig, updatedChainsConfig);
  await saveNewFile(modifiedData, 'chains.json');
  console.log('chains.json was successfuly updated');
}

updateDevChainsJson();
