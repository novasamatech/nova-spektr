import '@/app/index.css';
import '@/app/styles/theme/default.css';
import '@/app/i18n';

import { I18Provider } from '@/app/providers';
import { ThemeProvider } from '@/shared/ui-kit';

import type { Preview } from '@storybook/react';

const preview: Preview = {
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
        <ThemeProvider>
          <Story />
        </ThemeProvider>
      );
    },
  ],
};

export default preview;

export const tags = ['autodocs'];
