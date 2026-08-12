import { useUnit } from 'effector-react';
import { memo } from 'react';

import { RewardsDestination } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { Alert, Button, DetailRow, Separator } from '@/shared/ui';
import { Address, AssetBalance, TransactionDetails, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletModel, walletUtils } from '@/entities/wallet';
import { SigningPathSection } from '@/features/signing-path';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { newPositionFlowModel } from '../model/new-position-flow';

type Props = {
  onGoBack?: () => void;
};

/**
 * The confirm the user signs — never the one they save a draft from. Draft mode
 * ends at the form screen by design.
 */
export const Confirmation = memo(({ onGoBack }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const chain = useUnit(newPositionFlowModel.$chain);
  const asset = useUnit(newPositionFlowModel.$asset);
  const initiator = useUnit(newPositionFlowModel.$initiator);
  const signatory = useUnit(newPositionFlowModel.$signatory);
  const signingPath = useUnit(newPositionFlowModel.$signingPath);
  const amount = useUnit(newPositionFlowModel.$amountPlanck);
  const destinationType = useUnit(newPositionFlowModel.$destinationType);
  const destination = useUnit(newPositionFlowModel.$destination);
  const validators = useUnit(newPositionFlowModel.$validators);

  const fee = useUnit(newPositionFlowModel.$fee);
  const pendingFee = useUnit(newPositionFlowModel.$pendingFee);
  const errors = useUnit(newPositionFlowModel.$errors);
  const hasMultisigAccount = useUnit(newPositionFlowModel.$hasMultisigAccount);
  const multisigDeposit = useUnit(newPositionFlowModel.$multisigDeposit);
  const preparing = useUnit(newPositionFlowModel.$preparing);
  const noRouteSigner = useUnit(newPositionFlowModel.$noRouteSigner);
  const isTxValid = useUnit(newPositionFlowModel.$isTxValid);

  if (!chain || !asset || !initiator) return null;

  const signatoryWallet = signatory ? walletUtils.getWalletById(wallets, signatory.walletId) : null;

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
          onChange={newPositionFlowModel.signingPathChanged}
        />

        <Box padding={[4, 5]}>
          <TransactionDetails
            chain={chain}
            wallets={wallets}
            initiators={[initiator]}
            signatory={signatory ?? initiator}
          >
            <DetailRow label={t('staking.newPosition.confirm.staking')}>
              <div className="flex flex-col items-end gap-y-0.5">
                <AssetBalance value={amount.toString()} asset={asset} showSymbol />
                <AssetFiatBalance asset={asset} amount={amount.toString()} />
              </div>
            </DetailRow>
            <DetailRow label={t('staking.newPosition.confirm.rewardsDestination')}>
              {destinationType === RewardsDestination.RESTAKE ? (
                t('staking.newPosition.restakeRewards')
              ) : (
                <Address showIcon variant="short" iconSize={16} address={toAddress(destination)} />
              )}
            </DetailRow>
            <DetailRow label={t('staking.newPosition.confirm.validators')}>
              {t('staking.newPosition.confirm.validatorsCount', { count: validators.length })}
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
      </ScrollArea>

      <Modal.Footer align="between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}
        <SignButton
          type={signatoryWallet?.type}
          disabled={!isTxValid || preparing || noRouteSigner}
          isLoading={preparing}
          onClick={newPositionFlowModel.startSigning}
        />
      </Modal.Footer>
    </>
  );
});
