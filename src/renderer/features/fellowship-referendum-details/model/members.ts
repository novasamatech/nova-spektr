import { fellowship } from './fellowship';

const $list = fellowship.$store.map(s => s?.members ?? []);

export const members = {
  $list,
};
