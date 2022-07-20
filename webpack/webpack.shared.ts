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
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              svgoConfig: {
                plugins: [{ name: 'removeViewBox', active: false }],
              },
            },
          },
          {
            loader: 'file-loader',
            options: {
              name: '[name].[hash-8][ext]',
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
          filename: 'images/[name].[ext]',
        },
      },
      {
        test: /\.woff2$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[ext]',
        },
      },
    ],
  },

  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    plugins: [new TsconfigPathsPlugin({})],
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      // stream: require.resolve('stream-browserify'),
      // buffer: require.resolve('buffer'),
      // url: false,
      fs: false,
      path: false,
      stream: false,
    },
  },

  plugins: [
    new SimpleProgressWebpackPlugin({ format: 'minimal' }),

    // new webpack.ProvidePlugin({
    //   Buffer: ['buffer', 'Buffer'],
    // }),

    // new webpack.DefinePlugin({
    //   'process.env': {
    //     VERSION: JSON.stringify(getAppVersion()),
    //     PRODUCT_NAME: JSON.stringify(productName),
    //     WS_URL: JSON.stringify(process.env.WS_URL),
    //   },
    // }),
  ],
};

export default sharedConfig;
