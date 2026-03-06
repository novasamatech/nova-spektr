import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { truncate } from '@/shared/lib/utils';
import { Button, FootnoteText, IconButton, SmallTitleText } from '@/shared/ui';
import { Box, Copy, JsonArgs, Modal } from '@/shared/ui-kit';
import { type OngoingReferendum, referendumService, useTracks } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { useConnectedReferendum } from '../hooks/useConnectedReferendum';

import { Card } from './Card';

type Props = {
  referendum: OngoingReferendum;
};

export const TechnicalDetails = memo(({ referendum }: Props) => {
  const { t } = useI18n();
  const api = useFellowshipApi();
  const { data: tracks } = useTracks({ palletType: 'fellowship', api });
  const { data: connectedReferendum, pending: pendingConnected } = useConnectedReferendum(referendum.id);

  const track = tracks.find(tr => tr.id === referendum.track);
  const whitelistProposal =
    referendum.proposal && referendumService.isWhitelistProposal(referendum.proposal) ? referendum.proposal : null;

  return (
    <Card>
      <Box padding={6} gap={4}>
        <SmallTitleText>{t('fellowship.technicalDetails.title')}</SmallTitleText>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.referendumId')}</FootnoteText>
            <FootnoteText>#{referendum.id}</FootnoteText>
          </div>
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.track')}</FootnoteText>
            <FootnoteText>{track ? `${track.name} (#${referendum.track})` : `#${referendum.track}`}</FootnoteText>
          </div>
          <div className="flex items-center justify-between">
            <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.origin')}</FootnoteText>
            <FootnoteText>{referendum.origin}</FootnoteText>
          </div>

          {whitelistProposal && (
            <>
              <div className="flex items-center">
                <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.callHash')}</FootnoteText>
                <FootnoteText className="ml-auto text-text-tertiary">
                  {truncate(whitelistProposal.proposalHash, 7, 7)}
                </FootnoteText>
                <Copy
                  value={whitelistProposal.proposalHash}
                  notification={t('fellowship.technicalDetails.callHashCopied')}
                >
                  <IconButton className="shrink-0 self-center text-icon-default" name="copy" />
                </Copy>
              </div>
              <div className="flex items-center justify-between">
                <FootnoteText className="text-text-tertiary">{t('fellowship.technicalDetails.callData')}</FootnoteText>
                <Modal size="fit" height="lg">
                  <Modal.Trigger>
                    <Button className="p-0" size="sm" variant="text">
                      {t('fellowship.technicalDetails.viewJson')}
                    </Button>
                  </Modal.Trigger>
                  <Modal.Title close>{t('fellowship.technicalDetails.callData')}</Modal.Title>
                  <Modal.Content>
                    <JsonArgs value={whitelistProposal.proposalJSON} />
                  </Modal.Content>
                </Modal>
              </div>
            </>
          )}

          {!pendingConnected && !connectedReferendum && whitelistProposal && (
            <FootnoteText className="mt-2 text-text-tertiary">
              {t('fellowship.technicalDetails.governanceNotCreated')}
            </FootnoteText>
          )}
        </div>
      </Box>
    </Card>
  );
});
