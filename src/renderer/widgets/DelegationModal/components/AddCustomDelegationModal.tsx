import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep, validateAddress } from '@/shared/lib/utils';
import { BaseModal, Button, Icon, Identicon, Input } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { networkSelectorModel } from '@/features/governance';
import { delegationModel } from '../model/delegation-model';

export const AddCustomDelegationModel = () => {
  const { t } = useI18n();

  const step = useUnit(delegationModel.$step);
  const chain = useUnit(networkSelectorModel.$governanceChain);
  const customDelegate = useUnit(delegationModel.$customDelegate);
  const isValidAddress = validateAddress(customDelegate);

  const [isModalOpen, closeModal] = useModalClose(
    isStep(step, Step.CUSTOM_DELEGATION),
    delegationModel.events.closeCustomModal,
  );

  const prefixElement = (
    <div className="flex h-auto items-center">
      {isValidAddress ? (
        <Identicon className="mr-2" size={20} address={customDelegate} background={false} />
      ) : (
        <Icon className="mr-2" size={20} name="emptyIdenticon" />
      )}
    </div>
  );

  return (
    <BaseModal
      closeButton
      headerClass="px-5 py-3"
      panelClass="flex flex-col w-modal h-[222px] bg-white"
      contentClass="min-h-0 h-full w-full bg-white py-4"
      isOpen={isModalOpen}
      title={
        chain && <OperationTitle title={t('governance.addDelegation.customDelegationTitle')} chainId={chain.chainId} />
      }
      onClose={closeModal}
    >
      <div className="px-5 pb-4">
        <Input
          wrapperClass="w-full h-10.5"
          label={t('governance.addDelegation.customDelegationLabel')}
          placeholder={t('governance.addDelegation.customDelegationPlaceholder')}
          invalid={!!customDelegate && !isValidAddress}
          value={customDelegate}
          prefixElement={prefixElement}
          onChange={delegationModel.events.customDelegateChanged}
        />
      </div>

      <div className="px-5 pt-3 pb-4 flex justify-end">
        <Button disabled={!isValidAddress} onClick={() => delegationModel.events.createCustomDelegate()}>
          {t('signing.continueButton')}
        </Button>
      </div>
    </BaseModal>
  );
};
