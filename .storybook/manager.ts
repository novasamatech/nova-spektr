import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';
import logo from './theme/logo.svg'

const theme = create({
  base: 'dark',
  brandTitle: 'Spectr components library',
  brandUrl: '/',
  brandImage: logo,
  brandTarget: '_self',
  fontBase: '"Inter", sans-serif',
  colorPrimary: '#f8f8fa',
  barTextColor: '#f8f8fa',
  barHoverColor: '#f8f8fa',
});

addons.setConfig({
  theme: theme,
});
