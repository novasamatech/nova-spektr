const { writeFile } = require('fs/promises');
const { resolve } = require('path');

const { folders } = require('../config/index.mjs');
const packageJSON = require('../package.json');

async function createPackageJSONDistVersion() {
  // eslint-disable-next-line no-unused-vars
  const { main, scripts: _1, dependencies: _2, devDependencies: _3, ...restOfPackageJSON } = packageJSON;

  const entry = main?.split('/')?.reverse()?.[0];
  const packageJSONDistVersion = {
    main: entry || 'main.js',
    ...restOfPackageJSON,
  };

  // Check if the script was run with the 'stage' argument
  if (process.argv.includes('stage')) {
    packageJSONDistVersion.name += '-stage';
  }

  try {
    await writeFile(resolve(folders.devBuild, 'package.json'), JSON.stringify(packageJSONDistVersion, null, 2));
  } catch ({ message }) {
    console.log(`
    🛑 Something went wrong!\n
      🧐 There was a problem creating the package.json dist version...\n
      👀 Error: ${message}
    `);
  }
}

createPackageJSONDistVersion();
