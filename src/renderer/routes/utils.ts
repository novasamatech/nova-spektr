import Paths from './paths';

/**
 * Create router link with url parameters
 * @param path key of existing Paths
 * @param params values to be inserted inside url
 * @param search query string params
 * @return {String}
 */
export const createLink = (
  path: keyof typeof Paths,
  params: Record<string, string | number>,
  search?: Record<string, string[] | number[]>,
): string => {
  const queryString = Object.entries(search || {})
    .map(([key, value]) => `${key}=${value.join(',')}`)
    .join('&');

  const pathWithParams = Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`:${key}`), value.toString());
  }, Paths[path]);

  return queryString ? `${pathWithParams}?${encodeURI(queryString)}` : pathWithParams;
};
