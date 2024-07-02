import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { Voted, governanceModel } from '@entities/governance';
import { FootnoteText, Accordion, CaptionText, HeadlineText } from '@shared/ui';
import { ReferendumId, CompletedReferendum } from '@shared/core';
import { referendumListModel } from '../model/referendum-list-model';
import { referendumListUtils } from '../lib/referendum-list-utils';
import { VotingStatusBadge } from '@features/governance/VotingStatus/ui/VotingStatusBadge';

type Props = {
  referendums: Record<ReferendumId, CompletedReferendum>;
  onSelect: (value: CompletedReferendum) => void;
};

export const CompletedReferendums = ({ referendums, onSelect }: Props) => {
  const { t } = useI18n();

  const voting = useUnit(governanceModel.$voting);
  const chain = useUnit(referendumListModel.$chain);
  const names = useUnit(referendumListModel.$referendumsNames);

  const referendumList = useMemo(() => Object.entries(referendums), [referendums]);

  if (!chain || referendumList.length === 0) {
    return null;
  }

  return (
    <Accordion isDefaultOpen>
      <Accordion.Button buttonClass="py-1.5 px-2 mb-2">
        <div className="flex items-center gap-x-2 w-full">
          <CaptionText className="uppercase text-text-secondary tracking-[0.75px] font-semibold">
            {t('governance.referendums.completed')}
          </CaptionText>
          <CaptionText className="text-text-tertiary font-semibold">{Object.keys(referendums).length}</CaptionText>
        </div>
      </Accordion.Button>
      <Accordion.Content as="ul" className="flex flex-col gap-y-2">
        {referendumList.map(([index, referendum]) => (
          <li key={index}>
            <button
              type="button"
              className="flex flex-col gap-y-3 p-3 w-full rounded-md bg-white"
              onClick={() => onSelect(referendum)}
            >
              <div className="flex items-center gap-x-2 w-full">
                <Voted active={referendumListUtils.isReferendumVoted(index, voting)} />
                <VotingStatusBadge referendum={referendum} />
                <FootnoteText className="ml-auto text-text-secondary">#{index}</FootnoteText>
              </div>
              <HeadlineText>
                {names[chain.chainId]?.[index] || t('governance.referendums.referendumTitle', { index })}
              </HeadlineText>
            </button>
          </li>
        ))}
      </Accordion.Content>
    </Accordion>
  );
};
