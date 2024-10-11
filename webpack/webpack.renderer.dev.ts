import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { merge } from 'webpack-merge';

import { APP_CONFIG } from '../app.config';

import { sharedRendererConfig } from './webpack.renderer.shared';

const config = merge(sharedRendererConfig('development'), {
  devServer: {
    port: APP_CONFIG.RENDERER.DEV_SERVER.PORT,
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
      writeToDisk: false,
    },
  },

  plugins: [new ReactRefreshWebpackPlugin({ overlay: false })],
});

export default config;
