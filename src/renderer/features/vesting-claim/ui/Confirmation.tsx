import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { Button, DetailRow, FootnoteText, Icon, Separator } from '@/shared/ui';
import { AssetBalance, TransactionDetails, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';
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
  const confirms = useUnit(confirmModel.$confirms);
  const preparing = useUnit(claimModel.$preparing);

  const chain = useUnit(claimModel.$chain);
  const asset = useUnit(claimModel.$asset);
  const signingPath = useUnit(claimModel.$signingPath);

  const first = confirms.at(0) ?? null;
  if (!first) return null;

  const { errors, hasMultisigAccount, multisigDeposit } = first.meta;
  const primaryAsset = getNativeAsset(first.meta.chain.assets);

  return (
    <>
      <ScrollArea>
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="vestedTransferConfirm" size={60} />
          {primaryAsset && (
            <div className="flex flex-col items-center gap-y-1">
              <AssetBalance
                value={first.meta.claimable}
                asset={primaryAsset}
                keepPrecision
                className="text-center font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
              />
              <AssetFiatBalance
                asset={primaryAsset}
                amount={first.meta.claimable}
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

        <div className="flex flex-col gap-y-4">
          {confirms.map((confirm) => {
            const { chain: confirmChain, initiator, signatory, claimable, stillLocked, fee } = confirm.meta;
            const confirmAsset = getNativeAsset(confirmChain.assets);

            return (
              <Box key={confirm.meta.id ?? confirm.meta.initiator.accountId} padding={[4, 5]}>
                <TransactionDetails
                  chain={confirmChain}
                  wallets={wallets}
                  initiators={[initiator]}
                  signatory={signatory}
                >
                  <DetailRow label={t('vesting.confirm.labels.unlocksNow')}>
                    <div className="flex flex-col items-end gap-y-0.5">
                      <AssetBalance value={claimable} asset={confirmAsset} showSymbol />
                      <AssetFiatBalance asset={confirmAsset} amount={claimable} />
                    </div>
                  </DetailRow>
                  <DetailRow label={t('vesting.confirm.labels.keepsVesting')}>
                    <div className="flex flex-col items-end gap-y-0.5">
                      <AssetBalance value={stillLocked} asset={confirmAsset} showSymbol />
                      <AssetFiatBalance asset={confirmAsset} amount={stillLocked} />
                    </div>
                  </DetailRow>
                  <Separator className="border-filter-border" />
                  <FeeWithLabel asset={confirmAsset} fee={fee} />
                  {hasMultisigAccount && confirmAsset && (
                    <MultisigDepositFee asset={confirmAsset} multisigDeposit={multisigDeposit} isLoading={preparing} />
                  )}
                </TransactionDetails>
              </Box>
            );
          })}
        </div>

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
          type={first.wallets.signatory.type}
          disabled={errors.length > 0 || preparing}
          isLoading={preparing}
          onClick={confirmModel.startSigning}
        />
      </Modal.Footer>
    </>
  );
});
