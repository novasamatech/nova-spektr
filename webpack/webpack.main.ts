import { Configuration } from 'webpack';
import { resolve } from 'path';

import sharedConfig from './webpack.shared';
import { APP_CONFIG } from '../app.config';

const { FOLDERS } = APP_CONFIG;

const config: Configuration = {
  target: 'electron-main',

  ...sharedConfig,

  entry: {
    main: resolve(FOLDERS.ENTRY_POINTS.MAIN),
    bridge: resolve(FOLDERS.ENTRY_POINTS.BRIDGE),
  },

  output: {
    path: resolve(FOLDERS.DEV_TEMP_BUILD),
    filename: '[name].js',
  },
};

export default config;
