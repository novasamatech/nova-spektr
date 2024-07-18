import { resolve } from 'path';

import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpack, { type Configuration as WpConfig } from 'webpack';
import { type Configuration as WdsConfig } from 'webpack-dev-server';
import { merge } from 'webpack-merge';

import { APP_CONFIG } from '../app.config';

import baseConfig from './webpack.shared';

const { FOLDERS } = APP_CONFIG;

const config = merge<WpConfig & WdsConfig>(baseConfig, {
  mode: 'production',
  target: 'web',

  entry: resolve(FOLDERS.ENTRY_POINTS.RENDERER),

  output: {
    path: resolve(FOLDERS.DEV_BUILD),
    filename: 'renderer-[fullhash].js',
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
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
    minimize: true,
    minimizer: [new CssMinimizerPlugin()],
  },

  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      DEBUG_PROD: false,
    }),

    new MiniCssExtractPlugin({
      filename: 'style-[fullhash].css',
    }),

    new HtmlWebpackPlugin({
      template: resolve(FOLDERS.INDEX_HTML),
      minify: {
        collapseWhitespace: true,
        removeComments: true,
      },
      isBrowser: false,
      isDevelopment: false,
    }),
  ],
});

export default config;
