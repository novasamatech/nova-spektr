export const ENVIRONMENT = {
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_STAGE: process.env.NODE_ENV === 'staging',
  IS_FORCE_ELECTRON: process.env.FORCE_ELECTRON === 'true',
};
