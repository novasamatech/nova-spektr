import { useUnit } from 'effector-react';

import { referendumListModel } from '../model/referendum-list-model';
import { FootnoteText } from '@shared/ui';

export const ReferendumList = () => {
  const referendumsList = useUnit(referendumListModel.$referendumsList);
  const referendumsDetails = useUnit(referendumListModel.$referendumsDetails);

  return (
    <ul className="flex flex-col gap-y-1 w-[750px] mx-auto overflow-y-auto">
      {referendumsList.map((referendum) => (
        <li key={referendum.index} className="border border-gray-400 rounded p-4 w-full">
          <div className="flex justify-between">
            <div>
              <FootnoteText>#{referendum.index}</FootnoteText>
              <button onClick={() => referendumListModel.events.referendumSelected(referendum.index)}>select</button>
            </div>
            <FootnoteText>{referendumsDetails?.[referendum.index] || '...'}</FootnoteText>
          </div>
        </li>
      ))}
    </ul>
  );
};
