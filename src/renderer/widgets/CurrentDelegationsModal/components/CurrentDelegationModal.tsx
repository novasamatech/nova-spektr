import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { BaseModal, Button, Loader } from '@/shared/ui';
import { SearchInput } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { delegationAggregate, networkSelectorModel } from '@/features/governance';
import { delegateDetailsModel } from '@/widgets/DelegateDetails';
import { delegationModel } from '@/widgets/DelegationModal';
import { currentDelegationModel } from '../model/current-delegation-model';

import { DelegationCard } from './DelegationCard';

export const CurrentDelegationModal = () => {
  const { t } = useI18n();

  const isOpen = useUnit(currentDelegationModel.$isOpen);
  const delegationList = useUnit(currentDelegationModel.$delegateList);
  const activeDelegations = useUnit(delegationAggregate.$activeDelegations);
  const activeTracks = useUnit(delegationAggregate.$activeTracks);
  const isListLoading = useUnit(currentDelegationModel.$isListLoading);
  const query = useUnit(currentDelegationModel.$query);
  const chain = useUnit(networkSelectorModel.$governanceChain);

  return (
    <BaseModal
      closeButton
      headerClass="px-5 py-3"
      panelClass="flex flex-col w-modal h-[678px] overflow-y-auto bg-white"
      contentClass="min-h-0 h-full w-full bg-main-app-background py-4"
      isOpen={isOpen}
      title={chain && <OperationTitle title={t('governance.delegations.title')} chainId={chain.chainId} />}
      onClose={currentDelegationModel.output.flowFinished}
    >
      <div className="flex h-full flex-col">
        {isListLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader color="primary" size={25} />
          </div>
        ) : (
          <>
            <div className="mx-5 mb-4">
              <SearchInput
                value={query}
                placeholder={t('general.input.searchPlaceholder')}
                onChange={currentDelegationModel.events.queryChanged}
              />
            </div>

            <div className="scrollbar-stable flex flex-1 flex-col items-center overflow-y-auto">
              <ul className="flex w-[400px] flex-col gap-y-2">
                {delegationList.map((delegate) => (
                  <button key={delegate.accountId} onClick={() => delegateDetailsModel.events.flowStarted(delegate)}>
                    <DelegationCard
                      key={delegate.accountId}
                      delegate={delegate}
                      votes={Object.values(activeDelegations[delegate.accountId] || {})}
                      tracks={[...new Set(Object.values(activeTracks[delegate.accountId] || {}).flat())]}
                    />
                  </button>
                ))}
              </ul>
            </div>

            <div className="mx-5 flex justify-end">
              <Button
                onClick={() => {
                  currentDelegationModel.output.flowFinished();
                  delegationModel.events.flowStarted();
                }}
              >
                {t('governance.addDelegation.addDelegationButton')}
              </Button>
            </div>
          </>
        )}
      </div>
    </BaseModal>
  );
};
