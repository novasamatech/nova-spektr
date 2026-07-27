import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { Alert, Button, DetailRow, FootnoteText, Icon, Separator } from '@/shared/ui';
import { AssetBalance, TransactionDetails, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletModel, walletUtils } from '@/entities/wallet';
import { DraftFormBody, DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { SigningPathSection } from '@/features/signing-path';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { countEras, countValidators } from '../lib/plan';
import { claimRewardsModel } from '../model/claim';
import { confirmModel } from '../model/confirm';

type Props = {
  onGoBack?: () => void;
};

export const Confirmation = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  // Known the moment the button was pressed — this is what lets the modal open
  // on the click rather than on the node.
  const chain = useUnit(claimRewardsModel.$chain);
  const asset = useUnit(claimRewardsModel.$asset);
  const initiator = useUnit(claimRewardsModel.$initiator);
  const signatory = useUnit(claimRewardsModel.$signatory);
  const signingPath = useUnit(claimRewardsModel.$signingPath);
  const requests = useUnit(claimRewardsModel.$requests);
  const skipped = useUnit(claimRewardsModel.$skippedRequests);
  const plans = useUnit(claimRewardsModel.$plans);
  const allPayouts = useUnit(claimRewardsModel.$allPayouts);
  const totalAmount = useUnit(claimRewardsModel.$totalAmount);

  // A round trip away each — rendered behind their own loaders.
  const totalFee = useUnit(claimRewardsModel.$totalFee);
  const pendingFee = useUnit(claimRewardsModel.$pendingFee);
  const errors = useUnit(claimRewardsModel.$errors);
  const hasMultisigAccount = useUnit(claimRewardsModel.$hasMultisigAccount);
  const multisigDeposit = useUnit(claimRewardsModel.$multisigDeposit);
  const preparing = useUnit(claimRewardsModel.$preparing);
  const canSign = useUnit(claimRewardsModel.$canSign);

  const canUseDraftMode = useUnit(claimRewardsModel.$canUseDraftMode);
  const isDraftMode = useUnit(claimRewardsModel.$isDraftMode);
  const canSaveAsDraft = useUnit(claimRewardsModel.$canSaveAsDraft);

  if (!chain || !initiator || requests.length === 0) return null;

  const signatoryWallet = signatory ? walletUtils.getWalletById(wallets, signatory.walletId) : null;

  return (
    <>
      <ScrollArea>
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name="redeemConfirm" size={60} />
          {asset && (
            <div className="flex flex-col items-center gap-y-1">
              <AssetBalance
                value={totalAmount}
                asset={asset}
                keepPrecision
                className="text-center font-manrope text-[32px] leading-[36px] font-bold text-text-primary"
              />
              <AssetFiatBalance asset={asset} amount={totalAmount} className="text-center text-headline" />
            </div>
          )}
        </div>

        <Box padding={[0, 5]} gap={4}>
          {canUseDraftMode && <DraftModeCard isOn={isDraftMode} onToggle={claimRewardsModel.draftModeToggled} />}
          {isDraftMode && asset && (
            <DraftSigningPath
              chainId={chain.chainId}
              asset={asset}
              $draftPath={claimRewardsModel.$draftSigningPath}
              draftPathCommitted={claimRewardsModel.draftPathCommitted}
              draftPathEditStarted={claimRewardsModel.draftPathEditStarted}
              draftPathEditEnded={claimRewardsModel.draftPathEditEnded}
            />
          )}
        </Box>

        <DraftFormBody
          $isDraftMode={claimRewardsModel.$isDraftMode}
          $isDraftPathComplete={claimRewardsModel.$isDraftPathComplete}
        >
          {/* The signatory pays the fee and reserves the deposit, so the route is
              the user's to choose whenever their wallet offers more than one. */}
          {!isDraftMode && (
            <SigningPathSection
              signingPath={signingPath}
              chain={chain}
              asset={asset}
              txErrors={errors}
              onChange={claimRewardsModel.signingPathChanged}
            />
          )}

          <Box padding={[4, 5]}>
            <TransactionDetails
              chain={chain}
              wallets={wallets}
              initiators={requests.map((request) => request.account)}
              signatory={signatory ?? initiator}
            >
              <DetailRow label={t('staking.claimRewards.labels.rewards')}>
                <div className="flex flex-col items-end gap-y-0.5">
                  <AssetBalance value={totalAmount} asset={asset ?? undefined} showSymbol />
                  {asset && <AssetFiatBalance asset={asset} amount={totalAmount} />}
                </div>
              </DetailRow>
              <DetailRow label={t('staking.claimRewards.labels.scope')}>
                <FootnoteText className="text-text-primary">
                  {t('staking.claimRewards.scopeValue', {
                    validators: countValidators(allPayouts),
                    eras: countEras(allPayouts),
                  })}
                </FootnoteText>
              </DetailRow>
              {plans.length > 1 && (
                <DetailRow label={t('staking.claimRewards.labels.transactions')}>
                  <FootnoteText className="text-text-primary">{plans.length}</FootnoteText>
                </DetailRow>
              )}
              <Separator className="border-filter-border" />
              {asset && <FeeWithLabel asset={asset} fee={totalFee} isLoading={pendingFee} />}
              {hasMultisigAccount && asset && (
                <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} isLoading={preparing} />
              )}
            </TransactionDetails>
          </Box>

          {!isDraftMode && <TransactionValidationError errors={errors} wallets={wallets} />}

          {/* Rewards on another network are a separate signing session — say so
              instead of quietly leaving them out of the total. */}
          {skipped.length > 0 && (
            <Box padding={[2, 5]}>
              <Alert active variant="warn" title={t('staking.claimRewards.otherNetworksTitle')}>
                <Alert.Item withDot={false}>
                  {t('staking.claimRewards.otherNetworksHint', { count: skipped.length })}
                </Alert.Item>
              </Alert>
            </Box>
          )}

          <FootnoteText className="px-5 pt-3 text-text-tertiary">
            {plans.length > 1
              ? t('staking.claimRewards.hintBatched', { total: plans.length })
              : t('staking.claimRewards.hint')}
          </FootnoteText>
        </DraftFormBody>
      </ScrollArea>

      <Modal.Footer align="between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}
        {isDraftMode ? (
          <Button disabled={!canSaveAsDraft} onClick={() => claimRewardsModel.saveAsDraftRequested()}>
            {t('operations.drafts.initiateButton')}
          </Button>
        ) : (
          <SignButton
            type={signatoryWallet?.type}
            disabled={!canSign}
            isLoading={preparing}
            onClick={confirmModel.startSigning}
          />
        )}
      </Modal.Footer>
    </>
  );
};
