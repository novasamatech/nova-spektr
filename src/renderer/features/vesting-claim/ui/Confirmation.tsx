import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, DetailRow, FootnoteText, Icon, Separator } from '@/shared/ui';
import { AssetBalance, TransactionDetails, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletModel, walletUtils } from '@/entities/wallet';
import { SigningPathSection } from '@/features/signing-path';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { claimModel } from '../model/claim';
import { confirmModel } from '../model/confirm';

type Props = {
  onGoBack?: () => void;
};

export const Confirmation = memo(({ onGoBack }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  // Known the moment the button was pressed — this is what lets the modal open
  // on the click rather than on the node.
  const claim = useUnit(claimModel.$claim);
  const chain = useUnit(claimModel.$chain);
  const asset = useUnit(claimModel.$asset);
  const initiator = useUnit(claimModel.$initiator);
  const signatory = useUnit(claimModel.$signatory);
  const signingPath = useUnit(claimModel.$signingPath);

  // A round trip away each — rendered behind their own loaders.
  const fee = useUnit(claimModel.$fee);
  const pendingFee = useUnit(claimModel.$pendingFee);
  const errors = useUnit(claimModel.$errors);
  const hasMultisigAccount = useUnit(claimModel.$hasMultisigAccount);
  const multisigDeposit = useUnit(claimModel.$multisigDeposit);
  const preparing = useUnit(claimModel.$preparing);
  const canSign = useUnit(claimModel.$canSign);

  if (!claim || !chain || !initiator) return null;

  const signatoryWallet = signatory ? walletUtils.getWalletById(wallets, signatory.walletId) : null;

  return (
    <>
      <ScrollArea>
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="vestedTransferConfirm" size={60} />
          {asset && (
            <div className="flex flex-col items-center gap-y-1">
              <AssetBalance
                value={claim.claimable.toString()}
                asset={asset}
                keepPrecision
                className="text-center font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
              />
              <AssetFiatBalance
                asset={asset}
                amount={claim.claimable.toString()}
                className="text-center text-headline"
              />
            </div>
          )}
        </div>

        {/* The signatory pays the fee and reserves the deposit, so the route is the
            user's to choose whenever their wallet offers more than one. */}
        <SigningPathSection
          signingPath={signingPath}
          chain={chain}
          asset={asset}
          txErrors={errors}
          onChange={claimModel.signingPathChanged}
        />

        <Box padding={[4, 5]}>
          <TransactionDetails
            chain={chain}
            wallets={wallets}
            initiators={[initiator]}
            signatory={signatory ?? initiator}
          >
            <DetailRow label={t('vesting.confirm.labels.unlocksNow')}>
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={claim.claimable.toString()} asset={asset ?? undefined} showSymbol />
                {asset && <AssetFiatBalance asset={asset} amount={claim.claimable.toString()} />}
              </div>
            </DetailRow>
            <DetailRow label={t('vesting.confirm.labels.keepsVesting')}>
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={claim.stillLocked.toString()} asset={asset ?? undefined} showSymbol />
                {asset && <AssetFiatBalance asset={asset} amount={claim.stillLocked.toString()} />}
              </div>
            </DetailRow>
            <Separator className="border-filter-border" />
            {asset && <FeeWithLabel asset={asset} fee={fee} isLoading={pendingFee} />}
            {hasMultisigAccount && asset && (
              <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} isLoading={preparing} />
            )}
          </TransactionDetails>
        </Box>

        {/* An unaffordable fee, an unreservable multisig deposit, a wallet that
            cannot sign here — a vesting account is exactly the kind that hits these. */}
        <TransactionValidationError errors={errors} wallets={wallets} />

        <FootnoteText className="px-5 pt-3 text-text-tertiary">{t('vesting.confirm.hint')}</FootnoteText>
      </ScrollArea>

      <Modal.Footer align="between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}
        <SignButton
          type={signatoryWallet?.type}
          disabled={!canSign}
          isLoading={preparing}
          onClick={confirmModel.startSigning}
        />
      </Modal.Footer>
    </>
  );
});
