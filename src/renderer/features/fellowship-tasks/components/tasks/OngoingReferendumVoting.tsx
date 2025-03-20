import { useStoreMap } from 'effector-react';

import { type Transaction } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Separator, SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type OngoingReferendum, type Referendum } from '@/domains/collectives';
import { referendums } from '../../model/referendums';

export const taskVotingActionSlot = createSlot<{ referendumId: ReferendumId; transaction: Transaction | null }>();

type Props = {
  referendum: OngoingReferendum;
  transaction: Transaction | null;
  onReferendumSelect(referendum: Referendum): void;
};

export const OngoingReferendumVoting = ({ referendum, transaction, onReferendumSelect }: Props) => {
  const { t } = useI18n();

  const meta = useStoreMap({
    store: referendums.$metadata,
    keys: [referendum.id],
    fn: (meta, [id]) => meta[id] ?? null,
  });

  return (
    <Box direction="row" gap={5} padding={4}>
      <button className="block w-full appearance-none" onClick={() => onReferendumSelect(referendum)}>
        <Box fillContainer gap={3} grow={1}>
          <SmallTitleText>
            {meta?.title || t('governance.referendums.referendumTitle', { index: referendum.id })}
          </SmallTitleText>
        </Box>
      </button>
      <Separator vertical />
      <Box verticalAlign="center" horizontalAlign="space-between" shrink={0}>
        <Slot id={taskVotingActionSlot} props={{ referendumId: referendum.id, transaction }} />
      </Box>
    </Box>
  );
};
