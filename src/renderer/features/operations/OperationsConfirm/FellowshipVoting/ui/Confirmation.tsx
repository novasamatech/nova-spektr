import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useFlow } from '@/shared/effector';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { referendaPallet } from '@/shared/pallet/referenda';
import { Button, Loader } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { referendumService } from '@/domains/collectives';
import { SignButton } from '@/entities/operations';
import { VotingConfirmation, fellowship, fellowshipVotingFeature, votingStatus } from '@/features/fellowship-voting';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id, secondaryActionButton, hideSignButton, onGoBack }: Props) => {
  const { t } = useI18n();

  const confirm = useStoreMap({
    store: confirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => (id ? value[id] : null) ?? null,
  });

  // What a mess, we should find a solution for rendering multiple confirms
  const votingReferendum = useStoreMap({
    store: fellowship.$store,
    keys: [confirm?.meta],
    fn: (store, [meta]) => {
      if (!meta) return null;
      const list = store?.referendums ?? [];

      return list.find((r) => r.id === parseInt(meta.poll)) ?? null;
    },
  });

  useGate(fellowshipVotingFeature.gate);
  useFlow(votingStatus.flow, {
    referendumId: confirm ? referendaPallet.helpers.toReferendumId(parseInt(confirm.meta.poll)) : null,
  });

  const maxRank = useUnit(votingStatus.$maxRank);
  const memberTrack = useUnit(votingStatus.$memberTrack);
  const currentTrack = useUnit(votingStatus.$currentProposerTrack);
  const nextTrack = useUnit(votingStatus.$nextProposerTrack);

  if (nullable(confirm) || nullable(memberTrack) || nullable(votingReferendum)) {
    return (
      <Box width="440px" height="430px" verticalAlign="center" horizontalAlign="center">
        <Loader size={24} color="primary" />
      </Box>
    );
  }

  if (referendumService.isCompleted(votingReferendum)) {
    return null;
  }

  return (
    <Box padding={[4, 5]}>
      <VotingConfirmation
        account={confirm.meta.initiator}
        asset={confirm.meta.asset}
        chain={confirm.meta.chain}
        vote={confirm.meta.aye ? 'aye' : 'nay'}
        wallets={confirm.meta.wallets}
        referendum={votingReferendum}
        memberTrack={memberTrack}
        currentProposerTrack={currentTrack}
        nextProposerTrack={nextTrack}
        maxRank={maxRank}
        fee={confirm.meta.fee}
        rank={confirm.meta.rank}
      />

      <div className="mt-3 flex w-full justify-between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <div className="flex gap-4">
          {secondaryActionButton}

          {!hideSignButton && (
            <SignButton
              isDefault={Boolean(secondaryActionButton)}
              type={confirm.wallets.signatory.type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </Box>
  );
};
