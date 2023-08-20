import type { Config } from 'tailwindcss';

const fontSizes: Required<Config>['theme']['fontSize'] = {
  // HEADLINE
  // Used for titles and large ones (by visual weight) text blocks
  'large-title': ['1.875rem', { lineHeight: '2.5rem', fontWeight: 800 }], // 30/40px
  title: ['1.5rem', { lineHeight: '2rem', fontWeight: 800 }], // 24/32px
  'medium-title': ['1.125rem', { lineHeight: '1.5rem', fontWeight: 800 }], // 18/24px
  'small-title': ['1rem', { lineHeight: '1.25rem', fontWeight: 800 }], // 16/20px

  // BODY
  // Used for the main text and elements
  body: ['0.875rem', { lineHeight: '1.25rem', fontWeight: 500 }], // 14/20px
  footnote: ['0.75rem', { lineHeight: '1rem', fontWeight: 500 }], // 12/16px
  caption: ['0.625rem', { lineHeight: '0.75rem', letterSpacing: '0.04688rem', fontWeight: 600 }], // 10/12px
  'help-text': ['0.625rem', { lineHeight: '0.875rem', fontWeight: 500 }], // 10/12px
};

export default fontSizes;
