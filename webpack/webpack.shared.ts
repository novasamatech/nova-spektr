import { type Config as SwcConfig } from '@swc/core';
import { default as CopyPlugin } from 'copy-webpack-plugin';
import SimpleProgressWebpackPlugin from 'simple-progress-webpack-plugin';
import { default as TsconfigPathsPlugin } from 'tsconfig-paths-webpack-plugin';
import { type Configuration, default as webpack } from 'webpack';

import { APP_CONFIG } from '../app.config';

export const getSwcConfig = (isDev: boolean) => {
  const config: SwcConfig = {
    sourceMaps: isDev,
    minify: !isDev,
    env: {
      targets: '> 0.4%, electron >= 29, not dead',
    },
    jsc: {
      parser: {
        syntax: 'typescript',
        tsx: true,
      },
      transform: {
        react: {
          throwIfNamespace: true,
          runtime: 'automatic',
          development: isDev,
          refresh: isDev,
        },
      },
      experimental: {
        plugins: isDev ? [['@effector/swc-plugin', {}]] : [],
      },
    },
  };

  return config;
};

export const sharedConfig: Configuration = {
  stats: 'errors-only',

  module: {
    rules: [
      {
        test: /\.(ts|tsx|js)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'swc-loader',
            options: getSwcConfig(process.env.NODE_ENV === 'development'),
          },
        ],
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              jsxRuntime: 'classic',
              svgo: true,
              svgoConfig: {
                plugins: [
                  {
                    name: 'preset-default',
                    params: {
                      overrides: {
                        removeViewBox: false,
                      },
                    },
                  },
                ],
              },
            },
          },
          {
            loader: 'file-loader',
            options: {
              name: '[name].[contenthash].[ext]',
              outputPath: 'images/',
            },
          },
        ],
      },
      {
        test: /\.wasm$/,
        type: 'asset/resource',
      },
      {
        test: /\.(png|jpeg|gif|webp)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[contenthash][ext]',
        },
      },
      {
        test: /\.woff2$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]',
        },
      },
      {
        test: /\.(mp4|webm|yaml)$/,
        type: 'asset/resource',
        generator: {
          filename: 'video/[name].[contenthash][ext]',
        },
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    plugins: [new TsconfigPathsPlugin({})],
    alias: {
      lodash: 'lodash-es',
    },
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      fs: false,
      path: false,
    },
  },

  plugins: [
    new SimpleProgressWebpackPlugin({ format: 'minimal' }),

    new CopyPlugin({
      patterns: [{ from: 'node_modules/@matrix-org/olm/olm.wasm', to: '' }],
    }),

    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),

    new webpack.DefinePlugin({
      'process.env.PRODUCT_NAME': JSON.stringify(APP_CONFIG.TITLE),
      'process.env.VERSION': JSON.stringify(APP_CONFIG.VERSION),
      'process.env.BUILD_SOURCE': JSON.stringify(process.env.BUILD_SOURCE),
      'process.env.CHAINS_FILE': JSON.stringify(process.env.CHAINS_FILE),
      'process.env.TOKENS_FILE': JSON.stringify(process.env.TOKENS_FILE),
      'process.env.LOGGER': JSON.stringify(process.env.LOGGER),
    }),
  ],
};
