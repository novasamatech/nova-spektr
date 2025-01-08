// const path = require('node:path');
// const { execSync } = require('node:child_process');

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const packageJson = readFileSync('package.json', { encoding: 'utf-8' });
const { author: AUTHOR, description: DESCRIPTION, name: NAME, version: VERSION } = JSON.parse(packageJson);

const AUTHOR_IN_KEBAB_CASE = AUTHOR.name.replace(/\s+/g, '-');

export const name = NAME;
export const author = AUTHOR;
export const version = VERSION;
export const description = DESCRIPTION;
export const electronProtocol =
  process.env.NODE_ENV === 'staging' ? `${NAME.replace('-', '')}-stage` : NAME.replace('-', '');
export const title = process.env.NODE_ENV === 'staging' ? 'Nova Spektr Stage' : 'Nova Spektr';
export const appId =
  process.env.NODE_ENV === 'staging'
    ? `com.${AUTHOR_IN_KEBAB_CASE}.${NAME}.stage`.toLowerCase()
    : `com.${AUTHOR_IN_KEBAB_CASE}.${NAME}`.toLowerCase();

export const main = {
  window: {
    width: 1024,
    height: 800,
  },
};

export const renderer = {
  server: {
    protocol: 'https://',
    host: 'localhost',
    port: 3000,
  },
};

export const folders = {
  entrypoint: {
    main: resolve('src/main/index.ts'),
    bridge: resolve('src/main/shared/bridge.ts'),
    renderer: resolve('src/renderer/app/index.html'),
  },

  root: resolve('./'),
  source: resolve('./src'),
  mainRoot: resolve('src/main'),
  rendererRoot: resolve('src/renderer'),
  resources: resolve('src/main/resources'),

  devBuild: resolve('release/build'),
  prodBuild: resolve('release/dist'),
  storybookBuild: resolve('release/storybook'),

  coverage: resolve('./.coverage'),
  cache: resolve('./node_modules/.cache'),
};
