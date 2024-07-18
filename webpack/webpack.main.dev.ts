import { resolve } from 'path';

import { type Configuration, type Configuration as WpConfig } from 'webpack';
import { type Configuration as WdsConfig } from 'webpack-dev-server';
import { merge } from 'webpack-merge';

import { APP_CONFIG } from '../app.config';

import sharedConfig from './webpack.shared';

const { FOLDERS } = APP_CONFIG;

const config: Configuration = merge<WpConfig & WdsConfig>(sharedConfig, {
  mode: 'development',
  target: 'electron-main',
  devtool: 'inline-source-map',

  entry: {
    main: resolve(FOLDERS.ENTRY_POINTS.MAIN),
    bridge: resolve(FOLDERS.ENTRY_POINTS.BRIDGE),
  },

  output: {
    path: resolve(FOLDERS.DEV_BUILD),
    filename: '[name].js',
  },

  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'swc-loader',
            options: {
              sourceMaps: true,
              jsc: {
                parser: {
                  target: 'es2021',
                  syntax: 'typescript',
                  dynamicImport: true,
                  allowJs: true,
                },
              },
            },
          },
        ],
      },
    ],
  },
});

export default config;
