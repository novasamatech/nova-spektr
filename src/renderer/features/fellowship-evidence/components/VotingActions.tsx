import { memo, useCallback } from 'react';

import { type Transaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { ButtonCard } from '@/shared/ui';
import { VotingButtonWithTooltip } from '@/shared/ui-entities';
import { PeriodEndTimer } from '@/shared/ui-entities/PeriodEndTimer/PeriodEndTimer';
import { Box, FilledIconButton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { useFellowshipAccount, useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';
import { evidenceVoting } from '../model/evidenceVoting';

import { EvidenceVotingModal } from './EvidenceVotingModal';

type Props = {
  evidence: Evidence;
  endBlock: number | null;
  variant: 'large' | 'small';
  disabled: boolean;
  transaction?: Transaction | null;
  onClose?: () => void;
};

export const VotingActions = memo(({ evidence, endBlock, transaction, variant, disabled, onClose }: Props) => {
  const { t } = useI18n();

  const { data: fellowshipMember } = useFellowshipMember();

  const isCurrentUser =
    nonNullable(fellowshipMember) && nonNullable(evidence) && fellowshipMember.accountId === evidence.accountId;

  const api = useFellowshipApi();

  const { data: account } = useFellowshipAccount();

  const canAddToBasket = nonNullable(account) && basketUtils.isBasketAvailableForAccount(account);

  const handleVote = useCallback(
    (vote: 'aye' | 'nay') => {
      if (disabled) return;

      if (canAddToBasket) {
        evidenceVoting.saveToBasket({ evidence, aye: vote === 'aye' });
        onClose?.();
      }
    },
    [disabled, canAddToBasket, evidence, transaction, onClose],
  );

  const handleAyeClick = () => handleVote('aye');
  const handleNayClick = () => handleVote('nay');

  if (isCurrentUser) return null;

  if (variant === 'large') {
    if (canAddToBasket) {
      return (
        <Box fillContainer gap={4}>
          <Box direction="row" gap={4} width="100%">
            <VotingButtonWithTooltip
              variant="negative"
              icon="negative"
              disabled={disabled}
              checked={nonNullable(transaction) && !transaction.args.aye}
              fullWidth
              onClick={handleNayClick}
            >
              {t('fellowship.voting.notGood')}
            </VotingButtonWithTooltip>

            <VotingButtonWithTooltip
              variant="positive"
              icon="positive"
              disabled={disabled}
              checked={nonNullable(transaction) && transaction.args.aye}
              fullWidth
              onClick={handleAyeClick}
            >
              {t('fellowship.voting.good')}
            </VotingButtonWithTooltip>
          </Box>
        </Box>
      );
    }

    return (
      <Box fillContainer gap={4}>
        <Box direction="row" gap={4} width="100%">
          <EvidenceVotingModal evidence={evidence} aye={false}>
            <ButtonCard pallet="negative" icon="negative" fullWidth disabled={disabled}>
              {t('fellowship.voting.notGood')}
            </ButtonCard>
          </EvidenceVotingModal>
          <EvidenceVotingModal evidence={evidence} aye={true}>
            <ButtonCard pallet="positive" icon="positive" fullWidth disabled={disabled}>
              {t('fellowship.voting.good')}
            </ButtonCard>
          </EvidenceVotingModal>
        </Box>
      </Box>
    );
  }

  const buttonNodes = canAddToBasket ? (
    <Box direction="row" gap={1}>
      <FilledIconButton
        variant="negative"
        icon="negative"
        checked={nonNullable(transaction) && !transaction.args.aye}
        marked={nonNullable(transaction) && !transaction.args.aye}
        disabled={disabled}
        onClick={handleNayClick}
      />
      <FilledIconButton
        variant="positive"
        icon="positive"
        checked={nonNullable(transaction) && transaction.args.aye}
        marked={nonNullable(transaction) && transaction.args.aye}
        disabled={disabled}
        onClick={handleAyeClick}
      />
    </Box>
  ) : (
    <Box direction="row" gap={1}>
      <EvidenceVotingModal evidence={evidence} aye={false}>
        <FilledIconButton variant="negative" icon="negative" disabled={disabled} />
      </EvidenceVotingModal>
      <EvidenceVotingModal evidence={evidence} aye={true}>
        <FilledIconButton variant="positive" icon="positive" disabled={disabled} />
      </EvidenceVotingModal>
    </Box>
  );

  if (variant === 'small' && nonNullable(api)) {
    return (
      <Box
        verticalAlign={nonNullable(endBlock) ? 'space-between' : 'flex-end'}
        horizontalAlign="flex-end"
        gap={2}
        height="92px"
        width="102px"
      >
        {nonNullable(endBlock) && <PeriodEndTimer api={api} endBlock={endBlock} shortDateFormat />}
        {buttonNodes}
      </Box>
    );
  }

  return null;
});
