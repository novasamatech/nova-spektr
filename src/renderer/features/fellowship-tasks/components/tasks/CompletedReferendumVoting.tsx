import { useStoreMap } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { SmallTitleText } from '@/shared/ui';
import { Box, Label } from '@/shared/ui-kit';
import { type CompletedReferendum, type Referendum } from '@/domains/collectives';
import { referendums } from '../../model/referendums';
import { votes } from '../../model/voting';

type Props = {
  referendum: CompletedReferendum;
  onReferendumSelect(referendum: Referendum): void;
};

export const CompletedReferendumVoting = ({ referendum, onReferendumSelect }: Props) => {
  const { t } = useI18n();

  const meta = useStoreMap({
    store: referendums.$metadata,
    keys: [referendum.id],
    fn: (meta, [id]) => meta[id] ?? null,
  });
  const vote = useStoreMap({
    store: votes.$memberVotes,
    keys: [referendum.id],
    fn: (votes, [id]) => votes.find(v => v.referendumId === id) ?? null,
  });

  return (
    <button className="block w-full appearance-none" onClick={() => onReferendumSelect(referendum)}>
      <Box direction="row" fillContainer padding={4} gap={3}>
        {vote ? <Label variant="gray">{t('governance.voted')}</Label> : null}
        <SmallTitleText>
          {meta?.title || t('governance.referendums.referendumTitle', { index: referendum.id })}
        </SmallTitleText>
      </Box>
    </button>
  );
};
