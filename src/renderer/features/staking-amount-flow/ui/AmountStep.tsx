import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { formatAsset } from '@/shared/lib/utils';
import { Alert, Button, FootnoteText } from '@/shared/ui';
import { ChainIcon, TransactionValidationError } from '@/shared/ui-entities';
import { Modal, ScrollArea } from '@/shared/ui-kit';
import { walletModel } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { DraftFormBody, DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { SigningPathSection } from '@/features/signing-path';
import { AssetFiatBalance } from '@/widgets/price';
import { projectUnlockAt } from '../lib/amount-rules';
import { amountFlowModel } from '../model/amount-flow';

/**
 * Frame F7 — the one screen both Unbond and Add stake use.
 *
 * Everything mode-dependent is a value, not a branch: the label above the
 * amount, what `Max` means, which callouts appear. The DOM is identical in both
 * modes, which is also what lets the modal switch between them without a
 * remount.
 */
export const AmountStep = () => {
  const { t } = useI18n();

  const mode = useUnit(amountFlowModel.$mode);
  const chain = useUnit(amountFlowModel.$chain);
  const asset = useUnit(amountFlowModel.$asset);
  const position = useUnit(amountFlowModel.$position);
  const isDraftMode = useUnit(amountFlowModel.$isDraftMode);
  const errors = useUnit(amountFlowModel.$errors);
  const wallets = useUnit(walletModel.$wallets);

  if (!mode || !chain || !asset) return null;

  return (
    <>
      <ScrollArea>
        <div className="flex flex-col gap-4 px-5 pb-4">
          {!isDraftMode && <SigningRoute />}
          <div className="flex flex-wrap items-center gap-2">
            {/* Who acts, once: the signing route above always names the
                initiator (alone when it signs directly), and in draft mode the
                draft path picker below the toggle takes over. */}
            <div className="flex items-center gap-x-1.5 rounded-lg border border-container-border px-2.5 py-1.5">
              <ChainIcon chain={chain} size={16} />
              <FootnoteText className="text-text-secondary">{chain.name}</FootnoteText>
            </div>
          </div>

          <DraftModeCard isOn={isDraftMode} onToggle={amountFlowModel.toggleDraftMode} />
          {isDraftMode && (
            /* The draft runs from the position the user opened, never from an
               account they happen to pick in the source list: the submission
               executes from the path's first node, and any other origin has no
               rights over this stash. */
            <DraftSigningPath
              chainId={chain.chainId}
              asset={asset}
              pinnedSourceAccountId={position?.accountId ?? null}
              $draftPath={amountFlowModel.$draftSigningPath}
              draftPathCommitted={amountFlowModel.draftPathCommitted}
              draftPathEditStarted={amountFlowModel.draftPathEditStarted}
              draftPathEditEnded={amountFlowModel.draftPathEditEnded}
              onLeaveFlow={amountFlowModel.flowClosed}
            />
          )}

          <DraftFormBody
            $isDraftMode={amountFlowModel.$isDraftMode}
            $isDraftPathComplete={amountFlowModel.$isDraftPathComplete}
          >
            <div className="flex flex-col gap-4">
              {!isDraftMode && <TransactionValidationError errors={errors} wallets={wallets} />}
              <NoSignerError />
              <AmountField />
              <OverMaxError />
              <UnlockingLimitError />
              <MinimumBondWarning />
              <ConsequenceCallout />
            </div>
          </DraftFormBody>
        </div>
      </ScrollArea>

      <Modal.Footer align="between">
        <Button variant="text" onClick={() => amountFlowModel.flowClosed()}>
          {t('staking.amountFlow.cancelButton')}
        </Button>
        <SubmitButton />
      </Modal.Footer>
    </>
  );
};

const AmountField = () => {
  const { t } = useI18n();

  const mode = useUnit(amountFlowModel.$mode);
  const asset = useUnit(amountFlowModel.$asset);
  const amount = useUnit(amountFlowModel.$amount);
  const amountPlanck = useUnit(amountFlowModel.$amountPlanck);
  const maxAmount = useUnit(amountFlowModel.$maxAmount);
  const remaining = useUnit(amountFlowModel.$remainingStake);
  const isOverMax = useUnit(amountFlowModel.$isOverMax);

  if (!mode || !asset) return null;

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={isOverMax}
        value={amount}
        balance={maxAmount}
        balancePlaceholder={
          mode === 'unbond' ? t('staking.amountFlow.stakedLabel') : t('staking.amountFlow.availableLabel')
        }
        placeholder={t('staking.amountFlow.amountLabel')}
        asset={asset}
        suffixElement={
          <Button size="sm" pallet="secondary" onClick={() => amountFlowModel.maxAmountRequested()}>
            {t('staking.amountFlow.maxButton')}
          </Button>
        }
        onChange={amountFlowModel.amountChanged}
      />

      {/* `≈ $6.24M · remaining staked: 100 DOT ($520)` */}
      <div className="flex flex-wrap items-center gap-x-1.5 text-footnote text-text-tertiary">
        <AssetFiatBalance asset={asset} amount={amountPlanck.toString()} />
        {mode === 'unbond' && (
          <>
            <span aria-hidden>·</span>
            <span>
              {t('staking.amountFlow.remainingStaked', { amount: formatAsset(remaining, asset) })}{' '}
              <AssetFiatBalance asset={asset} amount={remaining.toString()} className="inline" />
            </span>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * The words behind the field's red frame. What "too much" means depends on the
 * mode — an unbond is capped by the active stake, adding to it by the balance
 * that can actually leave the account — so the message names the figure instead
 * of leaving the user to guess which limit the frame is about.
 */
const OverMaxError = () => {
  const { t } = useI18n();

  const mode = useUnit(amountFlowModel.$mode);
  const asset = useUnit(amountFlowModel.$asset);
  const maxAmount = useUnit(amountFlowModel.$maxAmount);
  const isOverMax = useUnit(amountFlowModel.$isOverMax);

  if (!mode || !asset || !isOverMax) return null;

  const isUnbond = mode === 'unbond';

  return (
    <Alert
      active
      variant="error"
      title={t(isUnbond ? 'staking.amountFlow.overMaxUnbondTitle' : 'staking.amountFlow.overMaxAddStakeTitle')}
    >
      <FootnoteText className="text-text-secondary">
        {t(isUnbond ? 'staking.amountFlow.overMaxUnbondDescription' : 'staking.amountFlow.overMaxAddStakeDescription', {
          max: formatAsset(maxAmount, asset),
        })}
      </FootnoteText>
    </Alert>
  );
};

/**
 * Amber, and deliberately non-blocking: leaving a stub behind is legal, merely
 * suboptimal, and the user may well know exactly what they are doing.
 */
const MinimumBondWarning = () => {
  const { t } = useI18n();

  const isBelowMinimum = useUnit(amountFlowModel.$isBelowMinimumBond);
  const asset = useUnit(amountFlowModel.$asset);
  const remaining = useUnit(amountFlowModel.$remainingStake);
  const minimumBond = useUnit(amountFlowModel.$minimumBond);

  if (!isBelowMinimum || !asset) return null;

  return (
    <Alert active variant="warn" title={t('staking.amountFlow.belowMinimumTitle')}>
      <FootnoteText className="text-text-secondary">
        {t('staking.amountFlow.belowMinimumDescription', {
          remaining: formatAsset(remaining, asset),
          minimum: formatAsset(minimumBond, asset),
        })}
      </FootnoteText>
    </Alert>
  );
};

/**
 * No one on the signing route can sign — the position belongs to a contact or a
 * watch-only account. `$noRouteSigner` is already false in draft mode.
 */
const NoSignerError = () => {
  const { t } = useI18n();

  const noRouteSigner = useUnit(amountFlowModel.$noRouteSigner);

  if (!noRouteSigner) return null;

  return (
    <Alert active variant="error" title={t('staking.flow.noSignerTitle')}>
      <FootnoteText className="text-text-secondary">{t('staking.flow.noSignerHint')}</FootnoteText>
    </Alert>
  );
};

/** The ledger is full — the node would reject the unbond outright. */
const UnlockingLimitError = () => {
  const { t } = useI18n();

  const limitReached = useUnit(amountFlowModel.$unlockingLimitReached);
  const maxUnlockingChunks = useUnit(amountFlowModel.$maxUnlockingChunks);

  if (!limitReached) return null;

  return (
    <Alert active variant="error" title={t('staking.amountFlow.unlockingLimitTitle')}>
      <FootnoteText className="text-text-secondary">
        {t('staking.amountFlow.unlockingLimitDescription', { count: maxUnlockingChunks ?? 0 })}
      </FootnoteText>
    </Alert>
  );
};

/**
 * What happens after signing.
 *
 * For an unbond the era count is always known once the chain constant is read;
 * the date needs the era anchor on top, and when the chain cannot provide one
 * the line simply stops at the era count rather than inventing a day.
 */
const ConsequenceCallout = () => {
  const { t, formatDate } = useI18n();

  const mode = useUnit(amountFlowModel.$mode);
  const bondingDuration = useUnit(amountFlowModel.$bondingDuration);
  const eraAnchor = useUnit(amountFlowModel.$eraAnchor);

  if (mode === 'addStake') {
    return (
      <Alert active variant="info" title={t('staking.amountFlow.addStakeInfoTitle')}>
        <FootnoteText className="text-text-secondary">{t('staking.amountFlow.addStakeInfoDescription')}</FootnoteText>
      </Alert>
    );
  }

  if (!bondingDuration) return null;

  const unlockAt = projectUnlockAt({ eraAnchor, bondingDuration, nowMs: Date.now() });

  return (
    <Alert active variant="info" title={t('staking.amountFlow.unbondingInfoTitle')}>
      <FootnoteText className="text-text-secondary">
        {unlockAt === null
          ? t('staking.amountFlow.unbondingInfoDescription', { eras: bondingDuration })
          : t('staking.amountFlow.unbondingInfoDescriptionWithDate', {
              eras: bondingDuration,
              date: formatDate(new Date(unlockAt), 'MMM d'),
            })}
      </FootnoteText>
    </Alert>
  );
};

const SigningRoute = () => {
  const chain = useUnit(amountFlowModel.$chain);
  const initiator = useUnit(amountFlowModel.$initiator);
  const asset = useUnit(amountFlowModel.$asset);
  const signingPath = useUnit(amountFlowModel.$signingPath);
  const errors = useUnit(amountFlowModel.$errors);

  return (
    <SigningPathSection
      signingPath={signingPath}
      chain={chain}
      asset={asset}
      txErrors={errors}
      directInitiator={initiator}
      onChange={amountFlowModel.signingPathChanged}
    />
  );
};

/**
 * One button, one meaning at a time. In draft mode it creates a draft and the
 * flow ends there; otherwise it walks on to the confirm. Signing and draft
 * creation never share a confirmation.
 */
const SubmitButton = () => {
  const { t } = useI18n();

  const isDraftMode = useUnit(amountFlowModel.$isDraftMode);
  const canContinue = useUnit(amountFlowModel.$canContinue);
  const canSaveAsDraft = useUnit(amountFlowModel.$canSaveAsDraft);
  const preparing = useUnit(amountFlowModel.$preparing);

  if (isDraftMode) {
    return (
      <Button disabled={!canSaveAsDraft} onClick={() => amountFlowModel.saveAsDraftRequested()}>
        {t('operations.drafts.initiateButton')}
      </Button>
    );
  }

  return (
    <Button disabled={!canContinue} isLoading={preparing} onClick={() => amountFlowModel.continueRequested()}>
      {t('staking.amountFlow.continueButton')}
    </Button>
  );
};
