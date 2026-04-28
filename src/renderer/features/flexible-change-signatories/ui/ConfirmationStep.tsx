import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { BodyText, Button, Counter, DetailRow, Icon, IconButton, Separator } from '@/shared/ui';
import { WalletIcon } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';
import { Fee, FeeWithLabel, MultisigDepositFee, ProxyDepositLabel } from '@/widgets/transaction-fee';
import { changeSignatoriesModel } from '../model/change-signatories-model';
import { confirmModel } from '../model/confirm-model';
import { signatoryModel } from '../model/signatory-model';

import { ExecutionModeToggle } from './components/ExecutionModeToggle';
import { SelectedSignatoriesModal } from './components/SelectedSignatoriesModal';

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

  const threshold = useUnit(changeSignatoriesModel.$effectiveThreshold);
  const effectiveSignatories = useUnit(changeSignatoriesModel.$effectiveSignatories);
  const multisigDeposit = useUnit(changeSignatoriesModel.$multisigDeposit);
  const proxyDeposit = useUnit(changeSignatoriesModel.$proxyDeposit);

  // Mirror effective signatories into the SelectedSignatoriesModal-friendly shape.
  // The modal expects {address, walletId} but currently we only have AccountIds.
  // Reuse signatoryModel.$signatories which is populated from the *current* controller
  // signatories on flow.open — fine for the existing UI; the new "will-become"
  // panel is the PersistentBanner / details section above.
  const signatoriesForModal = useUnit(signatoryModel.$signatories);

  const signerWallet = wallets.find((wallet) => wallet.id === signer?.walletId);

  if (!signerWallet || !initiatorWallet || !signer || !chain) return;

  const asset = getNativeAsset(chain.assets);

  return (
    <>
      <Modal.Content>
        <section className="relative flex h-full w-modal flex-1 flex-col px-5">
          <div className="flex max-h-full flex-1 flex-col gap-y-4">
            {banner ? <div className="-mx-1 mb-2">{banner}</div> : null}

            <ExecutionModeToggle />

            <div className="mb-2 flex flex-col items-center">
              <Icon className="text-icon-default" name="multisigCreationConfirm" size={60} />
            </div>
            <DetailRow label={t('createMultisigAccount.walletName')}>{initiatorWallet.name}</DetailRow>
            <DetailRow label={t('createMultisigAccount.signatoriesLabel')}>
              {chain && (
                <SelectedSignatoriesModal signatories={signatoriesForModal} chain={chain}>
                  <div className="flex items-center">
                    <Counter className="mr-2" variant="neutral">
                      {effectiveSignatories.length}
                    </Counter>
                    <IconButton name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                  </div>
                </SelectedSignatoriesModal>
              )}
            </DetailRow>
            <DetailRow label={t('createMultisigAccount.thresholdName')}>
              {t('createMultisigAccount.thresholdOutOf', {
                threshold: threshold ?? 0,
                signatoriesLength: effectiveSignatories.length,
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
                  <NamedAccount variant="short" accountId={signer.accountId} chain={chain} />
                </div>
              </div>
            </DetailRow>

            <Separator className="border-filter-border" />
            <div className="mb-4 flex flex-1 flex-col gap-y-4">
              <ProxyDepositLabel>
                <Fee fee={proxyDeposit} asset={asset} />
              </ProxyDepositLabel>
              <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} />

              <FeeWithLabel fee={fee} asset={asset} />
            </div>
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

          <SignButton type={signerWallet.type} onClick={confirmModel.startSigning} />
        </Box>
      </Modal.Footer>
    </>
  );
};
