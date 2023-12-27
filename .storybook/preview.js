import '@renderer/app/index.css';
import '@renderer/app/styles/theme/default.css';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
      // disabled: /Boolean$/,
    },
  },
};
