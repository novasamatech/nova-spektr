import { resolve } from 'node:path';

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

import { folders } from '../config/index.js';
import pkg from '../package.json';

const docsDir = folders.docs;
const assetsDir = resolve(docsDir, 'assets');

export default defineConfig({
  srcDir: docsDir,
  outDir: folders.docsBuild,
  publicDir: assetsDir,
  integrations: [
    starlight({
      title: 'dev',
      logo: {
        light: resolve(assetsDir, 'logo-black.svg'),
        dark: resolve(assetsDir, 'logo-white.svg'),
      },
      social: [
        { icon: 'github', label: 'GitHub', href: pkg.repository },
        { icon: 'telegram', label: 'Telegram', href: 'https://t.me/NovaSpektr' },
        { icon: 'twitter', label: 'Twitter', href: 'https://x.com/NovaSpektr' },
      ],
      editLink: {
        baseUrl: `${pkg.repository}/edit/dev`,
      },
      customCss: ['@fontsource/inter', resolve(docsDir, 'styles/custom.css'), resolve(docsDir, 'styles/theme.css')],
      sidebar: [
        { label: 'Onboarding', autogenerate: { directory: 'onboarding' } },
        { label: 'Code style', autogenerate: { directory: 'code/style' } },
      ],
    }),
  ],
  vite: {
    ssr: {
      noExternal: [
        // incompatible with zod 4
        'zod',
        // nanoid doesn't have a default export
        'nanoid',
      ],
    },
  },
});
