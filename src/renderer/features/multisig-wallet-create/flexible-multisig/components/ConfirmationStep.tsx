import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Step, nonNullable, nullable } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, Loader, Separator, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { OperationSubmit } from '@/features/operations';
import { assignModel } from '../model/assign-model';
import { confirmModel } from '../model/confirm-model';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';

interface Props {
  onToggle: (open: boolean) => void;
}

export const ConfirmationStep = ({ onToggle }: Props) => {
  const { t } = useI18n();
  const activeStep = useUnit(flexibleMultisigModel.$step);
  const isSubmitOpen = activeStep === Step.SUBMIT;

  const signerWallet = useUnit(flexibleMultisigModel.$signerWallet);
  const signer = useUnit(flexibleMultisigModel.$signer);

  const proxyAddress = useUnit(assignModel.$proxyAddress);
  const pendingProxyCreate = useUnit(assignModel.$pendingProxyCreate);
  const flexibleMultisigCreated = useUnit(assignModel.$flexibleMultisigCreated);

  if (!signer || !signerWallet) return;

  return (
    <>
      <Modal.Content>
        <section className="relative flex h-full w-modal flex-1 flex-col px-5">
          <div className="flex max-h-full flex-1 flex-col">
            <div className="mb-6 mt-4 flex flex-col items-center">
              <Icon className="text-icon-default" name="multisigCreationConfirm" size={60} />
            </div>
            <SmallTitleText>1. {t('createMultisigAccount.flexibleMultisig.title')}</SmallTitleText>
            <FootnoteText className="mb-4 mt-2 text-text-tertiary">
              {t('createMultisigAccount.flexibleMultisig.pureProxyConfirm')}
            </FootnoteText>
            <div>
              <Button
                prefixElement={<Icon className="text-icon-button" name="vault" size={14} />}
                disabled={pendingProxyCreate || nonNullable(proxyAddress)}
                onClick={() => confirmModel.startSigningProxy()}
              >
                {t('createMultisigAccount.flexibleMultisig.title')}
              </Button>
            </div>
            {pendingProxyCreate && nullable(proxyAddress) && (
              <div className="mt-4">
                <Box direction="row" verticalAlign="center" gap={2}>
                  <Loader color="primary" size={16} />
                  <FootnoteText> {t('createMultisigAccount.flexibleMultisig.creatingFlexibleProxy')}</FootnoteText>
                </Box>
              </div>
            )}
            {nonNullable(proxyAddress) && (
              <div className="mt-4">
                <Box direction="row" fillContainer verticalAlign="center" gap={1}>
                  <Icon className="shrink-0 text-icon-positive" name="checked" size={16} />
                  <FootnoteText className="shrink-0">
                    {t('createMultisigAccount.flexibleMultisig.flexibleMultisigCreated')}
                  </FootnoteText>
                  <Address variant="short" canCopy={true} showIcon address={proxyAddress} />
                </Box>
              </div>
            )}
            <Separator className="my-4" />
            <SmallTitleText>2. {t('createMultisigAccount.flexibleMultisig.assignControl')}</SmallTitleText>
            <FootnoteText className="mt-2 text-text-tertiary">
              {t('createMultisigAccount.flexibleMultisig.assignControlDescription')}
            </FootnoteText>
            <div className="my-4">
              <Button
                prefixElement={<Icon className="text-icon-button" name="vault" size={14} />}
                disabled={nullable(proxyAddress) || flexibleMultisigCreated}
                onClick={() => assignModel.startSigningFlexible()}
              >
                {t('createMultisigAccount.flexibleMultisig.assignControl')}
              </Button>
            </div>
            {flexibleMultisigCreated && (
              <Box direction="row" fillContainer verticalAlign="center" gap={1}>
                <Icon className="shrink-0 text-icon-positive" name="checked" size={16} />
                <FootnoteText className="text-text-tertiary">
                  {t('createMultisigAccount.flexibleMultisig.controlAssigned')}
                </FootnoteText>
              </Box>
            )}
          </div>
        </section>
      </Modal.Content>

      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          {flexibleMultisigCreated ? (
            <>
              <Button variant="text" onClick={() => onToggle(false)}>
                {t('createMultisigAccount.closeButton')}
              </Button>
              <Button onClick={() => onToggle(false)}>{t('createMultisigAccount.flexibleMultisig.startUsing')}</Button>
            </>
          ) : (
            <Button variant="text" onClick={() => flexibleMultisigModel.stepChanged(Step.SIGNATORIES_THRESHOLD)}>
              {t('createMultisigAccount.backButton')}
            </Button>
          )}
        </Box>
      </Modal.Footer>

      {isSubmitOpen && (
        <OperationSubmit isOpen={isSubmitOpen} onClose={() => flexibleMultisigModel.stepChanged(Step.CONFIRM)} />
      )}
    </>
  );
};
