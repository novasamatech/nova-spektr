import { resolve } from 'path';

import { default as CssMinimizerPlugin } from 'css-minimizer-webpack-plugin';
import { default as HtmlWebpackPlugin } from 'html-webpack-plugin';
import { default as MiniCssExtractPlugin } from 'mini-css-extract-plugin';
import { default as TerserPlugin } from 'terser-webpack-plugin';
import { default as webpack } from 'webpack';
import { merge } from 'webpack-merge';

import { APP_CONFIG } from '../app.config';

import { sharedConfig } from './webpack.shared';

const { FOLDERS } = APP_CONFIG;

export const sharedRendererConfig = (mode: 'development' | 'production') =>
  merge(sharedConfig, {
    mode,
    stats: 'errors-only',
    target: 'web',
    devtool: mode === 'development' ? 'source-map' : undefined,

    entry: resolve(FOLDERS.ENTRY_POINTS.RENDERER),

    output: {
      path: resolve(FOLDERS.DEV_BUILD),
      filename: '[name].[contenthash].js',
    },

    module: {
      rules: [
        {
          test: /\.css$/,
          use:
            mode === 'development'
              ? ['style-loader', 'css-loader', 'postcss-loader']
              : [
                  MiniCssExtractPlugin.loader,
                  {
                    loader: 'css-loader',
                    options: {
                      sourceMap: true,
                      importLoaders: 1,
                    },
                  },
                  'postcss-loader',
                ],
        },
      ],
    },

    optimization: {
      sideEffects: true,
      minimize: mode === 'production',
      minimizer: [
        new CssMinimizerPlugin({
          minimizerOptions: {
            preset: 'advanced',
          },
        }),
        new TerserPlugin(),
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          styles: {
            name: 'styles',
            test: /\.css$/,
            chunks: 'all',
            enforce: true,
          },
        },
      },
    },

    plugins: [
      new webpack.EnvironmentPlugin({
        NODE_ENV: mode,
        DEBUG_PROD: false,
      }),

      mode === 'production'
        ? new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
          })
        : null,

      new HtmlWebpackPlugin({
        template: resolve(FOLDERS.INDEX_HTML),
        minify: {
          collapseWhitespace: true,
          removeComments: true,
        },
        isBrowser: false,
        isDevelopment: mode === 'development',
      }),
    ].filter((x) => x !== null),
  });
