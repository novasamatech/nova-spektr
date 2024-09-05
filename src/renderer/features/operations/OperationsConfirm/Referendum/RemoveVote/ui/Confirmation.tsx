import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { useI18n } from '@/app/providers';
import { formatAsset, formatBalance, toAddress, toNumberWithPrecision } from '@/shared/lib/utils';
import { DetailRow, HeadlineText, Icon } from '@/shared/ui';
import { LockPeriodDiff, LockValueDiff, voteTransactionService, votingService } from '@/entities/governance';
import { SignButton } from '@/entities/operations';
import { Fee } from '@/entities/transaction';
import { lockPeriodsModel, locksPeriodsAggregate } from '@/features/governance';
import { locksAggregate } from '@/features/governance/aggregates/locks';
import { getLocksForAddress } from '@/features/governance/utils/getLocksForAddress';
import { ConfirmDetails } from '../../../common/ConfirmDetails';
import { confirmModel } from '../model/confirm-model';

type Props = {
  id?: number;
  secondaryActionButton?: ReactNode;
  hideSignButton?: boolean;
  onGoBack?: () => void;
};

export const Confirmation = ({ id = 0, secondaryActionButton, hideSignButton }: Props) => {
  const { t } = useI18n();

  const trackLocks = useUnit(locksAggregate.$trackLocks);

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
  useGate(locksAggregate.gates.flow, { chain: confirm?.meta.chain });

  console.log({ confirm });

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

  const address = toAddress(confirm.meta.account.accountId, { prefix: confirm.meta.chain.addressPrefix });
  const locksForAddress = getLocksForAddress(address, trackLocks);

  return (
    <div className="flex flex-col items-center gap-4 px-5 py-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="retractMst" size={60} />

        <div className="flex flex-col items-center gap-y-1">
          <span className="font-manrope text-[32px] font-bold leading-[36px] text-text-primary">
            {t('governance.referendum.votes', {
              votes: '-' + formatBalance(votingPower, asset.precision).formatted,
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
          <LockValueDiff from={locksForAddress} to={amount} asset={asset} />
        </DetailRow>
        <DetailRow label={t('governance.vote.field.lockingPeriod')} wrapperClassName="items-start">
          <LockPeriodDiff from={conviction} to="None" lockPeriods={lockPeriods} />
        </DetailRow>
        <hr className="w-full border-filter-border pr-2" />
        <DetailRow label={t('governance.vote.field.networkFee')}>
          <Fee api={api} asset={asset} transaction={wrappedTransactions.wrappedTx} />
        </DetailRow>
      </ConfirmDetails>

      <div className="mt-3 flex w-full justify-end">
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
