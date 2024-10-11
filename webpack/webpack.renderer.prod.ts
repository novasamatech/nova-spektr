import { type Configuration as WpConfig } from 'webpack';
import { type Configuration as WdsConfig } from 'webpack-dev-server';
import { merge } from 'webpack-merge';

import { sharedRendererConfig } from './webpack.renderer.shared';

const config = merge<WpConfig & WdsConfig>(sharedRendererConfig('production'), {
  stats: 'errors-warnings',
});

export default config;
