import { useStoreMap, useUnit } from 'effector-react';
import { useMemo } from 'react';

import { useI18n } from '@app/providers';
import { Voted, governanceModel } from '@entities/governance';
import { FootnoteText, Accordion, CaptionText, HeadlineText } from '@shared/ui';
import { ReferendumId, CompletedReferendum } from '@shared/core';
import { VotingStatusBadge } from '../../VotingStatus/ui/VotingStatusBadge';
import { referendumListModel } from '../model/referendum-list-model';
import { referendumListUtils } from '../lib/referendum-list-utils';
import { ListItem } from './ListItem';

type Props = {
  referendums: Record<ReferendumId, CompletedReferendum>;
  onSelect: (value: CompletedReferendum) => void;
};

export const CompletedReferendums = ({ referendums, onSelect }: Props) => {
  const { t } = useI18n();

  const chain = useUnit(referendumListModel.$chain);
  const voting = useUnit(governanceModel.$voting);
  const names = useStoreMap({
    store: referendumListModel.$referendumsNames,
    keys: [chain],
    fn: (x, [chain]) => (chain ? x[chain?.chainId] ?? {} : {}),
  });

  const referendumList = useMemo(() => Object.values(referendums), [referendums]);

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
        {referendumList.map((referendum) => (
          <li key={referendum.referendumId}>
            <ListItem onClick={() => onSelect(referendum)}>
              <div className="flex items-center gap-x-2 w-full">
                <Voted active={referendumListUtils.isReferendumVoted(referendum.referendumId, voting)} />
                <VotingStatusBadge referendum={referendum} />
                <FootnoteText className="ml-auto text-text-secondary">#{referendum.referendumId}</FootnoteText>
              </div>
              <HeadlineText>
                {names[referendum.referendumId] ||
                  t('governance.referendums.referendumTitle', { index: referendum.referendumId })}
              </HeadlineText>
            </ListItem>
          </li>
        ))}
      </Accordion.Content>
    </Accordion>
  );
};
