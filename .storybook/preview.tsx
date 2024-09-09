import '@/app/index.css';
import '@/app/styles/theme/default.css';
import { ThemeProvider } from '@/shared/ui-kit';

import type { Preview } from '@storybook/react';

const preview: Preview = {
  decorators: [
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
