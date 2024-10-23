import '@/app/index.css';
import '@/app/styles/theme/default.css';

import { I18Provider } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/ui-kit';

import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        method: 'alphabetical',
        order: ['Design System', ['kit', 'entities'], 'v1', ['ui', 'entities'], '*'],
      },
    },
  },
  decorators: [
    (Story) => {
      return (
        <I18Provider>
          <Story />
        </I18Provider>
      );
    },
    (Story) => {
      return (
        <ThemeProvider bodyAsPortalContainer>
          <Story />
        </ThemeProvider>
      );
    },
  ],
};

export default preview;

export const tags = ['autodocs'];
