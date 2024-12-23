import { type ReactNode, useState } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { BodyText, Button, Icon, RadioGroup } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { FlexibleMultisigWallet, flexibleMultisigModel } from '@/features/flexible-multisig-create';
import { flowModel } from '../../model/flow-model';

import { MultisigWallet } from './MultisigWallet';
import { type MultisigWalletType, descriptionMultisig } from './common/constants';

const MultisigModals: Record<MultisigWalletType, (onClose: VoidFunction, onBack: VoidFunction) => ReactNode> = {
  regularMultisig: (onClose, onBack) => <MultisigWallet onClose={onClose} onGoBack={onBack} />,
  flexibleMultisig: (onClose, onBack) => <FlexibleMultisigWallet onClose={onClose} onGoBack={onBack} />,
};

type Props = {
  isOpen: boolean;
};

export const SelectMultisigWalletType = ({ isOpen }: Props) => {
  // TODO: make null when we're ready to work with flexible multisig
  const [selectedFlow, setSelectedFlow] = useState<MultisigWalletType | null>('regularMultisig');

  const handleClose = () => {
    flowModel.output.flowFinished();
    flexibleMultisigModel.output.flowFinished();
  };

  if (nullable(selectedFlow)) {
    return (
      <Modal size="fit" height="fit" isOpen={isOpen} onToggle={handleClose}>
        <SelectMultisig onContinue={setSelectedFlow} />
      </Modal>
    );
  }

  // TODO: make null when we're ready to work with flexible multisig
  return <>{MultisigModals[selectedFlow](handleClose, () => setSelectedFlow('regularMultisig'))}</>;
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
          <Button disabled={!walletType} onClick={() => onContinue(walletType!)}>
            {t('signing.continueButton')}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </>
  );
};
