import Paths from './paths';

/**
 * Create router link with url parameters
 * @param path: key of existing Paths
 * @param params: values to be inserted inside url
 * @return {String}
 */
export const createLink = (path: keyof typeof Paths, params: Record<string, string | number>): string =>
  Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`:${key}`), value.toString());
  }, Paths[path]);
