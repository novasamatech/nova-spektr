import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Plate } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
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
    <Modal isOpen={isOpen} size="full" height="fit" onToggle={() => delegateDetailsModel.events.closeModal()}>
      <Modal.Title close>{t('governance.addDelegation.delegateTitle')}</Modal.Title>
      <Modal.Content>
        <div className="flex min-h-[678px] items-start gap-4 rounded-lg bg-main-app-background px-6 py-6">
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
      </Modal.Content>
    </Modal>
  );
};
