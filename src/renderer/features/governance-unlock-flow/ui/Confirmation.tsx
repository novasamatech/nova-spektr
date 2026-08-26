import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, DetailRow, FootnoteText, Icon, Separator } from '@/shared/ui';
import { AssetBalance, TransactionDetails, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletModel, walletUtils } from '@/entities/wallet';
import { SigningPathSection } from '@/features/signing-path';
import { NamedAccount } from '@/widgets/NameResolver';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { confirmModel } from '../model/confirm';
import { unlockFlowModel } from '../model/unlock-flow';

type Props = {
  onGoBack?: () => void;
};

export const Confirmation = memo(({ onGoBack }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  // Known the moment the button was pressed — this is what lets the modal open
  // on the click rather than on the node.
  const request = useUnit(unlockFlowModel.$request);
  const chain = useUnit(unlockFlowModel.$chain);
  const asset = useUnit(unlockFlowModel.$asset);
  const initiator = useUnit(unlockFlowModel.$initiator);
  const signatory = useUnit(unlockFlowModel.$signatory);
  const signingPath = useUnit(unlockFlowModel.$signingPath);

  // A round trip away each — rendered behind their own loaders.
  const fee = useUnit(unlockFlowModel.$fee);
  const pendingFee = useUnit(unlockFlowModel.$pendingFee);
  const errors = useUnit(unlockFlowModel.$errors);
  const hasMultisigAccount = useUnit(unlockFlowModel.$hasMultisigAccount);
  const multisigDeposit = useUnit(unlockFlowModel.$multisigDeposit);
  const preparing = useUnit(unlockFlowModel.$preparing);
  const canSign = useUnit(unlockFlowModel.$canSign);

  if (!request || !chain || !initiator) return null;

  const signatoryWallet = signatory ? walletUtils.getWalletById(wallets, signatory.walletId) : null;
  const amount = request.amount.toString();

  return (
    <>
      <ScrollArea>
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="unlockMst" size={60} />
          {asset && (
            <div className="flex flex-col items-center gap-y-1">
              <AssetBalance
                value={amount}
                asset={asset}
                keepPrecision
                className="text-center font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
              />
              <AssetFiatBalance asset={asset} amount={amount} className="text-center text-headline" />
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
          onChange={unlockFlowModel.signingPathChanged}
        />

        <Box padding={[4, 5]}>
          <TransactionDetails
            chain={chain}
            wallets={wallets}
            initiators={[initiator]}
            signatory={signatory ?? initiator}
          >
            <DetailRow label={t('governanceUnlockFlow.confirm.releases')}>
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={amount} asset={asset ?? undefined} showSymbol />
                {asset && <AssetFiatBalance asset={asset} amount={amount} />}
              </div>
            </DetailRow>
            {/* `unlock` is permissionless: the account released is not necessarily
                the one signing, so it is always spelled out. */}
            <DetailRow label={t('governanceUnlockFlow.confirm.target')}>
              <NamedAccount accountId={request.target} chain={chain} variant="short" />
            </DetailRow>
            <DetailRow label={t('governanceUnlockFlow.confirm.calls')}>
              <FootnoteText>
                {t('governanceUnlockFlow.confirm.callsCount', { count: request.actions.length })}
              </FootnoteText>
            </DetailRow>
            <Separator className="border-filter-border" />
            {asset && <FeeWithLabel asset={asset} fee={fee} isLoading={pendingFee} />}
            {hasMultisigAccount && asset && (
              <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} isLoading={preparing} />
            )}
          </TransactionDetails>
        </Box>

        {/* An unaffordable fee, an unreservable multisig deposit, a wallet that
            cannot sign here — an account with everything locked hits these. */}
        <TransactionValidationError errors={errors} wallets={wallets} />

        <FootnoteText className="px-5 pt-3 text-text-tertiary">{t('governanceUnlockFlow.confirm.hint')}</FootnoteText>
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
