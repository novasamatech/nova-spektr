import type { Config } from 'tailwindcss';

const fontSizes: Required<Config>['theme']['fontSize'] = {
  // EXTRA BOLD
  'large-title': ['1.625rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em', fontWeight: 800 }],
  title: ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.016em', fontWeight: 800 }],
  'header-title': ['1.0625rem', { lineHeight: '1.375rem', letterSpacing: '-0.013em', fontWeight: 800 }],
  'medium-title': ['1.0625rem', { lineHeight: '1.5rem', letterSpacing: '-0.016em', fontWeight: 800 }],
  'small-title': ['0.875rem', { lineHeight: '1.125rem', letterSpacing: '-0.013em', fontWeight: 800 }],

  // SEMI BOLD
  caption: ['0.625rem', { lineHeight: '0.75rem', letterSpacing: '0.75px', fontWeight: 600 }],
  'button-large': ['0.875rem', { lineHeight: '1.125rem', letterSpacing: '-0.01em', fontWeight: 600 }],
  'button-small': ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '-0.01em', fontWeight: 600 }],

  // MEDIUM
  headline: ['0.9375rem', { lineHeight: '1.375rem', letterSpacing: '-0.01em', fontWeight: 500 }],
  body: ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '-0.01em', fontWeight: 500 }],
  footnote: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '-0.01em', fontWeight: 500 }],
  'help-text': ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '-0.01em', fontWeight: 500 }],
};

export default fontSizes;
