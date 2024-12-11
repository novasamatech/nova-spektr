import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Step, nonNullable } from '@/shared/lib/utils';
import { Alert, Button, Counter, DetailRow, Icon, IconButton, Separator } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { FeeWithLabel, MultisigDepositWithLabel } from '@/entities/transaction';
import { confirmModel } from '../../model/confirm-model';
import { flowModel } from '../../model/flow-model';
import { formModel } from '../../model/form-model';
import { signatoryModel } from '../../model/signatory-model';

import { SelectedSignatoriesModal, WalletItem } from './components';

export const ConfirmationStep = () => {
  const { t } = useI18n();

  const signerWallet = useUnit(flowModel.$signerWallet);
  const signer = useUnit(flowModel.$signer);
  const api = useUnit(flowModel.$api);
  const fakeTx = useUnit(flowModel.$fakeTx);
  const isEnoughBalance = useUnit(flowModel.$isEnoughBalance);

  const chain = useUnit(formModel.$chain);
  const signatories = useUnit(signatoryModel.$signatories);
  const ownedSignatories = useUnit(signatoryModel.$ownedSignatoriesWallets);

  const {
    fields: { name, threshold },
  } = useForm(formModel.$createMultisigForm);

  const [isSignatoriesModalOpen, toggleSignatoriesModalOpen] = useToggle();

  return (
    <>
      <Modal.Content>
        <section className="relative flex h-full w-modal flex-1 flex-col px-5">
          <div className="flex max-h-full flex-1 flex-col">
            <div className="mb-6 flex flex-col items-center">
              <Icon className="text-icon-default" name="multisigCreationConfirm" size={60} />
            </div>
            <DetailRow label={t('createMultisigAccount.walletName')}>{name.value}</DetailRow>
            <DetailRow wrapperClassName="my-4" label={t('createMultisigAccount.signatoriesLabel')}>
              <>
                <Counter className="mr-2" variant="neutral">
                  {signatories.length}
                </Counter>
                <IconButton
                  name="info"
                  className="cursor-pointer hover:text-icon-hover"
                  size={16}
                  onClick={toggleSignatoriesModalOpen}
                />
              </>
            </DetailRow>
            <DetailRow label={t('createMultisigAccount.thresholdName')}>
              {t('createMultisigAccount.thresholdOutOf', {
                threshold: threshold.value,
                signatoriesLength: signatories.length,
              })}
            </DetailRow>
            <Separator className="my-4 border-filter-border" />
            <DetailRow label={t('createMultisigAccount.signingWallet')}>
              <WalletItem
                name={signer?.name || (signerWallet?.type === WalletType.POLKADOT_VAULT && signerWallet?.name) || ''}
                type={signerWallet?.type || WalletType.POLKADOT_VAULT}
              />
            </DetailRow>
            <Separator className="my-4 border-filter-border" />
            {chain ? (
              <div className="mb-4 flex flex-1 flex-col gap-y-4">
                <MultisigDepositWithLabel
                  api={api}
                  asset={chain.assets[0]}
                  threshold={threshold.value}
                  onDepositChange={flowModel.events.multisigDepositChanged}
                />
                <FeeWithLabel
                  api={api}
                  asset={chain.assets[0]}
                  transaction={fakeTx}
                  onFeeChange={flowModel.events.feeChanged}
                  onFeeLoading={flowModel.events.isFeeLoadingChanged}
                />
                <Alert
                  variant="error"
                  title={t('createMultisigAccount.notEnoughTokensTitle')}
                  active={!isEnoughBalance}
                >
                  <Alert.Item withDot={false}>{t('createMultisigAccount.notEnoughMultisigTokens')}</Alert.Item>
                </Alert>
              </div>
            ) : null}
          </div>
        </section>
      </Modal.Content>
      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button
            variant="text"
            onClick={() => {
              if ((ownedSignatories || []).length > 1) {
                flowModel.events.stepChanged(Step.SIGNER_SELECTION);
              } else {
                flowModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD);
              }
            }}
          >
            {t('createMultisigAccount.backButton')}
          </Button>

          <SignButton
            disabled={!isEnoughBalance}
            type={signerWallet?.type || WalletType.POLKADOT_VAULT}
            onClick={confirmModel.output.formSubmitted}
          />
        </Box>
      </Modal.Footer>

      {nonNullable(chain) ? (
        <SelectedSignatoriesModal
          chain={chain}
          isOpen={isSignatoriesModalOpen}
          signatories={signatories}
          onClose={toggleSignatoriesModalOpen}
        />
      ) : null}
    </>
  );
};
