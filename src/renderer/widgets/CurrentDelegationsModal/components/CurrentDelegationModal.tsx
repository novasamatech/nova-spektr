import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { Button, Loader } from '@/shared/ui';
import { Modal, SearchInput } from '@/shared/ui-kit';
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
    <Modal isOpen={isOpen} size="md" height="lg" onToggle={() => currentDelegationModel.output.flowFinished()}>
      <Modal.Title close>
        {chain && <OperationTitle title={t('governance.delegations.title')} chainId={chain.chainId} />}
      </Modal.Title>
      <Modal.Content>
        <div className="flex h-full flex-col bg-main-app-background py-4">
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
                  {delegationList.map((delegate) => {
                    const accountId = toAccountId(delegate.address ?? delegate.accountId);

                    return (
                      <button key={accountId} onClick={() => delegateDetailsModel.events.flowStarted(delegate)}>
                        <DelegationCard
                          key={accountId}
                          delegate={delegate}
                          votes={Object.values(activeDelegations[delegate.accountId] || {})}
                          tracks={[...new Set(Object.values(activeTracks[delegate.accountId] || {}).flat())]}
                        />
                      </button>
                    );
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      </Modal.Content>

      {!isListLoading && (
        <Modal.Footer>
          <div className="flex w-full justify-end">
            <Button
              onClick={() => {
                currentDelegationModel.output.flowFinished();
                delegationModel.events.flowStarted();
              }}
            >
              {t('governance.addDelegation.addDelegationButton')}
            </Button>
          </div>
        </Modal.Footer>
      )}
    </Modal>
  );
};
