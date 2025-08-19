import '@/app/index.css';
import '@/app/styles/theme/default.css';
import './theme/root.css';

import { I18Provider } from '@/shared/i18n';
import { ThemeProvider, NotificationProvider } from '@/shared/ui-kit';

import type { Preview } from '@storybook/react-vite';
import type { ThemeContextTheme } from '@/shared/ui-kit/Theme/ThemeContext';

const themes: ThemeContextTheme['theme'][] = ['light', 'dark'];
const defaultTheme: ThemeContextTheme['theme'] = 'light';

const iconStyles: ThemeContextTheme['iconStyle'][] = ['colored', 'monochrome'];
const defaultIconStyle: ThemeContextTheme['iconStyle'] = 'colored';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: themes,
        dynamicTitle: true,
      },
    },
    iconStyle: {
      description: 'Global style for icons',
      toolbar: {
        title: 'Icon style',
        icon: 'circlehollow',
        items: iconStyles,
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: defaultTheme,
    iconStyle: defaultIconStyle,
  },
  parameters: {
    backgrounds: { disable: true },
    options: {
      storySort: {
        method: 'alphabetical',
        order: ['Intro', 'Design System', ['kit', 'entities'], 'v1', ['ui', 'entities'], '*'],
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
        <NotificationProvider>
          <Story />
        </NotificationProvider>
      );
    },
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      const iconStyle = context.globals.iconStyle || 'colored';
      return (
        <ThemeProvider bodyAsPortalContainer iconStyle={iconStyle} theme={theme}>
          <Story />
        </ThemeProvider>
      );
    },
  ],
};

export default preview;

export const tags = ['autodocs'];
