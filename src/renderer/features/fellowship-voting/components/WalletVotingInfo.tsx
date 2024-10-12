import { useGate, useUnit } from 'effector-react';
import { memo } from 'react';

import { type ReferendumId } from '@/shared/pallet/referenda';
import { Icon } from '@/shared/ui';
import { Box, Surface } from '@/shared/ui-kit';
import { votingModel } from '../model/voting';

type Props = {
  referendumId: ReferendumId;
};

export const WalletVotingInfo = memo(({ referendumId }: Props) => {
  useGate(votingModel.gate, { referendumId });

  const voting = useUnit(votingModel.$referendumVoting);

  if (!voting) {
    return null;
  }

  const ayeVotes = voting.aye ? `AYE ${voting.aye} votes` : null;
  const nayVotes = voting.nay ? `NAY ${voting.nay} votes` : null;

  return (
    <Surface>
      <Box padding={6} gap={1}>
        <Icon name="voted" size={16} className="text-icon-accent" />
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <span className="text-footnote text-tab-text-accent">Voted:</span>
        <span className="text-footnote">
          {ayeVotes} {nayVotes}
        </span>
      </Box>
    </Surface>
  );
});
