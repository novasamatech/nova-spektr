import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { folders } from '../config/index.js';

const packageJSON = JSON.parse(readFileSync('./package.json', { encoding: 'utf-8' }));

async function createPackageJSONDistVersion() {
  // eslint-disable-next-line no-unused-vars
  const {
    main,
    scripts: _1,
    dependencies: _2,
    devDependencies: _3,
    sideEffects: _4,
    engines: _5,
    ...restOfPackageJSON
  } = packageJSON;

  const entry = main?.split('/')?.reverse()?.[0];
  const packageJSONDistVersion = {
    main: entry || 'main.js',
    ...restOfPackageJSON,
  };

  // Check if the script was run with the 'staging' argument
  if (process.argv.includes('staging')) {
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
