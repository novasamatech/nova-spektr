import { PathValue } from './paths';

/**
 * Create router link with url parameters
 * @param path key of existing Paths
 * @param params values to be inserted inside url
 * @return {String}
 */
type Param = Record<string, string | number>;
type Query = Record<string, (string | number)[]>;
export const createLink = (path: PathValue, params: Param, query: Query = {}): string => {
  const urlWithParams = Object.entries(params).reduce<string>((acc, [key, value]) => {
    return acc.replace(new RegExp(`:${key}`), value.toString());
  }, path);

  const queryParts = Object.entries(query).reduce<string[]>((acc, [key, value]) => {
    acc.push(`${key}=${value.join(',')}`);

    return acc;
  }, []);

  return Object.keys(query).length > 0 ? `${urlWithParams}?${queryParts.join('&')}` : urlWithParams;
};
