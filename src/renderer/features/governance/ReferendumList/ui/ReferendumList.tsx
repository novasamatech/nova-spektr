import { useUnit } from 'effector-react';

import { referendumListModel } from '../model/referendum-list-model';
import { FootnoteText } from '@shared/ui';

export const ReferendumList = () => {
  const onChainReferendums = useUnit(referendumListModel.$onChainReferendums);
  const offChainReferendums = useUnit(referendumListModel.$offChainReferendums);

  return (
    <ul className="flex flex-col gap-y-1 w-[750px] mx-auto overflow-y-auto">
      {onChainReferendums.map((referendum) => (
        <li key={referendum.index} className="border border-gray-400 rounded p-4 w-full">
          <div className="flex justify-between">
            <FootnoteText>#{referendum.index}</FootnoteText>
            <FootnoteText>{offChainReferendums?.[referendum.index] || '...'}</FootnoteText>
          </div>
        </li>
      ))}
    </ul>
  );
};
