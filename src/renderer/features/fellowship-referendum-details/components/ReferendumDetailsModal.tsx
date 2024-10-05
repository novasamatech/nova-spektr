import { useGate, useUnit } from 'effector-react';

import { type ReferendumId } from '@/shared/pallet/referenda';
import { HeaderTitleText, Markdown } from '@/shared/ui';
import { Box, Modal, Skeleton } from '@/shared/ui-kit';
import { referendumDetailsModel } from '../model/details';
import { referendumsDetailsFeatureStatus } from '../model/status';

import { Card } from './Card';
import { ProposerName } from './ProposerName';

type Props = {
  isOpen: boolean;
  referendumId: ReferendumId;
  onToggle: (open: boolean) => void;
};

export const ReferendumDetailsModal = ({ referendumId, isOpen, onToggle }: Props) => {
  useGate(referendumsDetailsFeatureStatus.gate);
  useGate(referendumDetailsModel.gate, { referendumId });

  const referendumMeta = useUnit(referendumDetailsModel.$referendumMeta);
  const pendingReferendumMeta = useUnit(referendumDetailsModel.$pendingMeta);

  return (
    <Modal size="xl" height="full" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Title close>{`Referendum #${referendumId}`}</Modal.Title>
      <Modal.Content>
        <div className="flex min-h-full bg-main-app-background">
          <Box direction="row" width="100%" gap={4} padding={[4, 6]} fillContainer wrap>
            <Box width="100%">
              <Card>
                <Box padding={6} gap={4}>
                  <ProposerName />
                  <HeaderTitleText className="text-balance">
                    {!referendumMeta && pendingReferendumMeta ? (
                      <Skeleton height="1lh" width="80%" />
                    ) : (
                      referendumMeta?.title
                    )}
                  </HeaderTitleText>
                  {!referendumMeta && pendingReferendumMeta ? (
                    <Skeleton height="8lh" width="100%" />
                  ) : (
                    <Markdown>{referendumMeta?.description ?? ''}</Markdown>
                  )}
                </Box>
              </Card>
            </Box>
            <Box width="350px" shrink={0}>
              <Card>
                <Box padding={6}>{'Voting status'}</Box>
              </Card>
            </Box>
          </Box>
        </div>
      </Modal.Content>
    </Modal>
  );
};
