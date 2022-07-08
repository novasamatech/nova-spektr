/* eslint-disable import/default */
import webpack from 'webpack';
import { resolve } from 'path';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';

import { isDev } from './utils';
import sharedConfig from './webpack.shared';
import { APP_CONFIG } from '../app.config';

const { FOLDERS, RENDERER } = APP_CONFIG;

const config = {
  target: 'web',
  entry: resolve(FOLDERS.ENTRY_POINTS.RENDERER),

  ...sharedConfig,

  resolve: {
    ...sharedConfig.resolve,
    alias: {
      react: resolve('node_modules', 'react'),
    },
  },

  devServer: {
    port: RENDERER.DEV_SERVER.URL.split(':')?.[2],
    historyApiFallback: true,
    compress: true,
    hot: true,
    client: {
      overlay: true,
    },
  },

  output: {
    path: resolve(FOLDERS.DEV_TEMP_BUILD),
    filename: 'renderer.js',
  },

  module: {
    rules: [
      ...(sharedConfig.module?.rules || []),

      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve('swc-loader'),
            options: {
              jsc: {
                transform: {
                  react: {
                    development: isDev,
                    refresh: isDev,
                  },
                },
              },
            },
          },
        ],
      },

      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },

      {
        test: /\.(woff2|png|jpeg|gif|webp)$/,
        type: 'asset/resource',
      },

      {
        test: /\.svg$/,
        issuer: /\.[jt]sx?$/,
        loader: '@svgr/webpack',
      },
    ].filter(Boolean),
  },

  plugins: [
    ...(sharedConfig.plugins || []),

    isDev && new ReactRefreshWebpackPlugin(),

    new CopyPlugin({
      patterns: [
        {
          from: resolve(FOLDERS.RESOURCES),
          to: resolve(FOLDERS.DEV_TEMP_BUILD, 'resources'),
        },
      ],
    }),

    new webpack.DefinePlugin({
      process: JSON.stringify({
        platform: process.platform,
      }),
    }),

    new HTMLWebpackPlugin({
      template: resolve(FOLDERS.INDEX_HTML),
    }),

    // new webpack.DefinePlugin({
    //   __REACT_DEVTOOLS_GLOBAL_HOOK__: '({ isDisabled: true })',
    // }),
  ].filter(Boolean),
};

export default config;
