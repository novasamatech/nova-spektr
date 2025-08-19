import { useUnit } from 'effector-react';

import { TEST_IDS } from '@/shared/constants';
import { useI18n } from '@/shared/i18n';
import { Step, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { Alert, Button, FootnoteText, Icon, Loader, Separator, SmallTitleText } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { OperationSubmit } from '@/features/operations';
import { assignModel } from '../model/assign-model';
import { confirmModel } from '../model/confirm-model';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';
import { formModel } from '../model/form-model';

interface Props {
  onToggle: (open: boolean) => void;
  onClose: () => void;
}

export const ConfirmationStep = ({ onToggle, onClose }: Props) => {
  const { t } = useI18n();
  const activeStep = useUnit(flexibleMultisigModel.$step);
  const isSubmitOpen = activeStep === Step.SUBMIT;

  const chain = useUnit(formModel.$chain);
  const proxyAddress = useUnit(assignModel.$proxiedAddress);
  const pendingProxyCreate = useUnit(assignModel.$pendingProxyCreate);
  const flexibleMultisigCreated = useUnit(assignModel.$flexibleMultisigCreated);

  return (
    <>
      <Modal.Content>
        <section className="relative flex h-full w-modal flex-1 flex-col px-5">
          <div className="flex max-h-full flex-1 flex-col">
            <div className="mt-4 mb-6 flex flex-col items-center">
              <Icon className="text-icon-default" name="multisigCreationConfirm" size={60} />
            </div>
            <SmallTitleText>1. {t('createMultisigAccount.flexibleMultisig.createPureProxy')}</SmallTitleText>
            <FootnoteText className="mt-2 mb-4 text-text-tertiary">
              {t('createMultisigAccount.flexibleMultisig.pureProxyConfirm')}
            </FootnoteText>
            {nullable(proxyAddress) &&
              (pendingProxyCreate ? (
                <Box direction="row" verticalAlign="center" gap={2}>
                  <Loader color="primary" size={16} />
                  <FootnoteText> {t('createMultisigAccount.flexibleMultisig.creatingFlexibleProxy')}</FootnoteText>
                </Box>
              ) : (
                <div>
                  <Button
                    prefixElement={<Icon className="text-icon-button" name="vault" size={14} />}
                    testId={TEST_IDS.MULTISIG.CREATE_PURE_BUTTON}
                    disabled={pendingProxyCreate || nonNullable(proxyAddress)}
                    onClick={() => confirmModel.startSigningProxy()}
                  >
                    {t('createMultisigAccount.flexibleMultisig.createPureProxy')}
                  </Button>
                </div>
              ))}

            {nonNullable(proxyAddress) && (
              <Box direction="row" fillContainer verticalAlign="center" gap={1}>
                <Icon className="shrink-0 text-icon-positive" name="checked" size={16} />
                <FootnoteText className="shrink-0">
                  {t('createMultisigAccount.flexibleMultisig.pureProxyCreated')}
                </FootnoteText>
                <Address
                  variant="short"
                  canCopy={true}
                  showIcon
                  address={toAddress(proxyAddress, { prefix: chain?.addressPrefix })}
                />
              </Box>
            )}
            <Separator className="my-4" />
            <SmallTitleText className={nonNullable(proxyAddress) ? 'text-text-primary' : 'text-text-secondary'}>
              2. {t('createMultisigAccount.flexibleMultisig.assignControl')}
            </SmallTitleText>
            <FootnoteText className="mt-2 text-text-tertiary">
              {t('createMultisigAccount.flexibleMultisig.assignControlDescription')}
            </FootnoteText>
            <div className="my-4">
              {flexibleMultisigCreated ? (
                <Box direction="row" fillContainer verticalAlign="center" gap={1}>
                  <Icon className="shrink-0 text-icon-positive" name="checked" size={16} />
                  <FootnoteText className="text-text-tertiary">
                    {t('createMultisigAccount.flexibleMultisig.controlAssigned')}
                  </FootnoteText>
                </Box>
              ) : (
                <Button
                  prefixElement={<Icon className="text-icon-button" name="vault" size={14} />}
                  testId={TEST_IDS.MULTISIG.ASSIGN_CONTROL_BUTTON}
                  disabled={nullable(proxyAddress)}
                  onClick={() => assignModel.startSigningFlexible()}
                >
                  {t('createMultisigAccount.flexibleMultisig.assignControl')}
                </Button>
              )}
            </div>
          </div>
          <Alert
            variant="info"
            active={!flexibleMultisigCreated}
            title={t('createMultisigAccount.flexibleMultisig.leaveFlowTitle')}
          >
            <Alert.Item withDot={false}>
              <FootnoteText className="text-text-secondary">
                {t('createMultisigAccount.flexibleMultisig.leaveFlowDescription')}
              </FootnoteText>
            </Alert.Item>
          </Alert>
        </section>
      </Modal.Content>

      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          {nonNullable(proxyAddress) &&
            (flexibleMultisigCreated ? (
              <>
                <Button variant="text" onClick={() => onToggle(false)}>
                  {t('createMultisigAccount.closeButton')}
                </Button>
                <Button onClick={() => onToggle(false)}>
                  {t('createMultisigAccount.flexibleMultisig.startUsing')}
                </Button>
              </>
            ) : (
              <Button variant="text" onClick={onClose}>
                {t('createMultisigAccount.closeButton')}
              </Button>
            ))}

          {nullable(proxyAddress) && (
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
