import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/app/providers';
import { formatAsset, formatBalance, toNumberWithPrecision } from '@/shared/lib/utils';
import { Button, DetailRow, HeadlineText, Icon } from '@/shared/ui';
import { LockPeriodDiff, LockValueDiff, voteTransactionService, votingService } from '@/entities/governance';
import { SignButton } from '@/entities/operations';
import { Fee } from '@/entities/transaction';
import { lockPeriodsModel, locksModel, locksPeriodsAggregate } from '@/features/governance';
import { ConfirmDetails } from '../../../common/ConfirmDetails';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id = 0, secondaryActionButton, hideSignButton, onGoBack }: Props) => {
  const { t } = useI18n();

  const totalLock = useUnit(locksModel.$totalLock);

  const confirm = useStoreMap({
    store: confirmModel.$confirmMap,
    keys: [id],
    fn: (value, [id]) => value?.[id] ?? null,
  });

  const lockPeriods = useStoreMap({
    store: lockPeriodsModel.$lockPeriods,
    keys: [confirm?.meta.chain],
    fn: (locks, [chain]) => (chain ? (locks[chain.chainId] ?? null) : null),
  });

  useGate(locksPeriodsAggregate.gates.flow, { chain: confirm?.meta.chain });

  if (!confirm) {
    return null;
  }

  const { asset, wrappedTransactions, api, vote } = confirm.meta;

  if (!voteTransactionService.isRemoveVoteTransaction(wrappedTransactions.coreTx)) {
    return null;
  }

  const amount = votingService.calculateAccountVoteAmount(vote);
  const conviction = votingService.getAccountVoteConviction(vote);
  const votingPower = votingService.calculateAccountVotePower(vote);

  console.log({
    vote,
    amount: amount.toString(),
    totalLock: totalLock.toString(),
    lock: totalLock.sub(amount).toString(),
  });

  return (
    <div className="flex flex-col items-center gap-4 px-5 py-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="retractMst" size={60} />

        <div className="flex flex-col items-center gap-y-1">
          <span className="font-manrope text-[32px] font-bold leading-[36px] text-text-primary">
            {t('governance.referendum.votes', {
              votes: formatBalance(votingPower.neg(), asset.precision).formatted,
              count: toNumberWithPrecision(votingPower, asset.precision),
            })}
          </span>
          <HeadlineText className="text-text-tertiary">
            {t('general.actions.multiply', {
              value: formatAsset(amount, asset),
              multiplier: `${votingService.getConvictionMultiplier(conviction)}x`,
            })}
          </HeadlineText>
        </div>
      </div>

      <ConfirmDetails confirm={confirm}>
        <hr className="w-full border-filter-border pr-2" />
        <DetailRow label={t('governance.vote.field.governanceLock')} wrapperClassName="items-start">
          <LockValueDiff from={totalLock} to={totalLock.sub(amount)} asset={asset} />
        </DetailRow>
        <DetailRow label={t('governance.vote.field.lockingPeriod')} wrapperClassName="items-start">
          <LockPeriodDiff from={conviction} to="None" lockPeriods={lockPeriods} />
        </DetailRow>
        <hr className="w-full border-filter-border pr-2" />
        <DetailRow label={t('governance.vote.field.networkFee')}>
          <Fee api={api} asset={asset} transaction={wrappedTransactions.wrappedTx} />
        </DetailRow>
      </ConfirmDetails>

      <div className="mt-3 flex w-full justify-between">
        {onGoBack && (
          <Button variant="text" onClick={onGoBack}>
            {t('operation.goBackButton')}
          </Button>
        )}

        <div className="flex gap-4">
          {secondaryActionButton}

          {!hideSignButton && (
            <SignButton
              isDefault={Boolean(secondaryActionButton)}
              type={(confirm.wallets.signer || confirm.wallets.initiator)?.type}
              onClick={() => {
                confirmModel.events.sign();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
