import process from 'process';

export const checkAutoUpdateSupported = (): boolean => {
  const supportedBuildSources = ['github'];

  return !!process.env.BUILD_SOURCE && supportedBuildSources.includes(process.env.BUILD_SOURCE);
};
