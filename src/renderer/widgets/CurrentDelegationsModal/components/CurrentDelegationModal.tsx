import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button, Loader } from '@/shared/ui';
import { Box, Modal, SearchInput } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { delegationAggregate, networkSelectorModel } from '@/features/governance';
import { delegateDetailsModel } from '@/widgets/DelegateDetails';
import { delegationModel } from '@/widgets/DelegationModal';
import { currentDelegationModel } from '../model/current-delegation-model';

import { DelegationCard } from './DelegationCard';

export const CurrentDelegationModal = () => {
  const { t } = useI18n();

  const activeDelegations = useUnit(delegationAggregate.$activeDelegations);
  const delegationList = useUnit(currentDelegationModel.$delegateList);
  const isOpen = useUnit(currentDelegationModel.$isOpen);
  const isListLoading = useUnit(currentDelegationModel.$isListLoading);
  const query = useUnit(currentDelegationModel.$query);
  const network = useUnit(networkSelectorModel.$network);

  if (nullable(network)) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} size="md" height="full" onToggle={() => currentDelegationModel.output.flowFinished()}>
      <Modal.Title close>
        <OperationTitle title={t('governance.delegations.title')} chainId={network.chain.chainId} />
      </Modal.Title>
      <Modal.Content>
        <div className="flex h-full flex-col bg-main-app-background py-4">
          {isListLoading && (
            <div className="flex h-full items-center justify-center">
              <Loader color="primary" size={25} />
            </div>
          )}

          {!isListLoading && (
            <>
              <Box margin={[4, 5, 4, 5]}>
                <SearchInput
                  value={query}
                  placeholder={t('general.input.searchPlaceholder')}
                  onChange={currentDelegationModel.events.queryChanged}
                />
              </Box>

              <div className="scrollbar-stable flex flex-1 flex-col items-center overflow-y-auto">
                <ul className="flex w-[400px] flex-col gap-y-2 pt-0.5">
                  {delegationList.map((delegate) => {
                    return (
                      <li key={delegate.accountId}>
                        <DelegationCard
                          asset={network.asset}
                          delegate={delegate}
                          votes={Object.values(activeDelegations[delegate.accountId] || {})}
                          onClick={() => delegateDetailsModel.events.flowStarted(delegate)}
                        />
                      </li>
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
