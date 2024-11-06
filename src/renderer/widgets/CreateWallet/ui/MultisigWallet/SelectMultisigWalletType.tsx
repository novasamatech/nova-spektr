import { useUnit } from 'effector-react';
import { useState } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep } from '@/shared/lib/utils';
import { BodyText, Button, HeaderTitleText, Icon, RadioGroup } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { FlexibleMultisigWallet, flexibleMultisigModel } from '@/features/flexible-multisig-create';
import { OperationSubmit } from '@/features/operations';
import { flowModel } from '../../model/flow-model';
import { selectMultisigModel } from '../../model/select-multisig-model';

import { MultisigWallet } from './MultisigWallet';
import { MultisigWalletType, descriptionMultisig } from './common/constants';

const getModalSize = (step: Step) => {
  switch (step) {
    case Step.SELECT_MULTISIG:
      return 'fit';
    case Step.SIGN:
    case Step.CONFIRM:
    case Step.SIGNER_SELECTION:
      return 'md';
    default:
      return 'lg';
  }
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const SelectMultisigWalletType = ({ isOpen }: Props) => {
  const [isModalOpen, closeModal] = useModalClose(isOpen, selectMultisigModel.events.flowFinished);
  const step = useUnit(selectMultisigModel.$step);

  if (isStep(step, Step.SUBMIT)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  return (
    <Modal size={getModalSize(step)} isOpen={isModalOpen} onToggle={closeModal}>
      {isStep(step, Step.SELECT_MULTISIG) && <SelectMultisig />}

      <MultisigWallet />
      <FlexibleMultisigWallet />
    </Modal>
  );
};

const SelectMultisig = () => {
  const { t } = useI18n();

  const [walletType, setWalletType] = useState<MultisigWalletType>();

  const flexibleMultisigOption = {
    id: MultisigWalletType.FLEXIBLE,
    value: MultisigWalletType.FLEXIBLE,
    title: t('createMultisigAccount.flexibleMultisig.flexible'),
    description: t('createMultisigAccount.selectMultisigDescription.flexibleDescription'),
  };

  const regularMultisigOption = {
    id: MultisigWalletType.REGULAR,
    value: MultisigWalletType.REGULAR,
    title: t('createMultisigAccount.multisig'),
    description: t('createMultisigAccount.selectMultisigDescription.regularDescription'),
  };

  const handleContinue = () => {
    selectMultisigModel.events.selectMultisigType(walletType!);

    if (walletType === MultisigWalletType.FLEXIBLE) {
      flexibleMultisigModel.events.stepChanged(Step.NAME_NETWORK);

      return;
    }
    flowModel.events.stepChanged(Step.NAME_NETWORK);
  };

  return (
    <>
      <Modal.Title close>
        <HeaderTitleText>{t('createMultisigAccount.createMultisigWallet')}</HeaderTitleText>
      </Modal.Title>
      <Modal.Content>
        <RadioGroup
          className="mx-5 my-4 flex gap-x-6"
          activeId={walletType}
          options={[flexibleMultisigOption, regularMultisigOption]}
          onChange={(option) => setWalletType(option.value)}
        >
          <RadioGroup.CardOption option={flexibleMultisigOption}>
            <div className="flex flex-col gap-4">
              {descriptionMultisig.map((item) => (
                <div className="flex items-start gap-x-2" key={item.text}>
                  <Icon name="checkmarkOutline" className="mt-1 shrink-0 text-text-positive" size={14} />
                  <BodyText>
                    <Trans t={t} i18nKey={item.text} />
                  </BodyText>
                </div>
              ))}
            </div>
            <BodyText className="mt-8 text-text-tertiary">
              <Trans t={t} i18nKey="createMultisigAccount.selectMultisigDescription.flexibleNote" />
            </BodyText>
          </RadioGroup.CardOption>
          <RadioGroup.CardOption option={regularMultisigOption}>
            <div className="flex flex-col gap-4">
              {descriptionMultisig.map((item) => (
                <div className="flex items-start gap-x-2" key={item.text}>
                  {item.onlyFlexible ? (
                    <Icon name="closeOutline" className="mt-1 shrink-0 text-text-negative" size={14} />
                  ) : (
                    <Icon name="checkmarkOutline" className="mt-1 shrink-0 text-text-positive" size={14} />
                  )}
                  <BodyText>
                    <Trans t={t} i18nKey={item.text} />
                  </BodyText>
                </div>
              ))}
            </div>
            <BodyText className="mt-8 text-text-tertiary">
              <Trans t={t} i18nKey="createMultisigAccount.selectMultisigDescription.regularNote" />
            </BodyText>
          </RadioGroup.CardOption>
        </RadioGroup>

        <Modal.Footer>
          <Button disabled={!walletType} onClick={handleContinue}>
            {t('signing.continueButton')}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </>
  );
};
