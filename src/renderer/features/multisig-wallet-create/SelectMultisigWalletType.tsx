import { type PropsWithChildren, useState } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button, FootnoteText, HeaderTitleText, Icon, InfoLink } from '@/shared/ui';
import { Modal, RadioGroup } from '@/shared/ui-kit';

import { type MultisigWalletType, flexibleMultisigFeatures, regularMultisigFeatures } from './constants';
import { FlexibleMultisigWallet, flexibleMultisigModel } from './flexible-multisig';
import { MultisigWallet, flowModel } from './multisig-wallet';

export const SelectMultisigWalletType = ({ children }: PropsWithChildren) => {
  const flowStatus = null;

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
  } as const;

  const regularMultisigOption = {
    id: 'regularMultisig',
    value: 'regularMultisig',
    title: t('createMultisigAccount.multisig'),
  } as const;

  return (
    <>
      <Modal.Title close>{t('createMultisigAccount.createMultisigWallet')}</Modal.Title>
      <Modal.Content>
        <RadioGroup
          className="mx-5 my-4 flex flex-row gap-x-6"
          value={walletType}
          onChange={value => setWalletType(value as MultisigWalletType)}
        >
          <div className="max-w-[300px] flex-1">
            <RadioGroup.CardOption option={flexibleMultisigOption}>
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-x-3">
                  <Icon name="flexibleMultisigBackground" className="shrink-0" size={32} />
                  <HeaderTitleText as="p" className="text-tab-text-accent">
                    {flexibleMultisigOption.title}
                  </HeaderTitleText>
                </div>
                <RadioGroup.RadioButton />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex flex-col gap-4">
                  {flexibleMultisigFeatures.map(item => (
                    <div className="flex items-start gap-x-2" key={item.text}>
                      <span className="shrink-0 font-bold text-text-primary">•</span>
                      <FootnoteText>
                        <Trans
                          t={t}
                          i18nKey={item.text}
                          components={{
                            header: <FootnoteText as="span" className="font-bold" />,
                          }}
                        />
                      </FootnoteText>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-6">
                  <InfoLink url="#" className="flex items-center gap-x-1">
                    <Trans t={t} i18nKey="createMultisigAccount.selectMultisigDescription.flexibleWikiLink" />
                    <Icon name="link" size={12} className="text-inherit" />
                  </InfoLink>
                </div>
              </div>
            </RadioGroup.CardOption>
          </div>
          <div className="max-w-[300px] flex-1">
            <RadioGroup.CardOption option={regularMultisigOption}>
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-x-3">
                  <Icon name="multisigBackground" className="shrink-0" size={32} />
                  <HeaderTitleText as="p" className="text-tab-text-accent">
                    {regularMultisigOption.title}
                  </HeaderTitleText>
                </div>
                <RadioGroup.RadioButton />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex flex-col gap-4">
                  {regularMultisigFeatures.map(item => (
                    <div className="flex items-start gap-x-2" key={item.text}>
                      <span className="shrink-0 font-bold text-text-primary">•</span>
                      <FootnoteText>
                        <Trans
                          t={t}
                          i18nKey={item.text}
                          components={{
                            header: <FootnoteText as="span" className="font-bold" />,
                          }}
                        />
                      </FootnoteText>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-6">
                  <InfoLink url="#" className="flex items-center gap-x-1">
                    <Trans t={t} i18nKey="createMultisigAccount.selectMultisigDescription.regularWikiLink" />
                    <Icon name="link" size={12} className="text-inherit" />
                  </InfoLink>
                </div>
              </div>
            </RadioGroup.CardOption>
          </div>
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
