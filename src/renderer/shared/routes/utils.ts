import { type PathType } from './paths';

/**
 * Create route link with url parameters and query string
 *
 * @param path Key of existing Paths
 * @param params Url params
 * @param query Url query params
 *
 * @returns {String}
 */
type Param = Record<string, string | number>;
type Query = Record<string, (string | number)[]>;
export const createLink = (path: PathType, params: Param, query: Query = {}): string => {
  const urlWithParams = Object.entries(params).reduce<string>((acc, [key, value]) => {
    return acc.replace(new RegExp(`:${key}`), value.toString());
  }, path);

  const queryParts = Object.entries(query).reduce<string[]>((acc, [key, value]) => {
    acc.push(`${key}=${value.join(',')}`);

    return acc;
  }, []);

  return Object.keys(query).length > 0 ? `${urlWithParams}?${queryParts.join('&')}` : urlWithParams;
};
