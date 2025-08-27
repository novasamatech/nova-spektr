import { type PropsWithChildren, useState } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { isDev, nullable } from '@/shared/lib/utils';
import { BodyText, Button, Icon, RadioGroup, SmallTitleText } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';

import { type MultisigWalletType, descriptionMultisig } from './constants';
import { FlexibleMultisigWallet, flexibleMultisigModel } from './flexible-multisig';
import { MultisigWallet, flowModel } from './multisig-wallet';

export const SelectMultisigWalletType = ({ children }: PropsWithChildren) => {
  // TODO remove when flexible multisig is ready for prod
  const flowStatus = isDev() ? null : 'regularMultisig';

  const [selectedFlow, setSelectedFlow] = useState<MultisigWalletType | null>(flowStatus);
  const [isOpen, setToggle] = useState<boolean>(false);

  const toggleModal = (open: boolean) => {
    setToggle(open);

    if (!open) {
      flowModel.flow.close();
      flexibleMultisigModel.flow.close();
      setSelectedFlow(flowStatus);
    }
  };

  const handleGoBack = () => {
    // TODO remove when flexible multisig is ready for prod
    if (!isDev()) {
      return toggleModal(false);
    }

    setSelectedFlow(flowStatus);
    flowModel.flow.close();
    flexibleMultisigModel.flow.close();
  };

  if (nullable(selectedFlow)) {
    return (
      <Modal size="fit" height="fit" isOpen={isOpen} onToggle={toggleModal}>
        <Modal.Trigger>{children}</Modal.Trigger>
        <SelectMultisig onContinue={setSelectedFlow} />
      </Modal>
    );
  }

  if (selectedFlow === 'regularMultisig') {
    return (
      <MultisigWallet isOpen={isOpen} onToggle={toggleModal} onGoBack={handleGoBack}>
        {children}
      </MultisigWallet>
    );
  }

  if (selectedFlow === 'flexibleMultisig') {
    return (
      <FlexibleMultisigWallet isOpen={isOpen} onToggle={toggleModal} onGoBack={handleGoBack}>
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
                    <Trans
                      t={t}
                      i18nKey={item.text}
                      components={{
                        header: <SmallTitleText as="span" />,
                      }}
                    />
                  </BodyText>
                </div>
              ))}
            </div>
            <BodyText className="mt-8 text-text-tertiary">
              <Trans
                t={t}
                i18nKey="createMultisigAccount.selectMultisigDescription.flexibleNote"
                components={{
                  header: <SmallTitleText className="text-text-tertiary" as="span" />,
                }}
              />
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
                    <Trans
                      t={t}
                      i18nKey={item.text}
                      components={{
                        header: <SmallTitleText as="span" />,
                      }}
                    />
                  </BodyText>
                </div>
              ))}
            </div>
            <BodyText className="mt-12 text-text-tertiary">
              <Trans
                t={t}
                i18nKey="createMultisigAccount.selectMultisigDescription.regularNote"
                components={{
                  header: <SmallTitleText className="text-text-tertiary" as="span" />,
                }}
              />
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
