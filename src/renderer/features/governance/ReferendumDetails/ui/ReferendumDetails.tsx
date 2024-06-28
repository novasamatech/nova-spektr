import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { referendumDetailsModel } from '../model/referendum-details-model';
import { BaseModal, Plate, FootnoteText, Loader, Markdown, SmallTitleText, OperationStatus, Icon } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { governanceModel, TrackInfo, VoteChartSm } from '@entities/governance';
import { referendumListUtils } from '@features/governance/ReferendumList/lib/referendum-list-utils';

export const ReferendumDetails = () => {
  const { t } = useI18n();

  const index = useUnit(referendumDetailsModel.$index);
  const referendum = useUnit(referendumDetailsModel.$referendum);
  const approvalThresholds = useUnit(governanceModel.$approvalThresholds);
  const supportThresholds = useUnit(governanceModel.$supportThresholds);
  const offChainDetails = useUnit(referendumDetailsModel.$offChainDetails);
  const isDetailsLoading = useUnit(referendumDetailsModel.$isDetailsLoading);

  const [isModalOpen, closeModal] = useModalClose(Boolean(referendum), referendumDetailsModel.output.flowClosed);

  if (!index || !referendum) return null;

  const isPassing = supportThresholds[index].passing;

  const votedFractions = referendumListUtils.getVoteFractions(referendum.tally, approvalThresholds[index].value);
  const votedCount = referendumListUtils.getVotedCount(referendum.tally, approvalThresholds[index].value);

  return (
    <BaseModal
      isOpen={isModalOpen}
      title={`Referendum #${index}`}
      contentClass="min-h-0 h-full w-full bg-main-app-background overflow-y-auto"
      panelClass="flex flex-col w-[944px] h-[678px]"
      headerClass="pl-5 pr-3 py-4 shrink-0"
      closeButton
      onClose={closeModal}
    >
      <div className="ref-details flex flex-wrap-reverse items-end gap-4 p-6 min-h-full">
        <div className="h-full min-h-0 grow min-w-80 basis-[530px]">
          <Plate className="shadow-card-shadow border-filter-border h-fit p-6">
            <div className="flex justify-between items-center mb-4">
              <FootnoteText className="text-text-secondary">Proposer: XXX</FootnoteText>
              <TrackInfo trackId={referendum.track} />
            </div>

            {isDetailsLoading && (
              <div className="flex justify-center items-center min-h-32">
                <Loader color="primary" size={25} />
              </div>
            )}

            {!isDetailsLoading && offChainDetails && <Markdown>{offChainDetails}</Markdown>}
          </Plate>
        </div>

        <div className="flex flex-row flex-wrap gap-4 basis-[350px] grow shrink-0">
          <Plate className="flex flex-col items-start gap-6 p-6 shadow-card-shadow border-filter-border grow basis-[350px]">
            <SmallTitleText>Voting status</SmallTitleText>
            <div className="flex">
              <OperationStatus pallet={isPassing ? 'success' : 'default'}>
                {isPassing ? t('governance.referendums.passing') : t('governance.referendums.deciding')}
              </OperationStatus>
            </div>
            <VoteChartSm bgColor="icon-button" descriptionPosition="bottom" {...votedFractions} />
            <div className="flex items-center gap-1 justify-between flex-wrap w-full">
              <div className="flex items-center gap-1">
                <Icon name="checkmarkOutline" size={18} className="text-icon-positive" />
                <FootnoteText className="text-text-secondary">Threshold</FootnoteText>
              </div>
              <FootnoteText>
                {votedCount.voted.toString()} of {votedCount.of.toString()}
              </FootnoteText>
            </div>
          </Plate>
        </div>
      </div>
    </BaseModal>
  );
};
