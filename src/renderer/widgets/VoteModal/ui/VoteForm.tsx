import { BN_ZERO } from '@polkadot/util';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { Trans } from 'react-i18next';

import { type Asset, type Chain } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { formatAsset } from '@/shared/lib/utils';
import {
  Alert,
  Button,
  ButtonCard,
  ConfirmModal,
  DetailRow,
  FootnoteText,
  LabelHelpBox,
  SmallTitleText,
} from '@/shared/ui';
import { AssetBalance, TransactionValidationError } from '@/shared/ui-entities';
import { Popover, Skeleton } from '@/shared/ui-kit';
import { balanceModel } from '@/entities/balance';
import { LockPeriodDiff, LockValueDiff, votingService } from '@/entities/governance';
import { walletModel } from '@/entities/wallet';
import { DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { locksPeriodsAggregate } from '@/features/governance';
import { SigningPathSection } from '@/features/signing-path';
import { voteForm } from '../model/voteForm';
import { voteModal } from '../model/voteModal';

import { AboutVoting } from './AboutVoting';
import { AccountsSelector } from './formFields/AccountsSelector';
import { Amount } from './formFields/Amount';
import { ConvictionSelect } from './formFields/ConvictionSelect';

type Props = {
  chain: Chain;
  asset: Asset;
};

export const VoteForm = ({ chain, asset }: Props) => {
  const { t } = useI18n();

  const lock = useUnit(voteModal.$lock);

  const existingVote = useUnit(voteModal.$existingVote);
  const fee = useUnit(voteForm.$fee);
  const errors = useUnit(voteForm.$errors);
  const wallets = useUnit(walletModel.$wallets);

  const availableBalance = useUnit(voteForm.$availableBalance);
  const initiators = useUnit(voteForm.$initiators);
  const signingPath = useUnit(voteForm.$signingPath);
  const isFeeLoading = useUnit(voteForm.$pendingFee);
  const hasDelegatedTrack = useUnit(voteForm.$hasDelegatedTrack);
  const balances = useUnit(balanceModel.$balanceMap);
  const isDraftMode = useUnit(voteForm.$isDraftMode);
  const isReadyForDecision = useUnit(voteForm.$isReadyForDecision);

  const lockPeriods = useStoreMap({
    store: voteModal.$lockPeriods,
    keys: [chain.chainId],
    fn: (periods, [chainId]) => periods[chainId] ?? null,
  });

  useGate(locksPeriodsAggregate.gates.flow, { chain });

  const {
    submit,
    fields: { initiator, signatory, conviction, amount, decision },
  } = useForm(voteForm.form);

  const [showAbstainConfirm, toggleAbstainConfirm] = useToggle();

  const initialConviction = existingVote ? votingService.getAccountVoteConviction(existingVote) : 'None';

  const abstainVotingPower = (
    <AssetBalance
      className="text-footnote text-text-tertiary"
      asset={asset}
      value={votingService.calculateVotingPower(amount.value || BN_ZERO, 'None')}
    />
  );

  const showReuseLockBtn = lock.gtn(0);

  return (
    <>
      <div className="flex flex-col gap-6 px-5 py-4">
        <DraftModeCard isOn={isDraftMode} onToggle={voteForm.events.toggleDraftMode} />
        {!isDraftMode && <TransactionValidationError errors={errors} wallets={wallets} />}
        <div className="flex">
          <Popover align="start">
            <Popover.Trigger>
              <div>
                <LabelHelpBox>{t('governance.voting.aboutLabel')}</LabelHelpBox>
              </div>
            </Popover.Trigger>
            <Popover.Content>
              <div className="w-90">
                <AboutVoting />
              </div>
            </Popover.Content>
          </Popover>
        </div>
        <div className="flex flex-col gap-4">
          {!isDraftMode && initiators.length > 1 && (
            <AccountsSelector
              value={initiator.value}
              asset={asset}
              chain={chain}
              accounts={initiators}
              balances={balances}
              hasError={initiator.hasError}
              errorText={t(initiator.errorMessage)}
              onChange={initiator.onChange}
            />
          )}
          {isDraftMode ? (
            <DraftSigningPath
              chainId={chain.chainId}
              asset={asset}
              $draftPath={voteForm.$draftSigningPath}
              draftPathCommitted={voteForm.events.draftPathCommitted}
              draftPathEditStarted={voteForm.events.draftPathEditStarted}
              draftPathEditEnded={voteForm.events.draftPathEditEnded}
            />
          ) : (
            <SigningPathSection
              signingPath={signingPath}
              chain={chain}
              asset={asset}
              txErrors={errors}
              errorText={t(signatory.errorMessage)}
              balanceExtractor={(b) => (b ? b.free : null)}
              onChange={voteForm.signingPathChanged}
            />
          )}

          <div className="flex flex-col gap-2">
            <Amount
              value={amount.value}
              asset={asset}
              availableBalance={availableBalance}
              hasError={amount.hasError}
              errorText={amount.errorMessage}
              onChange={amount.onChange}
            />
            {showReuseLockBtn && (
              <div className="flex justify-end">
                <Button size="sm" pallet="secondary" onClick={() => amount.onChange(lock)}>
                  {t('governance.vote.reuseLock')}: {formatAsset(lock, asset)}
                </Button>
              </div>
            )}
          </div>
          <ConvictionSelect
            asset={asset}
            conviction={conviction.value}
            amount={amount.value || BN_ZERO}
            onChange={conviction.onChange}
          />
        </div>
        {!isDraftMode && (
          <div className="flex flex-col gap-4">
            <DetailRow wrapperClassName="items-start" label={t('governance.vote.field.governanceLock')}>
              <LockValueDiff from={lock} to={amount.value || BN_ZERO} asset={asset} />
            </DetailRow>
            <DetailRow wrapperClassName="items-start" label={t('governance.vote.field.lockingPeriod')}>
              <LockPeriodDiff from={initialConviction} to={conviction.value} lockPeriods={lockPeriods} />
            </DetailRow>
            <DetailRow label={t('governance.vote.field.networkFee')}>
              {isFeeLoading || !fee ? (
                <Skeleton height={4.5} width={12.5} />
              ) : (
                <FootnoteText>{formatAsset(fee, asset)}</FootnoteText>
              )}
            </DetailRow>
          </div>
        )}
        {!isDraftMode && (
          <Alert active={hasDelegatedTrack} title={t('governance.vote.delegationErrorTitle')} variant="error">
            <FootnoteText className="text-text-secondary">{t('governance.vote.delegationError')}</FootnoteText>
          </Alert>
        )}
        <div className="flex shrink-0 gap-4">
          <ButtonCard
            className="grow basis-0"
            icon="thumbDown"
            pallet="negative"
            disabled={isDraftMode ? !isReadyForDecision : hasDelegatedTrack}
            onClick={() => {
              decision.onChange('nay');
              if (isDraftMode) {
                voteForm.events.saveAsDraftRequested();
              } else {
                submit();
              }
            }}
          >
            {t('governance.referendum.nay')}
          </ButtonCard>
          <ButtonCard
            className="grow basis-0"
            icon="minusCircle"
            pallet="secondary"
            disabled={isDraftMode ? !isReadyForDecision : hasDelegatedTrack}
            onClick={toggleAbstainConfirm}
          >
            {t('governance.referendum.abstain')}
          </ButtonCard>
          <ButtonCard
            className="grow basis-0"
            icon="thumbUp"
            pallet="positive"
            disabled={isDraftMode ? !isReadyForDecision : hasDelegatedTrack}
            onClick={() => {
              decision.onChange('aye');
              if (isDraftMode) {
                voteForm.events.saveAsDraftRequested();
              } else {
                submit();
              }
            }}
          >
            {t('governance.referendum.aye')}
          </ButtonCard>
        </div>
      </div>

      {showAbstainConfirm && (
        <ConfirmModal
          isOpen
          panelClass="w-[260px]"
          cancelText={t('general.button.cancelButton')}
          confirmText={t('general.button.continueButton')}
          onClose={toggleAbstainConfirm}
          onConfirm={() => {
            toggleAbstainConfirm();
            conviction.onChange('None');
            decision.onChange('abstain');
            if (isDraftMode) {
              voteForm.events.saveAsDraftRequested();
            } else {
              submit();
            }
          }}
        >
          <div className="flex flex-col gap-2">
            <SmallTitleText className="text-center">
              {t('governance.vote.abstainConvictionWarningTitle')}
            </SmallTitleText>
            <FootnoteText className="text-center text-text-tertiary">
              <Trans
                t={t}
                i18nKey="governance.vote.abstainConvictionWarningDescription"
                components={{ amount: abstainVotingPower }}
              />
            </FootnoteText>
          </div>
        </ConfirmModal>
      )}
    </>
  );
};
