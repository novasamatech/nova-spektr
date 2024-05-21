import { useUnit } from 'effector-react';

import { referendumListModel } from '../model/referendum-list-model';
import { FootnoteText } from '@shared/ui';

export const ReferendumList = () => {
  const referendumsMap = useUnit(referendumListModel.$referendumsMap);
  const referendumsDetails = useUnit(referendumListModel.$referendumsDetails);

  return (
    <ul className="flex flex-col gap-y-1">
      {Object.entries(referendumsMap).map(([index, referendum]) => (
        <li key={index} className="border border-gray-400 rounded p-4 w-full">
          <div className="flex justify-between">
            <div>
              <FootnoteText>#{index}</FootnoteText>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <button onClick={() => referendumListModel.events.referendumSelected(index)}>select</button>
            </div>
            <FootnoteText>{referendumsDetails?.[index] || '...'}</FootnoteText>
          </div>
        </li>
      ))}
    </ul>
  );
};
