import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { BaseModal, Plate } from '@/shared/ui';
import { EditDelegation } from '@/widgets/EditDelegationModal';
import { RevokeDelegation } from '@/widgets/RevokeDelegationModal';
import { delegateDetailsModel } from '../model/delegate-details-model';

import { DelegateActivity } from './DelegateActivity';
import { DelegateDescription } from './DelegateDescription';
import { DelegateIdentity } from './DelegateIdentity';
import { DelegateSummary } from './DelegateSummary';
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
      panelClass="w-modal-xl h-[678px] flex flex-col bg-white"
      contentClass="w-full flex-1 bg-main-app-background py-6 flex flex-col gap-6 overflow-y-auto scrollbar-stable rounded-lg"
      isOpen={isOpen}
      title={t('governance.addDelegation.delegateTitle')}
      onClose={delegateDetailsModel.events.closeModal}
    >
      <div className="flex items-start gap-4 px-6">
        <Plate className="flex-1 border-filter-border p-6 shadow-card-shadow">
          {delegate && <DelegateDescription delegate={delegate} />}
        </Plate>

        <div className="flex flex-col gap-4">
          <Plate className="w-[350px] border-filter-border p-6 shadow-card-shadow">
            <YourDelegation />
          </Plate>
          <Plate className="w-[350px] border-filter-border p-6 shadow-card-shadow">
            <DelegateActivity />
          </Plate>
          <DelegateIdentity />
        </div>
      </div>

      <YourDelegations />

      <RevokeDelegation />
      <DelegateSummary />
      <EditDelegation />
    </BaseModal>
  );
};
