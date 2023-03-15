/**
 * Get user's Operating System
 * Uses new API User-Agent Client Hints and old User-Agent as a fallback
 * User-Agent is going to be deprecated soon
 * @return {String}
 */
export const getOperatingSystem = (): string => {
  // @ts-ignore
  const platform = window.navigator.userAgentData.platform;

  if (platform) return platform;

  const appVersion = navigator.appVersion;
  if (appVersion.indexOf('Win') >= 0) return 'Windows';
  if (appVersion.indexOf('Mac') >= 0) return 'macOS';
  if (appVersion.indexOf('Linux') >= 0) return 'Linux';

  return 'Unknown';
};
