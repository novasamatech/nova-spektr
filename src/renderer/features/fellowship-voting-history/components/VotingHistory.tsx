import { useI18n } from '@/shared/i18n';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Button } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { useVotes } from '../hooks/useVotes';

import { VotesModal } from './VotesModal';

type Props = {
  referendumId: ReferendumId;
};

export const VotingHistory = ({ referendumId }: Props) => {
  const { t } = useI18n();

  const { pending } = useVotes(referendumId);

  if (pending) return <Skeleton width="10ch" height="1lh"></Skeleton>;

  return (
    <VotesModal referendumId={referendumId}>
      <Button size="sm" variant="text" className="h-auto p-0">
        {t('fellowship.votingHistory.showHistoryButton')}
      </Button>
    </VotesModal>
  );
};
