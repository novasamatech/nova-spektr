import type { StorybookConfig } from '@storybook/react-webpack5';

import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

const config: StorybookConfig = {
  framework: '@storybook/react-webpack5',

  stories: ['../src/**/*.mdx', '../src/renderer/**/*.stories.@(ts|tsx)'],

  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    {
      name: '@storybook/addon-styling-webpack',
      options: {
        rules: [
          {
            test: /\.css$/,
            use: [
              'style-loader',
              {
                loader: 'css-loader',
                options: { importLoaders: 1 },
              },
              {
                loader: 'postcss-loader',
                options: { implementation: require.resolve('postcss') },
              },
            ],
          },
        ],
      },
    },
    '@storybook/addon-webpack5-compiler-swc',
  ],

  // @ts-ignore
  swc: (config, options) => {
    return {
      ...config,
      jsc: {
        parser: {
          target: 'es2021',
          syntax: 'typescript',
          jsx: true,
          tsx: true,
          dynamicImport: true,
          allowJs: true,
        },
        transform: {
          react: {
            pragma: 'React.createElement',
            pragmaFrag: 'React.Fragment',
            throwIfNamespace: true,
            runtime: 'automatic',
          },
        },
      },
    };
  },

  webpackFinal: async (config) => {
    // @ts-ignore
    config.resolve.plugins = [new TsconfigPathsPlugin()];
    // @ts-ignore
    const storybookSvgLoader = config.module.rules.find(({ test }) => test?.test('.svg'));
    // @ts-ignore
    storybookSvgLoader.exclude = /svg$/;
    // @ts-ignore
    config.module.rules.push({
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
        'file-loader',
      ],
    });

    // @ts-ignore
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };

    return config;
  },

  docs: {},

  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
