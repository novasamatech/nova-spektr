import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Step } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, Separator, SmallTitleText } from '@/shared/ui';
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
                onClick={() => confirmModel.startSigningProxy()}
              >
                {t('createMultisigAccount.flexibleMultisig.title')}
              </Button>
            </div>

            <Separator className="my-4" />

            <SmallTitleText>2. {t('createMultisigAccount.flexibleMultisig.assignControl')}</SmallTitleText>
            <FootnoteText className="mb-4 mt-2 text-text-tertiary">
              {t('createMultisigAccount.flexibleMultisig.assignControlDescription')}
            </FootnoteText>
            <div>
              <Button
                prefixElement={<Icon className="text-icon-button" name="vault" size={14} />}
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
