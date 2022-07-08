// import path from 'path';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import SimpleProgressWebpackPlugin from 'simple-progress-webpack-plugin';
import { Configuration } from 'webpack';

import { isDev } from './utils';

const sharedConfig: Configuration = {
  mode: isDev ? 'development' : 'production',

  stats: 'minimal',

  performance: {
    hints: false,
  },

  devtool: 'source-map',
  // devtool: isDev ? 'eval-source-map' : 'source-map',

  resolve: {
    // alias: {
    //   '~': path.resolve(__dirname, ''),
    //
    //   '#': path.resolve(__dirname, 'src/'),
    //   '#main': path.resolve(__dirname, 'src/main/'),
    //   '#shared': path.resolve(__dirname, 'src/shared/'),
    //
    //   '@': path.resolve(__dirname, 'src/renderer/'),
    //   '@components': path.resolve(__dirname, 'src/renderer/components/'),
    //   '@assets': path.resolve(__dirname, 'src/renderer/assets/'),
    //   '@context': path.resolve(__dirname, 'src/renderer/context/'),
    //   '@screens': path.resolve(__dirname, 'src/renderer/screens/'),
    // },
    extensions: ['.tsx', '.ts', '.js', '.jsx', 'json'],
    plugins: [new TsconfigPathsPlugin({})],
  },

  optimization: {
    usedExports: true,
  },

  module: {
    rules: [
      {
        test: /\.(js|ts|tsx|jsx)$/,
        loader: 'swc-loader',
        exclude: /node_modules/,
      },
    ],
  },

  plugins: [new SimpleProgressWebpackPlugin({ format: 'minimal' })],
};

export default sharedConfig;
