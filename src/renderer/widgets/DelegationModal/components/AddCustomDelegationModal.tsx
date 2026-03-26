import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep, toAddress } from '@/shared/lib/utils';
import { Button, InputHint } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { Field, Input, Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { networkSelectorModel } from '@/features/governance';
import { DelegationErrorMessages } from '../common/constants';
import { delegationModel } from '../model/delegation-model';

export const AddCustomDelegationModel = () => {
  const { t } = useI18n();

  const step = useUnit(delegationModel.$step);
  const chain = useUnit(networkSelectorModel.$governanceChain);
  const customDelegate = useUnit(delegationModel.$customDelegate);
  const error = useUnit(delegationModel.$customError);

  const [isModalOpen, closeModal] = useModalClose(
    isStep(step, Step.CUSTOM_DELEGATION),
    delegationModel.events.closeCustomModal,
  );

  const prefixElement = (
    <div className="flex h-auto items-center">
      <Identicon size={20} address={toAddress(customDelegate, { prefix: chain?.addressPrefix })} background={false} />
    </div>
  );

  return (
    <Modal size="md" isOpen={isModalOpen} onToggle={(open) => !open && closeModal()}>
      <Modal.Title close>
        {chain && (
          <OperationTitle title={t('governance.addDelegation.customDelegationTitle')} chainId={chain.chainId} />
        )}
      </Modal.Title>
      <Modal.Content>
        <div className="py-4">
          <div className="px-5 pb-4">
            <Field text={t('governance.addDelegation.customDelegationLabel')}>
              <Input
                placeholder={t('governance.addDelegation.customDelegationPlaceholder')}
                invalid={!!customDelegate && !!error}
                value={customDelegate}
                prefixElement={prefixElement}
                onChange={delegationModel.events.customDelegateChanged}
              />
              <InputHint variant="error" active={!!customDelegate && !!error}>
                {error && t(DelegationErrorMessages[error])}
              </InputHint>
            </Field>
          </div>

          <div className="flex justify-end px-5 pt-3">
            <Button disabled={!!error} onClick={() => delegationModel.events.createCustomDelegate()}>
              {t('signing.continueButton')}
            </Button>
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
};
