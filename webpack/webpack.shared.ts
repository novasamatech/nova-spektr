import { Configuration } from 'webpack';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import SimpleProgressWebpackPlugin from 'simple-progress-webpack-plugin';

const sharedConfig: Configuration = {
  stats: 'errors-only',

  optimization: {
    usedExports: true,
  },

  module: {
    rules: [
      {
        test: /\.(js|ts|tsx|jsx)$/,
        exclude: /node_modules/,
        loader: 'swc-loader',
      },
      {
        test: /\.svg$/,
        use: [
          '@svgr/webpack',
          {
            loader: 'file-loader',
            options: {
              name: '[name]-[hash:8].[ext]',
              outputPath: 'images/',
            },
          },
        ],
      },
      {
        test: /\.(woff2|png|jpeg|gif|webp|wasm)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[ext]',
        },
      },
    ],
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx', 'json'],
    plugins: [new TsconfigPathsPlugin({})],
  },

  plugins: [new SimpleProgressWebpackPlugin({ format: 'minimal' })],

  // plugins: [
  //   new webpack.EnvironmentPlugin({
  //     NODE_ENV: 'production',
  //   }),
  //   new webpack.ProvidePlugin({
  //     Buffer: ['buffer', 'Buffer'],
  //   }),
  //   new webpack.DefinePlugin({
  //     'process.env': {
  //       // VERSION: JSON.stringify(getAppVersion()),
  //       PRODUCT_NAME: JSON.stringify(productName),
  //       WS_URL: JSON.stringify(process.env.WS_URL),
  //     },
  //   }),
  // ],
};

export default sharedConfig;
