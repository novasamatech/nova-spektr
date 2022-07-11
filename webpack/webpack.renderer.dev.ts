import { resolve } from 'path';
import { merge } from 'webpack-merge';
import webpack, { Configuration as WpConfig } from 'webpack';
import { Configuration as WdsConfig } from 'webpack-dev-server';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';

import sharedConfig from './webpack.shared';
import { APP_CONFIG } from '../app.config';

const { FOLDERS, RENDERER } = APP_CONFIG;
const port = RENDERER.DEV_SERVER.URL.split(':')?.[2] || 3000;

const config = merge<WpConfig & WdsConfig>(sharedConfig, {
  mode: 'development',
  target: 'web',

  entry: resolve(FOLDERS.ENTRY_POINTS.RENDERER),

  devServer: {
    port,
    historyApiFallback: true,
    compress: true,
    hot: true,
    client: {
      overlay: true,
    },
  },

  output: {
    path: resolve(FOLDERS.DEV_BUILD),
    filename: 'renderer.js',
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(js|ts|tsx|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'swc-loader',
            options: {
              jsc: { transform: { react: { development: true, refresh: true } } },
            },
          },
        ],
      },
    ],
  },

  plugins: [
    new ReactRefreshWebpackPlugin(),

    new webpack.DefinePlugin({
      process: JSON.stringify({
        platform: process.platform,
      }),
    }),

    new HTMLWebpackPlugin({
      template: resolve(FOLDERS.INDEX_HTML),
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
      isBrowser: false,
      isDevelopment: true,
    }),
  ],
});

export default config;
