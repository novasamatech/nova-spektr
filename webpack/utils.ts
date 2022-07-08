/**
 * Is DEV environment
 */
export const isDev = process.env.NODE_ENV !== 'production';

/**
 * Is webpack module available
 * @param moduleName webpack module name
 */
export function isModuleAvailable(moduleName: string): boolean | never {
  try {
    return Boolean(require.resolve(moduleName));
  } catch {
    return false;
  }
}
