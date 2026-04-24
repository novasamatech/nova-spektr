import { type PropsWithChildren, useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { BodyText, Button, FootnoteText, HeaderTitleText, Icon, SmallTitleText } from '@/shared/ui';
import { Modal, RadioGroup } from '@/shared/ui-kit';
import { AddProxy } from '@/features/proxy-add';

import { ChangeSignatories } from './ChangeSignatories';

type ChangeSignatoriesMode = 'trust' | 'verified';

type Props = PropsWithChildren<{
  wallet: Wallet;
  onClose?: () => void;
  canUseVerifiedPath?: boolean;
}>;

export const ChangeSignatoriesFlow = ({ wallet, onClose, children, canUseVerifiedPath = true }: Props) => {
  const { t } = useI18n();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ChangeSignatoriesMode | undefined>();
  const [pendingFlow, setPendingFlow] = useState<ChangeSignatoriesMode | null>(null);
  const [activeFlow, setActiveFlow] = useState<ChangeSignatoriesMode | null>(null);
  const [trustFlowKey, setTrustFlowKey] = useState(0);
  const [verifiedFlowKey, setVerifiedFlowKey] = useState(0);

  const trustOption = {
    id: 'trust',
    value: 'trust' as const,
    title: t('flexibleMultisig.changeSignatoriesMode.trustTitle'),
    tagline: t('flexibleMultisig.changeSignatoriesMode.trustTagline'),
  };

  const verifiedOption = {
    id: 'verified',
    value: 'verified' as const,
    title: t('flexibleMultisig.changeSignatoriesMode.verifiedTitle'),
    tagline: t('flexibleMultisig.changeSignatoriesMode.verifiedTagline'),
  };

  const handlePickerToggle = (open: boolean) => {
    if (open) {
      setSelectedMode(undefined);
      setActiveFlow(null);
      setPendingFlow(null);
    }
    setPickerOpen(open);
  };

  useEffect(() => {
    if (pickerOpen || pendingFlow === null) return;

    const openDeferredFlow = () => {
      setActiveFlow(pendingFlow);
      setPendingFlow(null);
      if (pendingFlow === 'trust') {
        setTrustFlowKey((key) => key + 1);
      } else {
        setVerifiedFlowKey((key) => key + 1);
      }
    };

    const timeoutId = window.setTimeout(openDeferredFlow, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pickerOpen, pendingFlow]);

  const handleContinue = () => {
    if (!selectedMode) return;
    if (selectedMode === 'verified' && !canUseVerifiedPath) return;
    setPendingFlow(selectedMode);
    setPickerOpen(false);
  };

  const handleTrustFlowClose = () => {
    setActiveFlow(null);
    onClose?.();
  };

  const handleVerifiedFlowClose = () => {
    setActiveFlow(null);
    onClose?.();
  };

  const continueDisabled = !selectedMode || (selectedMode === 'verified' && !canUseVerifiedPath);

  return (
    <>
      <Modal size="mdlg" height="fit" isOpen={pickerOpen} onToggle={handlePickerToggle}>
        <Modal.Trigger>{children}</Modal.Trigger>
        <Modal.Title close>{t('flexibleMultisig.changeSignatoriesMode.pickerTitle')}</Modal.Title>
        <Modal.Content>
          <SmallTitleText className="mx-5 mt-4">
            {t('flexibleMultisig.changeSignatoriesMode.pickerSubtitle')}
          </SmallTitleText>
          <div className="mx-5 my-4 flex min-w-0 flex-row gap-x-6">
            <RadioGroup
              className={canUseVerifiedPath ? 'flex min-w-0 flex-1 flex-row gap-x-6' : 'w-full min-w-0 flex-1 flex-col'}
              value={selectedMode}
              onChange={(value: ChangeSignatoriesMode) => setSelectedMode(value)}
            >
              <div className={canUseVerifiedPath ? 'min-w-0 flex-1' : 'w-full'}>
                <RadioGroup.CardOption option={trustOption}>
                  <div className="flex min-h-[200px] flex-col">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <HeaderTitleText as="p" className="text-tab-text-accent">
                          {trustOption.title}
                        </HeaderTitleText>
                        <FootnoteText className="text-text-secondary">{trustOption.tagline}</FootnoteText>
                      </div>
                      <RadioGroup.RadioButton />
                    </div>
                    <BodyText className="text-text-secondary">
                      <Trans i18nKey="flexibleMultisig.changeSignatoriesMode.trustDescription" t={t} />
                    </BodyText>
                  </div>
                </RadioGroup.CardOption>
              </div>
              {canUseVerifiedPath ? (
                <div className="min-w-0 flex-1">
                  <RadioGroup.CardOption option={verifiedOption}>
                    <div className="flex min-h-[200px] flex-col">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1">
                          <HeaderTitleText as="p" className="text-tab-text-accent">
                            {verifiedOption.title}
                          </HeaderTitleText>
                          <FootnoteText className="text-text-secondary">{verifiedOption.tagline}</FootnoteText>
                        </div>
                        <RadioGroup.RadioButton />
                      </div>
                      <BodyText className="text-text-secondary">
                        <Trans i18nKey="flexibleMultisig.changeSignatoriesMode.verifiedDescription" t={t} />
                      </BodyText>
                    </div>
                  </RadioGroup.CardOption>
                </div>
              ) : null}
            </RadioGroup>
            {!canUseVerifiedPath ? (
              <div className="min-w-0 flex-1">
                <div className="rounded-sm border border-filter-border p-6 opacity-60">
                  <div className="mb-4 flex items-start gap-x-3">
                    <Icon name="delegate" className="mt-0.5 shrink-0" size={24} />
                    <div className="flex min-w-0 flex-col gap-1">
                      <HeaderTitleText as="p" className="text-tab-text-accent">
                        {verifiedOption.title}
                      </HeaderTitleText>
                      <FootnoteText className="text-text-secondary">{verifiedOption.tagline}</FootnoteText>
                    </div>
                  </div>
                  <FootnoteText className="text-text-secondary">
                    {t('flexibleMultisig.changeSignatoriesMode.verifiedUnavailable')}
                  </FootnoteText>
                </div>
              </div>
            ) : null}
          </div>
        </Modal.Content>
        <Modal.Footer>
          <Button disabled={continueDisabled} onClick={handleContinue}>
            {t('signing.continueButton')}
          </Button>
        </Modal.Footer>
      </Modal>

      {activeFlow === 'trust' && (
        <ChangeSignatories key={trustFlowKey} wallet={wallet} hideTrigger launchOpen onClose={handleTrustFlowClose}>
          {null}
        </ChangeSignatories>
      )}

      {activeFlow === 'verified' && (
        <AddProxy key={verifiedFlowKey} wallet={wallet} hideTrigger launchOpen onClose={handleVerifiedFlowClose}>
          {null}
        </AddProxy>
      )}
    </>
  );
};
