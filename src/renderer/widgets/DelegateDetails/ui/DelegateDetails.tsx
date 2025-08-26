import { useUnit } from 'effector-react';
import { Suspense, lazy } from 'react';

import { useI18n } from '@/shared/i18n';
import { Plate } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { delegateDetailsModel } from '../model/delegate-details-model';

import { DelegateActivity } from './DelegateActivity';
import { DelegateDescription } from './DelegateDescription';
import { DelegateIdentity } from './DelegateIdentity';
import { DelegateSummary } from './DelegateSummary';
import { YourDelegation } from './YourDelegation';
import { YourDelegations } from './YourDelegations';

// Lazy load revoke delegation component
const RevokeDelegation = lazy(() =>
  import('@/widgets/RevokeDelegationModal').then(({ RevokeDelegation }) => ({
    default: RevokeDelegation,
  })),
);
const RevokeDelegationShards = lazy(() =>
  import('@/widgets/RevokeDelegationModal').then(({ RevokeDelegationShards }) => ({
    default: RevokeDelegationShards,
  })),
);
// Lazy load edit delegation component
const EditDelegation = lazy(() =>
  import('@/widgets/EditDelegationModal').then((module) => ({ default: module.EditDelegation })),
);

const EditDelegationShards = lazy(() =>
  import('@/widgets/EditDelegationModal').then((module) => ({ default: module.EditDelegationShards })),
);

export const DelegateDetails = () => {
  const { t } = useI18n();

  const isOpen = useUnit(delegateDetailsModel.$isModalOpen);
  const delegate = useUnit(delegateDetailsModel.$delegate);

  const selectedAccounts = useUnit(walletSelect.$selectedAccounts);
  const isAccountWithShards = selectedAccounts.find((account) => accountUtils.isAccountWithShards(account));

  return (
    <Modal isOpen={isOpen} size="xl" height="full" onToggle={() => delegateDetailsModel.events.closeModal()}>
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

        {isAccountWithShards ? (
          <Suspense fallback={null}>
            <RevokeDelegationShards />
          </Suspense>
        ) : (
          <Suspense fallback={null}>
            <RevokeDelegation />
          </Suspense>
        )}
        <DelegateSummary />
        <Suspense fallback={null}>{isAccountWithShards ? <EditDelegationShards /> : <EditDelegation />}</Suspense>
      </Modal.Content>
    </Modal>
  );
};
