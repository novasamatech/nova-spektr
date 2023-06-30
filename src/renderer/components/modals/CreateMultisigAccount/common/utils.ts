import { SelectedMap } from './types';

export const getSelectedLength = (collection: SelectedMap): number => {
  return Object.values(collection).reduce((acc, c) => {
    return acc + Object.values(c).reduce((total, flag) => total + Number(flag), 0);
  }, 0);
};
