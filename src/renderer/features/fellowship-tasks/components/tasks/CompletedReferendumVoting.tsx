import { useStoreMap } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { SmallTitleText } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type CompletedReferendum, type Referendum } from '@/domains/collectives';
import { referendums } from '../../model/referendums';

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

  return (
    <button className="block w-full appearance-none" onClick={() => onReferendumSelect(referendum)}>
      <Box fillContainer padding={4} gap={5}>
        <SmallTitleText>
          {meta?.title || t('governance.referendums.referendumTitle', { index: referendum.id })}
        </SmallTitleText>
      </Box>
    </button>
  );
};
