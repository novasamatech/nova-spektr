import { BN_ZERO } from '@polkadot/util';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { Trans } from 'react-i18next';

import { type Asset, type Chain } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { formatAsset } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
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
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { LockPeriodDiff, LockValueDiff, votingService } from '@/entities/governance';
import { walletModel } from '@/entities/wallet';
import { locksPeriodsAggregate } from '@/features/governance';
import { SigningPathInline } from '@/features/signing-path';
import { voteForm } from '../model/voteForm';
import { voteModal } from '../model/voteModal';

import { AboutVoting } from './AboutVoting';
import { AccountsSelector } from './formFields/AccountsSelector';
import { Amount } from './formFields/Amount';
import { ConvictionSelect } from './formFields/ConvictionSelect';
import { Signatories } from './formFields/Signatories';

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
  const signatories = useUnit(voteForm.$signatories);
  const initiators = useUnit(voteForm.$initiators);
  const signingPath = useUnit(voteForm.$signingPath);
  const isFeeLoading = useUnit(voteForm.$pendingFee);
  const hasDelegatedTrack = useUnit(voteForm.$hasDelegatedTrack);
  const balances = useUnit(balanceModel.$balanceMap);
  const allWallets = useUnit(walletModel.$wallets);
  const allAccounts = useUnit(accounts.$list);

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
        <TransactionValidationError errors={errors} wallets={wallets} />
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
          {initiators.length > 1 && (
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
          {signingPath.length >= 2 ? (
            <SigningPathInline
              chainId={chain.chainId}
              path={signingPath}
              asset={asset}
              getBalance={(accountId: AccountId) => {
                const balance = balanceUtils.getBalance(balances, accountId, chain.chainId, asset.assetId);
                return balance ? balance.free : null;
              }}
              errorText={t(signatory.errorMessage)}
              onChange={voteForm.signingPathChanged}
            />
          ) : (
            signatories.length > 1 && (
              <Signatories
                initiator={initiator.value}
                allAccounts={allAccounts}
                allWallets={allWallets}
                value={signatory.value}
                asset={asset}
                chain={chain}
                balances={balances}
                signatories={signatories}
                errorText={signatory.errorMessage}
                hasError={signatory.hasError}
                onChange={signatory.onChange}
              />
            )
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
        <Alert active={hasDelegatedTrack} title={t('governance.vote.delegationErrorTitle')} variant="error">
          <FootnoteText className="text-text-secondary">{t('governance.vote.delegationError')}</FootnoteText>
        </Alert>
        <div className="flex shrink-0 gap-4">
          <ButtonCard
            className="grow basis-0"
            icon="thumbDown"
            pallet="negative"
            disabled={hasDelegatedTrack}
            onClick={() => {
              decision.onChange('nay');
              submit();
            }}
          >
            {t('governance.referendum.nay')}
          </ButtonCard>
          <ButtonCard
            className="grow basis-0"
            icon="minusCircle"
            pallet="secondary"
            disabled={hasDelegatedTrack}
            onClick={toggleAbstainConfirm}
          >
            {t('governance.referendum.abstain')}
          </ButtonCard>
          <ButtonCard
            className="grow basis-0"
            icon="thumbUp"
            pallet="positive"
            disabled={hasDelegatedTrack}
            onClick={() => {
              decision.onChange('aye');
              submit();
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
            submit();
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
