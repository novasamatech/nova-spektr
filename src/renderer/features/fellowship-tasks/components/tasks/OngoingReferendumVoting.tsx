import { useStoreMap } from 'effector-react';

import { type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { Separator, SmallTitleText } from '@/shared/ui';
import { Box, Label, type LabelVariant } from '@/shared/ui-kit';
import { type OngoingReferendum, type Referendum } from '@/domains/collectives';
import { referendums } from '../../model/referendums';

export const taskVotingActionSlot = createSlot<{ referendum: OngoingReferendum; transaction: Transaction | null }>();

const tagLabels: Record<string, { text: string; color: LabelVariant }> = {
  urgent: {
    text: 'fellowship.tasks.labels.urgent',
    color: 'purple',
  },
  controversial: {
    text: 'fellowship.tasks.labels.controversial',
    color: 'blue',
  },
  importantVote: {
    text: 'fellowship.tasks.labels.importantVote',
    color: 'orange',
  },
};

type Props = {
  referendum: OngoingReferendum;
  transaction: Transaction | null;
  tags: string[];
  onReferendumSelect(referendum: Referendum): void;
};

export const OngoingReferendumVoting = ({ referendum, tags, transaction, onReferendumSelect }: Props) => {
  const { t } = useI18n();

  const meta = useStoreMap({
    store: referendums.$metadata,
    keys: [referendum.id],
    fn: (meta, [id]) => meta[id] ?? null,
  });

  const firstTag = tags.at(0);
  const labelConfig = firstTag ? tagLabels[firstTag] : null;

  return (
    <Box direction="row" gap={5} padding={4}>
      <button className="block w-full min-w-0 appearance-none" onClick={() => onReferendumSelect(referendum)}>
        <Box direction="row" fillContainer gap={3} grow={1}>
          {labelConfig ? <Label variant={labelConfig.color}>{t(labelConfig.text)}</Label> : null}
          <SmallTitleText className="truncate">
            {meta?.title || t('governance.referendums.referendumTitle', { index: referendum.id })}
          </SmallTitleText>
        </Box>
      </button>
      <Separator vertical />
      <Box verticalAlign="center" horizontalAlign="space-between" shrink={0}>
        <Slot id={taskVotingActionSlot} props={{ referendum, transaction }} />
      </Box>
    </Box>
  );
};
