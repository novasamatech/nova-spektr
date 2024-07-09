const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    {
      name: '@storybook/addon-postcss',
      options: {
        cssLoaderOptions: {
          // When you have splitted your css over multiple files
          // and use @import('./other-styles.css')
          importLoaders: 1,
        },
        postcssLoaderOptions: {
          // When using postCSS 8
          implementation: require('postcss'),
        },
      },
    },
  ],
  framework: '@storybook/react',
  core: {
    builder: 'webpack5',
  },
  webpackFinal: async (config) => {
    config.resolve.plugins = [new TsconfigPathsPlugin()];

    const storybookSvgLoader = config.module.rules.find(({ test }) => test?.test('.svg'));
    storybookSvgLoader.exclude = /svg$/;
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

    config.resolve.fallback = { ...config.resolve.fallback, fs: false }

    // const assetRule = config.module.rules.find(({ test }) => test?.test('.svg'));
    //
    // const assetLoader = {
    //   loader: assetRule.loader,
    //   options: assetRule.options || assetRule.query
    // };
    //
    // // Merge our rule with existing assetLoader rules
    // config.module.rules.unshift({
    //   test: /\.svg$/,
    //   use: ["@svgr/webpack", assetLoader]
    // });

    return config;
  },
};
