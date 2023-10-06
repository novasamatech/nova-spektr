const { resolve } = require('path');
const { writeFile } = require('fs/promises');

const packageJSON = require('../package.json');
const { APP_CONFIG } = require('../app.config');

async function createPackageJSONDistVersion() {
  const { main, scripts, dependencies, devDependencies, ...restOfPackageJSON } = packageJSON;

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
    await writeFile(
      resolve(APP_CONFIG.FOLDERS.DEV_BUILD, 'package.json'),
      JSON.stringify(packageJSONDistVersion, null, 2),
    );
  } catch ({ message }) {
    console.log(`
    🛑 Something went wrong!\n
      🧐 There was a problem creating the package.json dist version...\n
      👀 Error: ${message}
    `);
  }
}

createPackageJSONDistVersion();
