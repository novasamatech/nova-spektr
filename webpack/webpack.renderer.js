const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const { resolve } = require('path');

const { sharedOptions } = require('./webpack.shared');
const { isDev } = require('./utils');
const { APP_CONFIG } = require('../app.config');

const { FOLDERS, RENDERER } = APP_CONFIG;

module.exports = {
  target: 'web',
  entry: resolve(FOLDERS.ENTRY_POINTS.RENDERER),

  ...sharedOptions,

  resolve: {
    ...sharedOptions.resolve,
    alias: {
      ...sharedOptions.resolve.alias,
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
      ...sharedOptions.module.rules,

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
        test: /\.(woff2|png|jpe?g|gif|webp)$/,
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
    ...sharedOptions.plugins,

    isDev && new ReactRefreshWebpackPlugin(),

    new CopyWebpackPlugin({
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
