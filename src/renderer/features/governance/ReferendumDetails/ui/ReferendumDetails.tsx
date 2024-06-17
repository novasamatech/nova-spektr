import { useUnit } from 'effector-react';

import { referendumDetailsModel } from '../model/referendum-details-model';
import { BaseModal, Plate, FootnoteText } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import './styles.css';
import { TrackInfo } from '@entities/governance';

export const ReferendumDetails = () => {
  const index = useUnit(referendumDetailsModel.$index);
  const referendum = useUnit(referendumDetailsModel.$referendum);
  const offChainDetails = useUnit(referendumDetailsModel.$offChainDetails);
  const isDetailsLoading = useUnit(referendumDetailsModel.$isDetailsLoading);

  const [isModalOpen, closeModal] = useModalClose(Boolean(offChainDetails), referendumDetailsModel.output.flowClosed);

  if (!index || !referendum) return null;

  return (
    <BaseModal
      isOpen={isModalOpen}
      title={`Referendum #${index}`}
      contentClass="h-full w-full bg-main-app-background"
      panelClass="w-[944px] h-[678px]"
      headerClass="pl-5 pr-3 py-4"
      onClose={closeModal}
    >
      <div className="ref-details flex gap-x-4 max-h-[calc(100%-62px)] py-4 px-6 overflow-y-auto">
        <Plate className="h-fit basis-[678px] p-6">
          <div className="flex justify-between items-center mb-4">
            <FootnoteText>Proposer: XXX</FootnoteText>
            <TrackInfo trackId={referendum.track} />
          </div>

          {isDetailsLoading && <div>Loading</div>}
          {!isDetailsLoading && offChainDetails && (
            <div
              className="flex flex-col gap-y-1 text-footnote"
              dangerouslySetInnerHTML={{ __html: offChainDetails }}
            />
          )}
        </Plate>

        <div className="flex flex-col gap-y-4 basis-[350px]">
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Plate className="p-6">Votes</Plate>

          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Plate className="p-6">Summary</Plate>

          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Plate className="p-6">Additional</Plate>

          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Plate className="p-6">Timeline</Plate>

          {/* eslint-disable-next-line i18next/no-literal-string */}
          <Plate className="p-6">Advanced</Plate>
        </div>
      </div>
    </BaseModal>
  );
};
