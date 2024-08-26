import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { BaseModal, Plate } from '@/shared/ui';
import { delegateDetailsModel } from '../model/delegate-details-model';

import { DelegateInfo } from './DelegateInfo';
import { YourDelegation } from './YourDelegation';
import { YourDelegations } from './YourDelegations';

export const DelegateDetails = () => {
  const { t } = useI18n();

  const isOpen = useUnit(delegateDetailsModel.$isModalOpen);
  const delegate = useUnit(delegateDetailsModel.$delegate);

  return (
    <BaseModal
      closeButton
      headerClass="px-5 py-3"
      panelClass="w-[944px] h-[678px] flex flex-col bg-white"
      contentClass="w-full flex-1 bg-main-app-background py-6 flex flex-col gap-6 overflow-y-auto scrollbar-stable rounded-lg"
      isOpen={isOpen}
      title={t('governance.addDelegation.delegateTitle')}
      onClose={delegateDetailsModel.events.closeModal}
    >
      <div className="flex items-start gap-4">
        <Plate className="flex-1 border-filter-border p-6 shadow-card-shadow">
          {delegate && <DelegateInfo delegate={delegate} />}
        </Plate>

        <div className="flex flex-col gap-4">
          <Plate className="w-[350px] border-filter-border p-6 shadow-card-shadow">
            <YourDelegation />
          </Plate>
        </div>
      </div>

      <YourDelegations />
    </BaseModal>
  );
};
