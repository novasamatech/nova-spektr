import { createStore } from 'effector';

const $referendums = createStore<any[]>([]);

export const referendumListModel = {
  referendums: $referendums,
};
