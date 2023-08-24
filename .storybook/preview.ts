import type { Preview } from '@storybook/react';
import '@renderer/app/index.css';
import '@renderer/app/styles/theme/default.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
