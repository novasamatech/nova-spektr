import { useStoreMap } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Button, Loader } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { referendumService, useCoreMembers, useMaxRank, useReferendums, useTracks } from '@/domains/collectives';
import { SignButton } from '@/entities/operations';
import { VotingConfirmation } from '@/features/fellowship-voting';
import { CallDataConfirmSection } from '../../common/CallDataConfirmSection';
import { MultisigOperationDescriptionField } from '../../common/MultisigOperationDescriptionField';
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

  const palletType = confirm?.meta.pallet ?? null;
  const poll = confirm?.meta.poll ?? null;
  const initiator = confirm?.meta.initiator ?? null;
  const api = confirm?.meta.api ?? null;

  const { data: referendums } = useReferendums({ palletType, api });
  const { data: members } = useCoreMembers({ palletType, api });
  const { data: maxRank } = useMaxRank({ palletType, api });
  const { data: tracks } = useTracks({ palletType, api });

  const referendum = nonNullable(poll) ? referendums.find((r) => r.id === parseInt(poll)) : null;
  const member = members.find((m) => m.accountId === initiator?.accountId);
  const memberTrack = tracks.find((t) => t.id === member?.rank);

  const proposerId = nonNullable(referendum) ? referendumService.getProposer(referendum) : null;
  const proposer = nonNullable(proposerId) ? members.find((m) => m.accountId === proposerId) : null;

  const currentTrack = nonNullable(proposer) ? tracks.find((t) => t.id === proposer.rank) : null;
  const nextTrack = nonNullable(proposer) ? tracks.find((t) => t.id === proposer.rank + 1) : null;

  if (
    nullable(confirm) ||
    nullable(maxRank) ||
    nullable(memberTrack) ||
    nullable(currentTrack) ||
    nullable(nextTrack) ||
    nullable(referendum)
  ) {
    return (
      <Box width="440px" height="430px" verticalAlign="center" horizontalAlign="center">
        <Loader size={24} color="primary" />
      </Box>
    );
  }

  if (referendumService.isCompleted(referendum)) {
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
        referendum={referendum}
        memberTrack={memberTrack}
        currentProposerTrack={currentTrack}
        nextProposerTrack={nextTrack}
        maxRank={maxRank}
        fee={confirm.meta.fee}
        rank={confirm.meta.rank}
      />

      <CallDataConfirmSection
        api={confirm.meta.api}
        chain={confirm.meta.chain}
        resultTx={confirm.meta.tx}
        coreTx={confirm.meta.coreTx}
      />

      <MultisigOperationDescriptionField />

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
