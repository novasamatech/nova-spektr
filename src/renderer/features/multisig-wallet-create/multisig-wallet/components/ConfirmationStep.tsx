import { useUnit } from 'effector-react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { Step, getNativeAsset } from '@/shared/lib/utils';
import { BodyText, Button, Counter, DetailRow, Icon, IconButton, Separator } from '@/shared/ui';
import { Account, TransactionValidationError, WalletIcon } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { FeeWithLabel, MultisigDepositFee } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { confirmModel } from '../model/confirm-model';
import { flowModel } from '../model/flow-model';
import { formModel } from '../model/form-model';
import { signatoryModel } from '../model/signatory-model';

import { SelectedSignatoriesModal } from './components/SelectedSignatoriesModal';

export const ConfirmationStep = () => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const signer = useUnit(flowModel.$signer);
  const fee = useUnit(flowModel.$fee);
  const route = useUnit(flowModel.$route);
  const errors = useUnit(flowModel.$errors);
  const valid = useUnit(flowModel.$valid);
  const multisigDeposit = useUnit(flowModel.$multisigDeposit);
  const isDepositLoading = useUnit(flowModel.$isDepositLoading);

  const chain = useUnit(formModel.$chain);
  const signatories = useUnit(signatoryModel.$signatories);

  const {
    fields: { name, threshold },
  } = useForm(formModel.form);

  const signerWallet = wallets.find(wallet => wallet.id === signer?.walletId);
  const hasMultisigAccount = route.some(accountUtils.isAnyMultisigAccount);

  if (!signerWallet || !signer || !chain) return;

  const asset = getNativeAsset(chain.assets);

  return (
    <>
      <Modal.Content>
        <section className="relative flex h-full w-modal flex-1 flex-col px-5">
          <div className="flex max-h-full flex-1 flex-col gap-y-4">
            <div className="mb-2 flex flex-col items-center">
              <Icon className="text-icon-default" name="multisigCreationConfirm" size={60} />
            </div>
            <DetailRow label={t('createMultisigAccount.walletName')}>{name.value}</DetailRow>
            <DetailRow label={t('createMultisigAccount.signatoriesLabel')}>
              {chain && (
                <SelectedSignatoriesModal signatories={signatories} chain={chain}>
                  <div className="flex items-center">
                    <Counter className="mr-2" variant="neutral">
                      {signatories.length}
                    </Counter>
                    <IconButton name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                  </div>
                </SelectedSignatoriesModal>
              )}
            </DetailRow>
            <DetailRow label={t('createMultisigAccount.thresholdName')}>
              {t('createMultisigAccount.thresholdOutOf', {
                threshold: threshold.value,
                signatoriesLength: signatories.length,
              })}
            </DetailRow>
            <Separator className="border-filter-border" />
            <DetailRow label={t('createMultisigAccount.signingWallet')}>
              <div className="flex w-full items-center justify-end gap-x-2">
                <WalletIcon type={signerWallet.type} />

                <div className="flex max-w-[348px] flex-col">
                  <BodyText as="span" className="truncate tracking-tight text-text-secondary">
                    {signerWallet.name}
                  </BodyText>
                </div>
              </div>
            </DetailRow>
            <DetailRow label={t('createMultisigAccount.signingAccount')}>
              <div className="flex w-full items-center justify-end gap-x-2">
                <div className="flex max-w-[348px] flex-col text-text-secondary">
                  <Account variant="short" accountId={signer.accountId} chain={chain} />
                </div>
              </div>
            </DetailRow>

            <Separator className="border-filter-border" />
            <div className="mb-4 flex flex-1 flex-col gap-y-4">
              {hasMultisigAccount && (
                <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} isLoading={isDepositLoading} />
              )}

              <FeeWithLabel fee={fee.toString()} asset={asset} />

              <TransactionValidationError errors={errors} wallets={wallets} />
            </div>
          </div>
        </section>
      </Modal.Content>
      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button
            variant="text"
            onClick={() => {
              flowModel.stepChanged(Step.SIGNATORIES_THRESHOLD);
            }}
          >
            {t('createMultisigAccount.backButton')}
          </Button>

          <SignButton disabled={!valid} type={signerWallet.type} onClick={confirmModel.startSigning} />
        </Box>
      </Modal.Footer>
    </>
  );
};
