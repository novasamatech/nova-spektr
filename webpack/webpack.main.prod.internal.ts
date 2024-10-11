import { resolve } from 'path';

import { type Configuration, type Configuration as WpConfig, default as webpack } from 'webpack';
import { type Configuration as WdsConfig } from 'webpack-dev-server';
import { merge } from 'webpack-merge';

import { APP_CONFIG } from '../app.config';

import { sharedConfig } from './webpack.shared';

const { FOLDERS } = APP_CONFIG;

const config: Configuration = merge<WpConfig & WdsConfig>(sharedConfig, {
  mode: 'production',
  target: 'electron-main',

  entry: {
    main: resolve(FOLDERS.ENTRY_POINTS.MAIN),
    bridge: resolve(FOLDERS.ENTRY_POINTS.BRIDGE),
  },

  output: {
    path: resolve(FOLDERS.DEV_BUILD),
    filename: '[name].js',
  },

  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      DEBUG_PROD: false,
      START_MINIMIZED: false,
    }),
  ],
});

export default config;
