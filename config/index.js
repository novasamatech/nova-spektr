import { resolve } from 'node:path';

import packageJson from '../package.json' with { type: 'json' };

const { author: AUTHOR, description: DESCRIPTION, name: NAME, version: VERSION } = packageJson;

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

// TODO: Revert to 3000
const rendererUrl = new URL('https://localhost:4000');

export const renderer = {
  server: {
    origin: rendererUrl.origin,
    protocol: rendererUrl.protocol,
    host: rendererUrl.hostname,
    port: parseInt(rendererUrl.port),
  },
};

export const folders = {
  entrypoint: {
    main: resolve('src/main/index.ts'),
    preload: resolve('src/main/preload.ts'),
    renderer: resolve('src/renderer/app/index.html'),
  },

  root: resolve('./'),
  source: resolve('./src'),
  mainRoot: resolve('src/main'),
  rendererRoot: resolve('src/renderer'),
  resources: resolve('src/main/resources'),
  docs: resolve('docs'),

  devBuild: resolve('release/build'),
  prodBuild: resolve('release/dist'),
  storybookBuild: resolve('release/storybook'),
  docsBuild: resolve('release/docs'),

  coverage: resolve('./.coverage'),
  cache: resolve('./node_modules/.cache'),
};
