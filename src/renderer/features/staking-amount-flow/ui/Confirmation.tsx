import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Alert, Button, DetailRow, FootnoteText, Separator } from '@/shared/ui';
import { AssetBalance, TransactionDetails, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletModel, walletUtils } from '@/entities/wallet';
import { SigningPathSection } from '@/features/signing-path';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { amountFlowModel } from '../model/amount-flow';

type Props = {
  onGoBack?: () => void;
};

/**
 * The confirm the user signs — never the one they save a draft from. Draft mode
 * ends at the amount screen by design; mixing the two into one confirmation
 * would make "Sign" and "Save" argue over the same button.
 */
export const Confirmation = memo(({ onGoBack }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const mode = useUnit(amountFlowModel.$mode);
  const chain = useUnit(amountFlowModel.$chain);
  const asset = useUnit(amountFlowModel.$asset);
  const initiator = useUnit(amountFlowModel.$initiator);
  const signatory = useUnit(amountFlowModel.$signatory);
  const signingPath = useUnit(amountFlowModel.$signingPath);
  const amount = useUnit(amountFlowModel.$amountPlanck);
  const remaining = useUnit(amountFlowModel.$remainingStake);
  const activeStake = useUnit(amountFlowModel.$activeStake);
  const withChill = useUnit(amountFlowModel.$withChill);

  const fee = useUnit(amountFlowModel.$fee);
  const pendingFee = useUnit(amountFlowModel.$pendingFee);
  const errors = useUnit(amountFlowModel.$errors);
  const hasMultisigAccount = useUnit(amountFlowModel.$hasMultisigAccount);
  const multisigDeposit = useUnit(amountFlowModel.$multisigDeposit);
  const preparing = useUnit(amountFlowModel.$preparing);
  const noRouteSigner = useUnit(amountFlowModel.$noRouteSigner);
  const canSign = useUnit(amountFlowModel.$canContinue);

  if (!mode || !chain || !asset || !initiator) return null;

  const signatoryWallet = signatory ? walletUtils.getWalletById(wallets, signatory.walletId) : null;
  const resultingStake = mode === 'unbond' ? remaining : activeStake.add(amount);

  return (
    <>
      <ScrollArea>
        <div className="mb-2 flex flex-col items-center gap-y-1">
          <AssetBalance
            value={amount.toString()}
            asset={asset}
            keepPrecision
            className="text-center font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
          />
          <AssetFiatBalance asset={asset} amount={amount.toString()} className="text-center text-headline" />
        </div>

        <SigningPathSection
          signingPath={signingPath}
          chain={chain}
          asset={asset}
          txErrors={errors}
          onChange={amountFlowModel.signingPathChanged}
        />

        <Box padding={[4, 5]}>
          <TransactionDetails
            chain={chain}
            wallets={wallets}
            initiators={[initiator]}
            signatory={signatory ?? initiator}
          >
            <DetailRow
              label={
                mode === 'unbond'
                  ? t('staking.amountFlow.confirm.unbonding')
                  : t('staking.amountFlow.confirm.addingToStake')
              }
            >
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={amount.toString()} asset={asset} showSymbol />
                <AssetFiatBalance asset={asset} amount={amount.toString()} />
              </div>
            </DetailRow>
            <DetailRow label={t('staking.amountFlow.confirm.resultingStake')}>
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={resultingStake.toString()} asset={asset} showSymbol />
                <AssetFiatBalance asset={asset} amount={resultingStake.toString()} />
              </div>
            </DetailRow>
            <Separator className="border-filter-border" />
            <FeeWithLabel asset={asset} fee={fee} isLoading={pendingFee} />
            {hasMultisigAccount && (
              <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} isLoading={preparing} />
            )}
          </TransactionDetails>
        </Box>

        <TransactionValidationError errors={errors} wallets={wallets} />

        {noRouteSigner && (
          <Box padding={[2, 5]}>
            <Alert active variant="error" title={t('staking.flow.noSignerTitle')}>
              <Alert.Item withDot={false}>{t('staking.flow.noSignerHint')}</Alert.Item>
            </Alert>
          </Box>
        )}

        {withChill && (
          <FootnoteText className="px-5 pt-3 text-text-tertiary">
            {t('staking.amountFlow.confirm.chillHint')}
          </FootnoteText>
        )}
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
          onClick={amountFlowModel.startSigning}
        />
      </Modal.Footer>
    </>
  );
});
