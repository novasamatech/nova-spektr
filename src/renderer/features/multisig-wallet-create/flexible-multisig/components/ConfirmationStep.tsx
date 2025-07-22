import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Step, nonNullable, nullable } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, Loader, Separator, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { OperationSubmit } from '@/features/operations';
import { confirmModel } from '../model/confirm-model';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';

export const ConfirmationStep = () => {
  const { t } = useI18n();
  const activeStep = useUnit(flexibleMultisigModel.$step);
  const isSubmitOpen = activeStep === Step.SUBMIT;

  const signerWallet = useUnit(flexibleMultisigModel.$signerWallet);
  const signer = useUnit(flexibleMultisigModel.$signer);

  const proxyAddress = useUnit(confirmModel.$proxyAddress);
  const pendingProxyCreate = useUnit(confirmModel.$pendingProxyCreate);

  if (!signer || !signerWallet) return;

  return (
    <>
      <Modal.Content>
        <section className="relative flex h-full w-modal flex-1 flex-col px-5">
          <div className="flex max-h-full flex-1 flex-col">
            <div className="mb-6 flex flex-col items-center">
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
            <div className="mt-4">
              {pendingProxyCreate && nullable(proxyAddress) && (
                <Box direction="row" fillContainer verticalAlign="center" horizontalAlign="center">
                  <Loader color="primary" size={32} />
                  <FootnoteText> {t('createMultisigAccount.flexibleMultisig.creatingFlexibleProxy')}</FootnoteText>
                </Box>
              )}
              {nonNullable(proxyAddress) && (
                <Box direction="row" fillContainer verticalAlign="center" horizontalAlign="center" gap={1}>
                  <Icon className="shrink-0 text-icon-positive" name="checked" size={16} />
                  <FootnoteText className="shrink-0">
                    {t('createMultisigAccount.flexibleMultisig.flexibleMultisigCreated')}
                  </FootnoteText>
                  <Address variant="short" canCopy={true} showIcon address={proxyAddress} />
                </Box>
              )}
            </div>

            <Separator className="my-4" />

            <SmallTitleText>2. {t('createMultisigAccount.flexibleMultisig.assignControl')}</SmallTitleText>
            <FootnoteText className="mb-4 mt-2 text-text-tertiary">
              {t('createMultisigAccount.flexibleMultisig.assignControlDescription')}
            </FootnoteText>
            <div>
              <Button
                prefixElement={<Icon className="text-icon-button" name="vault" size={14} />}
                disabled={nullable(proxyAddress)}
                onClick={() => confirmModel.startSigningFlexible()}
              >
                {t('createMultisigAccount.flexibleMultisig.assignControl')}
              </Button>
            </div>
          </div>
        </section>
      </Modal.Content>

      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button variant="text" onClick={() => flexibleMultisigModel.stepChanged(Step.SIGNATORIES_THRESHOLD)}>
            {t('createMultisigAccount.backButton')}
          </Button>
        </Box>
      </Modal.Footer>

      {isSubmitOpen && (
        <OperationSubmit isOpen={isSubmitOpen} onClose={() => flexibleMultisigModel.stepChanged(Step.CONFIRM)} />
      )}
    </>
  );
};
