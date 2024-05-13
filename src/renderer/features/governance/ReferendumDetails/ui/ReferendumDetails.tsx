import { useUnit } from 'effector-react';

import { referendumDetailsModel } from '../model/referendum-details-model';
import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import './styles.css';

export const ReferendumDetails = () => {
  const details = useUnit(referendumDetailsModel.$details);
  const [isModalOpen, closeModal] = useModalClose(Boolean(details), referendumDetailsModel.output.flowFinished);

  if (!details) return null;

  return (
    <BaseModal isOpen={isModalOpen} contentClass="py-4 px-6" panelClass="w-[944px] h-[678px]" onClose={closeModal}>
      <div className="ref-details flex gap-x-4 max-h-[678px] overflow-y-auto">
        <div
          className="flex flex-col gap-y-1 basis-[678px] text-footnote"
          dangerouslySetInnerHTML={{ __html: details }}
        />
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <div className="flex flex-col gap-y-4 basis-[350px]">on-chain details</div>
      </div>
    </BaseModal>
  );
};
