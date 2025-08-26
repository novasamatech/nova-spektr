import { StorybookConfig } from '@storybook/react-vite';
import { resolve } from 'node:path';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        viteConfigPath: resolve('vite.config.renderer.ts'),
      },
    },
  },

  stories: ['./intro/*.mdx', '../src/**/*.mdx', '../src/renderer/**/*.stories.@(ts|tsx)'],

  addons: ['@storybook/addon-a11y', '@storybook/addon-links', '@storybook/addon-docs'],

  docs: {},

  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
