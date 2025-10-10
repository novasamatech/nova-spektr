/**
 * Get user's Operating System Uses new API User-Agent Client Hints and old
 * User-Agent as a fallback User-Agent is going to be deprecated soon
 *
 * @returns {String}
 */
export const getOperatingSystem = (): string => {
  // @ts-expect-error userAgentData is not defined
  const platform = navigator.userAgentData?.platform;

  if (platform) return platform;

  const appVersion = navigator.userAgent;
  if (appVersion.indexOf('Win') >= 0) return 'Windows';
  if (appVersion.indexOf('Mac') >= 0) return 'macOS';
  if (appVersion.indexOf('Linux') >= 0) return 'Linux';

  return 'Unknown';
};

export const IS_MAC = getOperatingSystem() === 'macOS';

export const isElectron = () => {
  return typeof window !== 'undefined' && typeof window.App === 'object';
};

export const isWeb = () => {
  return typeof window !== 'undefined' && typeof window.App === 'undefined';
};

export const isDev = () => {
  return import.meta.env.MODE === 'development';
};

export type PlatformType = 'web' | 'desktop-mac' | 'desktop-windows' | 'desktop-linux';

export const getPlatformType = (): PlatformType => {
  if (isElectron()) {
    const os = getOperatingSystem();
    switch (os) {
      case 'macOS':
        return 'desktop-mac';
      case 'Windows':
        return 'desktop-windows';
      case 'Linux':
        return 'desktop-linux';
      default:
        return 'desktop-linux';
    }
  }

  return 'web';
};
