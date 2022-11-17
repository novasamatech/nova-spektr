import Paths from './paths';

export const createLink = (path: keyof typeof Paths, params: Record<string, string | number>): string =>
  Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`:${key}`), value.toString());
  }, Paths[path]);
