import { useUnit } from 'effector-react';

import { referendumListModel } from '../model/referendum-list-model';

export const ReferendumList = () => {
  const referendums = useUnit(referendumListModel.$referendums);
  console.log(referendums);
  return (
    <ul>
      {referendums.map((referendum) => (
        <li key={referendum.index}>#{referendum.index}</li>
      ))}
    </ul>
  );
};
