import { useUnit } from 'effector-react';

import { FootnoteText } from '@shared/ui';
import type { ReferendumId, ReferendumInfo } from '@shared/core';
import { referendumListModel } from '../model/referendum-list-model';

type Props = {
  ongoing: Record<ReferendumId, ReferendumInfo>;
  completed: Record<ReferendumId, ReferendumInfo>;
  onSelected: (index: ReferendumId) => void;
};

export const ReferendumList = ({ ongoing, completed, onSelected }: Props) => {
  const referendumsDetails = useUnit(referendumListModel.$referendumsDetails);

  return (
    <div className="flex flex-col gap-y-4">
      <div>Ongoing:</div>
      <ul className="flex flex-col gap-y-1">
        {Object.entries(ongoing).map(([index, referendum]) => (
          <li key={index} className="border border-gray-400 rounded p-4 w-full">
            <div className="flex justify-between">
              <div>
                <FootnoteText>#{index}</FootnoteText>
                <button onClick={() => onSelected(index)}>select</button>
              </div>
              <FootnoteText>{referendumsDetails?.[index] || '...'}</FootnoteText>
            </div>
          </li>
        ))}
      </ul>

      <div>Completed:</div>
      <ul className="flex flex-col gap-y-1">
        {Object.entries(completed).map(([index, referendum]) => (
          <li key={index} className="border border-gray-400 rounded p-4 w-full">
            <div className="flex justify-between">
              <div>
                <FootnoteText>#{index}</FootnoteText>
                <button onClick={() => onSelected(index)}>select</button>
              </div>
              <FootnoteText>{referendumsDetails?.[index] || '...'}</FootnoteText>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
