import { useStoreMap, useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Alert, Button, CaptionText, DetailRow, FootnoteText, Icon, Separator } from '@/shared/ui';
import { AssetBalance, TransactionDetails, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea } from '@/shared/ui-kit';
import { identity } from '@/domains/network';
import { SignButton } from '@/entities/operations';
import { SelectedValidatorsModal } from '@/entities/staking';
import { walletModel, walletUtils } from '@/entities/wallet';
import { DraftFormBody, DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { MultisigOperationDescriptionField } from '@/features/operations/OperationsConfirm/common/MultisigOperationDescriptionField';
import { SigningPathSection } from '@/features/signing-path';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { confirmModel } from '../model/confirm';
import { confirmFlowModel } from '../model/confirm-flow';

type Props = {
  onGoBack?: () => void;
};

/**
 * One confirm for both modes.
 *
 * Everything it leads with — the account, the chain, the set, the redeemable
 * figure — was in hand the moment the button was pressed. The wrapped
 * transaction, the fee and the validation each cost a round trip, so they
 * stream in behind their own loaders with `Sign` disabled until they land.
 */
export const Confirmation = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);

  const mode = useUnit(confirmFlowModel.$mode);
  const chain = useUnit(confirmFlowModel.$chain);
  const asset = useUnit(confirmFlowModel.$asset);
  const initiator = useUnit(confirmFlowModel.$initiator);
  const position = useUnit(confirmFlowModel.$position);
  const signatory = useUnit(confirmFlowModel.$signatory);
  const signingPath = useUnit(confirmFlowModel.$signingPath);
  const validators = useUnit(confirmFlowModel.$validators);
  const amount = useUnit(confirmFlowModel.$amount);

  const fee = useUnit(confirmFlowModel.$fee);
  const pendingFee = useUnit(confirmFlowModel.$pendingFee);
  const errors = useUnit(confirmFlowModel.$errors);
  const hasMultisigAccount = useUnit(confirmFlowModel.$hasMultisigAccount);
  const multisigDeposit = useUnit(confirmFlowModel.$multisigDeposit);
  const preparing = useUnit(confirmFlowModel.$preparing);
  const noRouteSigner = useUnit(confirmFlowModel.$noRouteSigner);
  const nothingLeftToRedeem = useUnit(confirmFlowModel.$nothingLeftToRedeem);
  const canSign = useUnit(confirmFlowModel.$canSign);
  const canUseBasket = useUnit(confirmFlowModel.$canUseBasket);

  const isDraftMode = useUnit(confirmFlowModel.$isDraftMode);
  const canSaveAsDraft = useUnit(confirmFlowModel.$canSaveAsDraft);

  const identities = useStoreMap({
    store: identity.$list,
    keys: [chain?.chainId],
    fn: (list, [chainId]) => (chainId ? (list[chainId] ?? {}) : {}),
  });

  const [isValidatorsOpen, setValidatorsOpen] = useState(false);

  // Deliberately not gated on the initiator.
  //
  // This screen *is* the first screen of the flow, and a position the user
  // cannot sign for — an address-book contact, a multisig with no signatory of
  // ours — arrives here with no local account at all and draft mode already on.
  // Bailing on a null initiator opened the modal, painted its title, and left
  // the body blank: the validator set the user had just picked was thrown away
  // with nothing said, and the draft affordance built for exactly this case sat
  // below the guard that hid it.
  if (!mode || !chain || !asset) return null;

  const isRedeem = mode === 'redeem';
  const signatoryWallet = signatory ? walletUtils.getWalletById(wallets, signatory.walletId) : null;

  // What the operation does, which is worth showing whether or not we hold the
  // account it will run from.
  const operationRow = isRedeem ? (
    <DetailRow label={t('staking.confirmFlow.labels.redeeming')}>
      <div className="flex flex-col items-end gap-y-0.5">
        <AssetBalance value={amount} asset={asset} showSymbol />
        <AssetFiatBalance asset={asset} amount={amount} />
      </div>
    </DetailRow>
  ) : (
    <DetailRow label={t('staking.confirmFlow.labels.validators')}>
      <button
        type="button"
        className="group flex items-center gap-x-1 rounded-sm px-2 py-1 hover:bg-action-background-hover"
        onClick={() => setValidatorsOpen(true)}
      >
        <div className="rounded-[30px] bg-icon-accent px-1.5 py-px">
          <CaptionText className="text-white">{validators.length}</CaptionText>
        </div>
        <Icon className="group-hover:text-icon-hover" name="info" size={16} />
      </button>
    </DetailRow>
  );

  return (
    <>
      <ScrollArea>
        <div className="mb-2 flex flex-col items-center gap-y-3">
          <Icon className="text-icon-default" name={isRedeem ? 'redeemConfirm' : 'changeValidatorsConfirm'} size={60} />
          {isRedeem && (
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

        <Box padding={[0, 5]} gap={4}>
          <DraftModeCard isOn={isDraftMode} onToggle={confirmFlowModel.toggleDraftMode} />
          {isDraftMode && (
            /* The draft runs from the position the user opened, never from an
               account they happen to pick in the source list: the submission
               executes from the path's first node, and any other origin has no
               rights over this stash. */
            <DraftSigningPath
              chainId={chain.chainId}
              asset={asset}
              pinnedSourceAccountId={position?.accountId ?? null}
              $draftPath={confirmFlowModel.$draftSigningPath}
              draftPathCommitted={confirmFlowModel.draftPathCommitted}
              draftPathEditStarted={confirmFlowModel.draftPathEditStarted}
              draftPathEditEnded={confirmFlowModel.draftPathEditEnded}
              onLeaveFlow={confirmFlowModel.flowClosed}
            />
          )}
        </Box>

        <DraftFormBody
          $isDraftMode={confirmFlowModel.$isDraftMode}
          $isDraftPathComplete={confirmFlowModel.$isDraftPathComplete}
        >
          {/* The signatory pays the fee and reserves the deposit, so the route is
              the user's to choose whenever their wallet offers more than one. */}
          {!isDraftMode && (
            <SigningPathSection
              signingPath={signingPath}
              chain={chain}
              asset={asset}
              txErrors={errors}
              onChange={confirmFlowModel.signingPathChanged}
            />
          )}

          <Box padding={[4, 5]}>
            {/* `TransactionDetails` describes who signs and what it costs, and
                dereferences the signatory to do it. With no local account there
                is no signatory and no fee of ours to quote — the draft's own
                source and route are drawn above — so only what the operation
                does is carried over. */}
            {initiator ? (
              <TransactionDetails
                chain={chain}
                wallets={wallets}
                initiators={[initiator]}
                signatory={signatory ?? initiator}
              >
                {operationRow}
                <Separator className="border-filter-border" />
                <FeeWithLabel asset={asset} fee={fee} isLoading={pendingFee} />
                {hasMultisigAccount && (
                  <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} isLoading={preparing} />
                )}
              </TransactionDetails>
            ) : (
              <dl className="flex w-full flex-col gap-y-4 text-footnote">{operationRow}</dl>
            )}
          </Box>

          {!isDraftMode && <TransactionValidationError errors={errors} wallets={wallets} />}

          {/* `$noRouteSigner` is already false in draft mode. */}
          {noRouteSigner && (
            <Box padding={[2, 5]}>
              <Alert active variant="error" title={t('staking.flow.noSignerTitle')}>
                <Alert.Item withDot={false}>{t('staking.flow.noSignerHint')}</Alert.Item>
              </Alert>
            </Box>
          )}

          {/* The figure above is the snapshot; the live ledger has nothing left.
              Shown in draft mode too — the save is blocked the same way. */}
          {nothingLeftToRedeem && (
            <Box padding={[2, 5]}>
              <Alert active variant="error" title={t('staking.flow.nothingToRedeemTitle')}>
                <Alert.Item withDot={false}>{t('staking.flow.nothingToRedeemHint')}</Alert.Item>
              </Alert>
            </Box>
          )}

          <FootnoteText className="px-5 pt-3 text-text-tertiary">
            {isRedeem ? t('staking.confirmFlow.hint.redeem') : t('staking.confirmFlow.hint.changeValidators')}
          </FootnoteText>

          {!isDraftMode && (
            <div className="px-5 pb-4">
              <MultisigOperationDescriptionField />
            </div>
          )}
        </DraftFormBody>
      </ScrollArea>

      <Modal.Footer align="between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}
        {isDraftMode ? (
          <Button disabled={!canSaveAsDraft} onClick={() => confirmFlowModel.saveAsDraftRequested()}>
            {t('operations.drafts.initiateButton')}
          </Button>
        ) : (
          <div className="flex gap-4">
            {canUseBasket && (
              <Button pallet="secondary" onClick={() => confirmFlowModel.txSaved()}>
                {t('operation.addToBasket')}
              </Button>
            )}
            <SignButton
              isDefault={canUseBasket}
              type={signatoryWallet?.type}
              disabled={!canSign}
              isLoading={preparing}
              onClick={confirmModel.startSigning}
            />
          </div>
        )}
      </Modal.Footer>

      <SelectedValidatorsModal
        isOpen={isValidatorsOpen}
        validators={validators}
        identities={identities}
        chain={chain}
        onClose={() => setValidatorsOpen(false)}
      />
    </>
  );
};
