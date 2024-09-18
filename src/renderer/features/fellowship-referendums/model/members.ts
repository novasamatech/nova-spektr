import { fellowshipModel } from './fellowship';

export const membersModel = {
  $list: fellowshipModel.$store.map(x => x?.members ?? []),
};
