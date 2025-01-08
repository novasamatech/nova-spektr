export const ENVIRONMENT = {
  RENDERER_SOURCE: process.env.RENDERER_SOURCE,
  IS_DEV: import.meta.env.MODE === 'development',
  IS_STAGE: import.meta.env.MODE === 'staging',
};
