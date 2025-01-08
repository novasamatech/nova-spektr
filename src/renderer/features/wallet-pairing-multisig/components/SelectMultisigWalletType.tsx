import { useUnit } from 'effector-react';
import { type PropsWithChildren, useState } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { BodyText, Button, Icon, RadioGroup } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
// TODO move @/features/flexible-multisig-create inside this feature
import { FlexibleMultisigWallet, flexibleMultisigModel } from '@/features/flexible-multisig-create';
import { flowModel } from '../model/flow-model';

import { MultisigWallet } from './MultisigWallet';
import { type MultisigWalletType, descriptionMultisig } from './common/constants';

export const SelectMultisigWalletType = ({ children }: PropsWithChildren) => {
  // TODO: make null when we're ready to work with flexible multisig
  const [selectedFlow, setSelectedFlow] = useState<MultisigWalletType | null>('regularMultisig');
  const open = useUnit(flowModel.flow.status);

  const toggleModal = (open: boolean) => {
    if (open) {
      flowModel.flow.open();
      flexibleMultisigModel.flow.open();
    } else {
      flowModel.flow.close();
      flexibleMultisigModel.flow.close();
    }
  };

  if (nullable(selectedFlow)) {
    return (
      <Modal size="fit" height="fit" isOpen={open} onToggle={toggleModal}>
        <Modal.Trigger>{children}</Modal.Trigger>
        <SelectMultisig onContinue={setSelectedFlow} />
      </Modal>
    );
  }

  if (selectedFlow === 'regularMultisig') {
    return (
      <MultisigWallet isOpen={open} onToggle={toggleModal} onGoBack={() => toggleModal(false)}>
        {children}
      </MultisigWallet>
    );
  }

  if (selectedFlow === 'flexibleMultisig') {
    return (
      <FlexibleMultisigWallet isOpen={open} onToggle={toggleModal} onGoBack={() => toggleModal(false)}>
        {children}
      </FlexibleMultisigWallet>
    );
  }

  return null;
};

type SelectProps = {
  onContinue: (walletType: MultisigWalletType) => void;
};

const SelectMultisig = ({ onContinue }: SelectProps) => {
  const { t } = useI18n();

  const [walletType, setWalletType] = useState<MultisigWalletType>();

  const flexibleMultisigOption = {
    id: 'flexibleMultisig',
    value: 'flexibleMultisig',
    title: t('createMultisigAccount.flexibleMultisig.flexible'),
    description: t('createMultisigAccount.selectMultisigDescription.flexibleDescription'),
  } as const;

  const regularMultisigOption = {
    id: 'regularMultisig',
    value: 'regularMultisig',
    title: t('createMultisigAccount.multisig'),
    description: t('createMultisigAccount.selectMultisigDescription.regularDescription'),
  } as const;

  return (
    <>
      <Modal.Title close>{t('createMultisigAccount.createMultisigWallet')}</Modal.Title>
      <Modal.Content>
        <RadioGroup
          className="mx-5 my-4 flex gap-x-6"
          activeId={walletType}
          options={[flexibleMultisigOption, regularMultisigOption]}
          onChange={option => setWalletType(option.value)}
        >
          <RadioGroup.CardOption option={flexibleMultisigOption}>
            <div className="flex flex-col gap-4">
              {descriptionMultisig.map(item => (
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
              {descriptionMultisig.map(item => (
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
          <Button disabled={!walletType} onClick={() => onContinue(walletType!)}>
            {t('signing.continueButton')}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </>
  );
};
