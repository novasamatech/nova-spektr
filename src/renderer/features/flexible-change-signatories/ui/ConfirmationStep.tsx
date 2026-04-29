import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { BodyText, Button, DetailRow, Icon, Separator } from '@/shared/ui';
import { TransactionValidationError, WalletIcon } from '@/shared/ui-entities';
import { Box, Modal, Tooltip } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';
import { Fee, FeeWithLabel, MultisigDepositFee, ProxyDepositLabel } from '@/widgets/transaction-fee';
import { changeSignatoriesModel } from '../model/change-signatories-model';
import { confirmModel } from '../model/confirm-model';

import { ExecutionModeSummary } from './components/ExecutionModeSummary';

type Props = {
  /**
   * Optional banner slot rendered at the top of the review block. Currently
   * used to mount <PersistentBanner> on the Confirm step so the user can still
   * see the was → will-become summary while reviewing the transaction.
   */
  banner?: ReactNode;
};

export const ConfirmationStep = ({ banner }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const signer = useUnit(changeSignatoriesModel.$signer);
  const fee = useUnit(changeSignatoriesModel.$fee);
  const chain = useUnit(changeSignatoriesModel.$chain);
  const initiatorWallet = useUnit(changeSignatoriesModel.$initiatorWallet);
  const multisigDeposit = useUnit(changeSignatoriesModel.$multisigDeposit);
  const proxyDeposit = useUnit(changeSignatoriesModel.$proxyDeposit);
  const isLoading = useUnit(changeSignatoriesModel.$isLoading);
  const canSubmit = useUnit(changeSignatoriesModel.$canSubmit);
  const validationPending = useUnit(changeSignatoriesModel.$validationPending);
  const errors = useUnit(changeSignatoriesModel.$errors);
  const isTheSameMultisig = useUnit(changeSignatoriesModel.$isTheSameMultisig);
  const isEditOperationAlreadyExists = useUnit(changeSignatoriesModel.$isEditOperationAlreadyExists);

  const signerWallet = wallets.find((wallet) => wallet.id === signer?.walletId);

  if (!signerWallet || !initiatorWallet || !signer || !chain) return;

  const asset = getNativeAsset(chain.assets);

  const disabledReason = (() => {
    if (canSubmit) return null;
    if (isLoading) return t('flexibleMultisig.editProxy.confirm.signDisabled.loading');
    if (validationPending) return t('flexibleMultisig.editProxy.confirm.signDisabled.validating');
    if (isEditOperationAlreadyExists) return t('flexibleMultisig.editProxy.confirm.signDisabled.pendingOperation');
    if (isTheSameMultisig) return t('flexibleMultisig.editProxy.confirm.signDisabled.sameMultisig');
    if (errors.length > 0) return t('flexibleMultisig.editProxy.confirm.signDisabled.balance');

    return t('flexibleMultisig.editProxy.confirm.signDisabled.invalid');
  })();

  return (
    <>
      <Modal.Content>
        <section className="relative flex h-full w-full flex-1 flex-col px-5">
          <div className="flex max-h-full flex-1 flex-col gap-y-4">
            <div className="mb-2 flex flex-col items-center">
              <Icon className="text-icon-default" name="multisigCreationConfirm" size={60} />
            </div>

            {banner ? <div className="-mx-1">{banner}</div> : null}

            {banner ? <Separator className="border-filter-border" /> : null}

            <DetailRow label={t('flexibleMultisig.editProxy.confirm.submitterWallet')}>
              <div className="flex w-full items-center justify-end gap-x-2">
                <WalletIcon type={initiatorWallet.type} />
                <BodyText as="span" className="truncate tracking-tight text-text-secondary">
                  {initiatorWallet.name}
                </BodyText>
              </div>
            </DetailRow>
            <ExecutionModeSummary />
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
                  <NamedAccount variant="short" accountId={signer.accountId} chain={chain} />
                </div>
              </div>
            </DetailRow>

            <Separator className="border-filter-border" />
            <div className="flex flex-col gap-y-4">
              <ProxyDepositLabel>
                <Fee fee={proxyDeposit} asset={asset} isLoading={isLoading} />
              </ProxyDepositLabel>
              <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} isLoading={isLoading} />

              <FeeWithLabel fee={fee} asset={asset} isLoading={isLoading} />
            </div>

            {errors.length > 0 && (
              <div className="mt-2 mb-4">
                <TransactionValidationError errors={errors} wallets={wallets} />
              </div>
            )}
          </div>
        </section>
      </Modal.Content>
      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button
            variant="text"
            onClick={() => {
              changeSignatoriesModel.confirmGoBack();
            }}
          >
            {t('createMultisigAccount.backButton')}
          </Button>

          <Tooltip open={disabledReason ? undefined : false}>
            <Tooltip.Trigger>
              <div>
                <SignButton
                  type={signerWallet.type}
                  disabled={!canSubmit}
                  isLoading={isLoading || validationPending}
                  onClick={confirmModel.startSigning}
                />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>{disabledReason}</Tooltip.Content>
          </Tooltip>
        </Box>
      </Modal.Footer>
    </>
  );
};
