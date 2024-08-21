import { useForm } from 'effector-forms';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@app/providers';
import { type Asset, type Chain } from '@shared/core';
import { formatAsset } from '@shared/lib/utils';
import {
  Alert,
  ButtonCard,
  ConfirmModal,
  DetailRow,
  FootnoteText,
  LabelHelpBox,
  Popover,
  Shimmering,
  SmallTitleText,
} from '@shared/ui';
import { LockPeriodDiff, LockValueDiff } from '@entities/governance';
import { locksPeriodsAggregate } from '@features/governance';
import { voteModalAggregate } from '../aggregates/voteModal';

import { AboutVoting } from './AboutVoting';
import { AccountsSelector } from './formFields/AccountsSelector';
import { Amount } from './formFields/Amount';
import { ConvictionSelect } from './formFields/ConvictionSelect';
import { Signatories } from './formFields/Signatories';

type Props = {
  chain: Chain;
  asset: Asset;
  hasDelegated?: boolean;
};

export const VoteForm = ({ chain, asset, hasDelegated = false }: Props) => {
  const { t } = useI18n();

  const totalLock = useUnit(voteModalAggregate.$lock);

  const initialConviction = useUnit(voteModalAggregate.$initialConviction);
  const fee = useUnit(voteModalAggregate.$fee);

  const availableBalance = useUnit(voteModalAggregate.$availableBalance);
  const isMultisig = useUnit(voteModalAggregate.signatory.$isMultisig);
  const signatories = useUnit(voteModalAggregate.signatory.$available);
  const accounts = useUnit(voteModalAggregate.accounts.$available);
  const isFeeLoading = useUnit(voteModalAggregate.$isFeeLoading);

  const lockPeriods = useStoreMap({
    store: voteModalAggregate.$lockPeriods,
    keys: [chain.chainId],
    fn: (periods, [chainId]) => periods[chainId] ?? null,
  });

  useGate(locksPeriodsAggregate.gates.flow, { chain });

  const {
    submit,
    fields: { account, signatory, conviction, amount, decision },
  } = useForm(voteModalAggregate.form);

  const [showAbstainConfirm, setShowAbstainConfirm] = useState<boolean>(false);

  return (
    <>
      <div className="flex flex-col gap-6 px-5 py-4">
        <div className="flex">
          <Popover offsetPx={5} horizontal="right" panelClass="w-90" content={<AboutVoting />}>
            <LabelHelpBox>{t('governance.voting.aboutLabel')}</LabelHelpBox>
          </Popover>
        </div>
        <div className="flex flex-col gap-4">
          {accounts.length > 1 && (
            <AccountsSelector
              value={account.value}
              asset={asset}
              chain={chain}
              accounts={accounts}
              hasError={account.hasError()}
              errorText={t(account.errorText())}
              onChange={account.onChange}
            />
          )}
          {isMultisig && (
            <Signatories
              value={signatory.value}
              asset={asset}
              chain={chain}
              signatories={signatories}
              errorText={signatory.errorText()}
              hasError={signatory.hasError()}
              onChange={signatory.onChange}
            />
          )}
          <Amount
            value={amount.value}
            asset={asset}
            availableBalance={availableBalance}
            hasError={amount.hasError()}
            errorText={amount.errorText()}
            onChange={amount.onChange}
          />
          <ConvictionSelect
            value={conviction.value}
            asset={asset}
            amount={amount.value}
            onChange={conviction.onChange}
          />
        </div>
        <div className="flex flex-col gap-4">
          <DetailRow wrapperClassName="items-start" label={t('governance.vote.field.governanceLock')}>
            <LockValueDiff from={totalLock} to={amount.value} asset={asset} />
          </DetailRow>
          <DetailRow wrapperClassName="items-start" label={t('governance.vote.field.lockingPeriod')}>
            <LockPeriodDiff from={initialConviction} to={conviction.value} lockPeriods={lockPeriods} />
          </DetailRow>
          <DetailRow label={t('governance.vote.field.networkFee')}>
            {isFeeLoading && fee.isZero() ? (
              <Shimmering height={18} width={50} />
            ) : (
              <FootnoteText>{formatAsset(fee, asset)}</FootnoteText>
            )}
          </DetailRow>
        </div>
        <Alert active={hasDelegated} title="Already delegating votes" variant="error">
          {t('governance.vote.delegationError')}
        </Alert>
        <div className="flex shrink-0 gap-4">
          <ButtonCard
            className="grow basis-0"
            icon="thumbDown"
            pallet="negative"
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
            onClick={() => setShowAbstainConfirm(true)}
          >
            {t('governance.referendum.abstain')}
          </ButtonCard>
          <ButtonCard
            className="grow basis-0"
            icon="thumbUp"
            pallet="positive"
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
          panelClass="w-60"
          cancelText={t('general.button.cancelButton')}
          confirmText={t('general.button.continueButton')}
          onClose={() => setShowAbstainConfirm(false)}
          onConfirm={() => {
            setShowAbstainConfirm(false);
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
              {t('governance.vote.abstainConvictionWarningDescription')}
            </FootnoteText>
          </div>
        </ConfirmModal>
      )}
    </>
  );
};
