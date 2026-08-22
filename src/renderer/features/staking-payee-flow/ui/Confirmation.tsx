import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { Alert, Button, DetailRow, FootnoteText, Separator } from '@/shared/ui';
import { TransactionDetails, TransactionValidationError, UnknownRecipientAckBox } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { walletModel, walletUtils } from '@/entities/wallet';
import { MultisigOperationDescriptionField } from '@/features/operations/OperationsConfirm/common/MultisigOperationDescriptionField';
import { SigningPathSection } from '@/features/signing-path';
import { NamedAccount } from '@/widgets/NameResolver';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { payeeFlowModel } from '../model/payee-flow';

type Props = {
  onGoBack?: () => void;
};

/**
 * The confirm the user signs — never the one they save a draft from. Draft mode
 * ends at the form by design.
 *
 * The unknown-recipient box lives here, not on the form: the user has to read
 * the destination they are about to commit to, next to the fee and the signer,
 * before acknowledging it.
 */
export const Confirmation = memo(({ onGoBack }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const chain = useUnit(payeeFlowModel.$chain);
  const asset = useUnit(payeeFlowModel.$asset);
  const initiator = useUnit(payeeFlowModel.$initiator);
  const signatory = useUnit(payeeFlowModel.$signatory);
  const signingPath = useUnit(payeeFlowModel.$signingPath);
  const selection = useUnit(payeeFlowModel.$selection);
  const destinationAccountId = useUnit(payeeFlowModel.$destinationAccountId);

  const fee = useUnit(payeeFlowModel.$fee);
  const pendingFee = useUnit(payeeFlowModel.$pendingFee);
  const errors = useUnit(payeeFlowModel.$errors);
  const hasMultisigAccount = useUnit(payeeFlowModel.$hasMultisigAccount);
  const multisigDeposit = useUnit(payeeFlowModel.$multisigDeposit);
  const preparing = useUnit(payeeFlowModel.$preparing);
  const noRouteSigner = useUnit(payeeFlowModel.$noRouteSigner);
  const recipientWarning = useUnit(payeeFlowModel.$recipientWarning);
  const isRiskAcknowledged = useUnit(payeeFlowModel.$isRiskAcknowledged);
  const canSign = useUnit(payeeFlowModel.$canSign);
  const canUseBasket = useUnit(payeeFlowModel.$canUseBasket);

  if (!chain || !asset || !initiator) return null;

  const signatoryWallet = signatory ? walletUtils.getWalletById(wallets, signatory.walletId) : null;
  const isRestake = selection.option === 'restake';

  return (
    <>
      <ScrollArea>
        <SigningPathSection
          signingPath={signingPath}
          chain={chain}
          asset={asset}
          txErrors={errors}
          onChange={payeeFlowModel.signingPathChanged}
        />

        <Box padding={[4, 5]}>
          <TransactionDetails
            chain={chain}
            wallets={wallets}
            initiators={[initiator]}
            signatory={signatory ?? initiator}
          >
            <DetailRow label={t('staking.payeeFlow.confirm.destination')}>
              {isRestake ? (
                <FootnoteText className="text-text-secondary">{t('staking.payeeFlow.confirm.restaked')}</FootnoteText>
              ) : (
                <NamedAccount
                  accountId={destinationAccountId ?? toAccountId(selection.address)}
                  chain={chain}
                  walletNameAs="fallback"
                  variant="short"
                  iconSize={20}
                />
              )}
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

        {/* Renders nothing for `none`; the model already ignores it in draft mode. */}
        {!isRestake && (
          <Box padding={[2, 5]}>
            <UnknownRecipientAckBox
              warning={recipientWarning}
              context="transfer"
              checked={isRiskAcknowledged}
              onToggle={payeeFlowModel.riskAcknowledgedToggled}
            />
          </Box>
        )}

        <FootnoteText className="px-5 pt-3 text-text-tertiary">
          {isRestake ? t('staking.payeeFlow.hint') : t('staking.payeeFlow.recipientHint')}
        </FootnoteText>

        <div className="px-5 pb-4">
          <MultisigOperationDescriptionField />
        </div>
      </ScrollArea>

      <Modal.Footer align="between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}
        <div className="flex gap-4">
          {canUseBasket && (
            <Button pallet="secondary" onClick={() => payeeFlowModel.txSaved()}>
              {t('operation.addToBasket')}
            </Button>
          )}
          <SignButton
            isDefault={canUseBasket}
            type={signatoryWallet?.type}
            disabled={!canSign}
            isLoading={preparing}
            onClick={payeeFlowModel.startSigning}
          />
        </div>
      </Modal.Footer>
    </>
  );
});
