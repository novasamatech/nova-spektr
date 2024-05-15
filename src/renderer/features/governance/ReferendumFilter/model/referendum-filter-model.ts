import { createStore } from 'effector';

const $referendums = createStore<any[]>([]);

export const referendumFilterModel = {
  referendums: $referendums,
};
