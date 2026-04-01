/// <reference types="vite/client" />
/// <reference types="vitest" />

// SVG imports with ?jsx suffix (used by vite-plugin-svgr)
declare module '*.svg?jsx' {
  import { type ComponentProps, type FunctionComponent } from 'react';
  const ReactComponent: FunctionComponent<ComponentProps<'svg'> & { title?: string }>;
  export default ReactComponent;
}

// Raw imports for markdown files
declare module '*.md?raw' {
  const content: string;
  export default content;
}

// Packages with missing/broken type exports (tsgo is stricter about package.json exports)
declare module 'units-css';
declare module 'tailwindcss/dist/lib.mjs' {
  export type { Config } from 'tailwindcss';
}
