import { useGate, useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { HeaderTitleText, Markdown, SmallTitleText } from '@/shared/ui';
import { Box, Modal, Skeleton } from '@/shared/ui-kit';
import { fellowshipVotingFeature } from '@/features/fellowship-voting';
import { fellowshipVotingHistoryFeature } from '@/features/fellowship-voting-history';
import { referendumDetailsModel } from '../model/details';
import { referendumsDetailsFeatureStatus } from '../model/status';

import { Card } from './Card';
import { ProposerName } from './ProposerName';
import { Threshold } from './Threshold';
import { ReferendumVoteChart } from './shared/ReferendumVoteChart';
import { ReferendumVotingStatusBadge } from './shared/ReferendumVotingStatusBadge';

const { VotingButtons, WalletVotingInfo } = fellowshipVotingFeature.views;
const { VotingHistory, VotingSummary } = fellowshipVotingHistoryFeature.views;

type Props = {
  isOpen: boolean;
  referendumId: ReferendumId;
  onToggle: (open: boolean) => void;
};

export const ReferendumDetailsModal = ({ referendumId, isOpen, onToggle }: Props) => {
  useGate(referendumsDetailsFeatureStatus.gate);
  useGate(referendumDetailsModel.gate, { referendumId });

  const { t } = useI18n();

  const referendum = useUnit(referendumDetailsModel.$referendum);
  const referendumMeta = useUnit(referendumDetailsModel.$referendumMeta);
  const pendingReferendumMeta = useUnit(referendumDetailsModel.$pendingMeta);
  const pendingReferendum = useUnit(referendumDetailsModel.$pending);

  const loadingState = pendingReferendum && nullable(referendum);
  const metaLoadingState = pendingReferendumMeta && nullable(referendumMeta);

  return (
    <Modal size="xl" height="full" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Title close>{`Referendum #${referendumId}`}</Modal.Title>
      <Modal.Content>
        <div className="flex min-h-full bg-main-app-background">
          <Box direction="row" width="100%" gap={4} padding={[4, 6]} fillContainer>
            <Box width="100%">
              <Card>
                <Box padding={6} gap={4}>
                  <ProposerName />
                  <HeaderTitleText className="text-balance">
                    {metaLoadingState ? <Skeleton height="1lh" width="80%" /> : referendumMeta?.title}
                  </HeaderTitleText>
                  {metaLoadingState ? (
                    <Skeleton height="8lh" width="100%" />
                  ) : (
                    <Markdown>{referendumMeta?.description ?? ''}</Markdown>
                  )}
                </Box>
              </Card>
            </Box>
            <Box width="350px" shrink={0} gap={4}>
              <WalletVotingInfo referendumId={referendumId} />
              <Card>
                <Box padding={6} gap={6}>
                  <SmallTitleText>{t('fellowship.voting.votingStatus')}</SmallTitleText>
                  <ReferendumVotingStatusBadge referendum={referendum} pending={loadingState} />
                  <ReferendumVoteChart referendum={referendum} pending={loadingState} descriptionPosition="bottom" />
                  <Threshold referendum={referendum} pending={loadingState} />
                  <VotingButtons referendumId={referendumId} />
                </Box>
              </Card>
              <Card>
                <Box padding={6} gap={4}>
                  <Box direction="row" verticalAlign="center" horizontalAlign="space-between">
                    <SmallTitleText>{t('fellowship.voting.summary')}</SmallTitleText>

                    <VotingHistory referendumId={referendumId} />
                  </Box>

                  <VotingSummary />
                </Box>
              </Card>
            </Box>
          </Box>
        </div>
      </Modal.Content>
    </Modal>
  );
};
