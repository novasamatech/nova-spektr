import { resolve } from 'path';
import { merge } from 'webpack-merge';
import webpack, { Configuration as WpConfig } from 'webpack';
import { Configuration as WdsConfig } from 'webpack-dev-server';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';

import sharedConfig from './webpack.shared';
import { APP_CONFIG } from '../app.config';

const { FOLDERS, RENDERER } = APP_CONFIG;

const config = merge<WpConfig & WdsConfig>(sharedConfig, {
  mode: 'development',
  target: 'web',
  devtool: 'inline-source-map',

  entry: resolve(FOLDERS.ENTRY_POINTS.RENDERER),

  devServer: {
    port: RENDERER.DEV_SERVER.PORT,
    historyApiFallback: true,
    compress: true,
    hot: true,
    server: {
      type: 'https',
    },
    allowedHosts: 'all',
    client: {
      overlay: false,
    },

    devMiddleware: {
      writeToDisk: true,
    },
  },

  output: {
    path: resolve(FOLDERS.DEV_BUILD),
    filename: 'renderer-[fullhash].js',
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },

  plugins: [
    new ReactRefreshWebpackPlugin({ overlay: false }),

    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
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
