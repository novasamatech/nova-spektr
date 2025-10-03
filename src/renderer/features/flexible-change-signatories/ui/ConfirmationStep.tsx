import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Step, getNativeAsset } from '@/shared/lib/utils';
import { BodyText, Button, Counter, DetailRow, Icon, IconButton, Separator } from '@/shared/ui';
import { Account, WalletIcon } from '@/shared/ui-entities';
import { Box, Modal } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { Fee, FeeWithLabel, MultisigDepositFee, ProxyDepositLabel } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { changeSignatoriesModel } from '../model/change-signatories-model';
import { confirmModel } from '../model/confirm-model';
import { formModel } from '../model/form-model';
import { signatoryModel } from '../model/signatory-model';

import { SelectedSignatoriesModal } from './components/SelectedSignatoriesModal';

export const ConfirmationStep = () => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const signer = useUnit(changeSignatoriesModel.$signer);
  const fee = useUnit(changeSignatoriesModel.$fee);
  const chain = useUnit(changeSignatoriesModel.$chain);
  const initiatorWallet = useUnit(changeSignatoriesModel.$initiatorWallet);

  const threshold = useUnit(formModel.$threshold);
  const multisigDeposit = useUnit(changeSignatoriesModel.$multisigDeposit);
  const proxyDeposit = useUnit(changeSignatoriesModel.$proxyDeposit);

  const signatories = useUnit(signatoryModel.$signatories);

  const signerWallet = wallets.find((wallet) => wallet.id === signer?.walletId);

  if (!signerWallet || !initiatorWallet || !signer || !chain) return;

  const asset = getNativeAsset(chain.assets);

  return (
    <>
      <Modal.Content>
        <section className="relative flex h-full w-modal flex-1 flex-col px-5">
          <div className="flex max-h-full flex-1 flex-col gap-y-4">
            <div className="mb-2 flex flex-col items-center">
              <Icon className="text-icon-default" name="multisigCreationConfirm" size={60} />
            </div>
            <DetailRow label={t('createMultisigAccount.walletName')}>{initiatorWallet.name}</DetailRow>
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
                threshold: threshold,
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
              <ProxyDepositLabel>
                <Fee fee={proxyDeposit ?? ''} asset={asset} />
              </ProxyDepositLabel>
              <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} />

              <FeeWithLabel fee={fee.toString()} asset={asset} />
            </div>
          </div>
        </section>
      </Modal.Content>
      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button
            variant="text"
            onClick={() => {
              changeSignatoriesModel.stepChanged(Step.SIGNATORIES_THRESHOLD);
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
