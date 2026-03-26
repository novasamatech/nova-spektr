import { useGate, useStoreMap, useUnit } from 'effector-react';
import { type ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { DetailRow, HeadlineText, Icon, LargeTitleText, Loader } from '@/shared/ui';
import { AssetBalance, TransactionDetails } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import {
  LockPeriodDiff,
  LockValueDiff,
  TracksDetails,
  voteTransactionService,
  votingService,
} from '@/entities/governance';
import { SignButton } from '@/entities/operations';
import { walletModel } from '@/entities/wallet';
import { getLocksForAccount, lockPeriodsModel, locksPeriodsAggregate } from '@/features/governance';
import { locksAggregate } from '@/features/governance/aggregates/locks';
import { FeeWithDataLoading } from '@/widgets/transaction-fee';
import { MultisigExistsAlert } from '../../../common/MultisigExistsAlert';
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
  const wallets = useUnit(walletModel.$wallets);

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

  const isMultisigExists = useUnit(confirmModel.$isMultisigExists);

  useGate(locksPeriodsAggregate.gates.flow, { chain: confirm?.meta.chain });
  useGate(locksAggregate.gates.flow, { chain: confirm?.meta.chain });

  if (!confirm) {
    return null;
  }

  const { asset, tx, coreTx, api, initiator, votes } = confirm.meta;
  const vote = votes.at(0)?.vote;
  const tracks = votes.map(({ track }) => Number(track));

  if (!voteTransactionService.isRemoveVoteTransaction(coreTx)) {
    return (
      <Box width="440px" height="440px" verticalAlign="center" horizontalAlign="center">
        <Loader color="primary" />
      </Box>
    );
  }

  const amount = vote && votingService.calculateAccountVoteAmount(vote);
  const conviction = vote && votingService.getAccountVoteConviction(vote);
  const votingPower = vote && votingService.calculateAccountVotePower(vote);

  const locksForAddress = getLocksForAccount(initiator.accountId, trackLocks);

  return (
    <div className="flex w-modal flex-col items-center gap-4 px-5 py-4">
      <div className="mb-2 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name="retractMst" size={60} />

        {votingPower && amount && conviction && (
          <Box direction="column" horizontalAlign="center" gap={1}>
            <LargeTitleText as="p" className="font-manrope">
              {'-'}
              <Trans
                t={t}
                i18nKey="general.actions.multiply"
                values={{ multiplier: votingService.getConvictionMultiplier(conviction) }}
                components={{ balance: <AssetBalance className="text-large-title" value={amount} asset={asset} /> }}
              />
            </LargeTitleText>

            <HeadlineText className="text-text-tertiary">
              <AssetBalance className="text-headline text-text-tertiary" value={votingPower} asset={asset} />
            </HeadlineText>
          </Box>
        )}
      </div>

      <MultisigExistsAlert active={isMultisigExists} />

      <TransactionDetails
        chain={confirm.meta.chain}
        wallets={wallets}
        initiators={[confirm.meta.initiator]}
        signatory={confirm.meta.signatory}
      >
        {votingPower && amount && conviction ? (
          <>
            <DetailRow label={t('governance.vote.field.governanceLock')} wrapperClassName="items-start">
              <LockValueDiff from={locksForAddress} to={amount} asset={asset} />
            </DetailRow>
            <DetailRow label={t('governance.vote.field.lockingPeriod')} wrapperClassName="items-start">
              <LockPeriodDiff unlock from={conviction} to="None" lockPeriods={lockPeriods} />
            </DetailRow>
          </>
        ) : (
          tracks && (
            <DetailRow label={t('governance.vote.field.tracks')} wrapperClassName="items-start">
              <TracksDetails tracks={tracks} />
            </DetailRow>
          )
        )}
        <hr className="w-full border-filter-border pr-2" />
        <DetailRow label={t('governance.vote.field.networkFee')}>
          <FeeWithDataLoading api={api} asset={asset} transaction={tx} />
        </DetailRow>
      </TransactionDetails>

      <div className="mt-3 flex w-full justify-end">
        <div className="flex gap-4">
          {secondaryActionButton}

          {!hideSignButton && !isMultisigExists && (
            <SignButton
              isDefault={Boolean(secondaryActionButton)}
              type={confirm.wallets.signatory.type}
              onClick={confirmModel.startSigning}
            />
          )}
        </div>
      </div>
    </div>
  );
};
