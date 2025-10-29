import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { nonNullable } from '@/shared/lib/utils';
import { ButtonCard } from '@/shared/ui';
import { PeriodEndTimer } from '@/shared/ui-entities/PeriodEndTimer/PeriodEndTimer';
import { Box, FilledIconButton } from '@/shared/ui-kit';
import { type Evidence } from '@/domains/collectives';
import { basketUtils } from '@/entities/basket';
import { evidenceVoting } from '../model/evidenceVoting';
import { fellowshipEvidenceFeature } from '../model/feature';

import { EvidenceVotingModal } from './EvidenceVotingModal';

type Props = {
  evidence: Evidence;
  endBlock: number | null;
  variant: 'large' | 'small';
  disabled: boolean;
};

export const VotingActions = memo(({ evidence, endBlock, variant, disabled }: Props) => {
  const { t } = useI18n();
  const input = useUnit(fellowshipEvidenceFeature.input);
  const account = useUnit(evidenceVoting.$votingAccount);

  const canAddToBasket = nonNullable(account) && basketUtils.isBasketAvailableForAccount(account);

  const handleAyeClick = () => {
    if (disabled) return;

    if (canAddToBasket) {
      evidenceVoting.flow.open({ evidence, aye: true });
      evidenceVoting.saveToBasket();
      evidenceVoting.flow.close({ evidence: null, aye: false });
    }
  };

  const handleNayClick = () => {
    if (disabled) return;

    if (canAddToBasket) {
      evidenceVoting.flow.open({ evidence, aye: false });
      evidenceVoting.saveToBasket();
      evidenceVoting.flow.close({ evidence: null, aye: false });
    }
  };

  if (variant === 'large') {
    if (canAddToBasket) {
      return (
        <Box fillContainer gap={4}>
          <Box direction="row" gap={4} width="100%">
            <ButtonCard pallet="negative" icon="negative" fullWidth disabled={disabled} onClick={handleNayClick}>
              {t('fellowship.voting.notGood')}
            </ButtonCard>
            <ButtonCard pallet="positive" icon="positive" fullWidth disabled={disabled} onClick={handleAyeClick}>
              {t('fellowship.voting.good')}
            </ButtonCard>
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
      <FilledIconButton variant="negative" icon="negative" disabled={disabled} onClick={handleNayClick} />
      <FilledIconButton variant="positive" icon="positive" disabled={disabled} onClick={handleAyeClick} />
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

  if (variant === 'small' && nonNullable(input)) {
    return (
      <Box
        verticalAlign={nonNullable(endBlock) ? 'space-between' : 'flex-end'}
        horizontalAlign="flex-end"
        gap={2}
        height="92px"
        width="102px"
      >
        {nonNullable(endBlock) && <PeriodEndTimer api={input.api} endBlock={endBlock} shortDateFormat />}
        {buttonNodes}
      </Box>
    );
  }

  return null;
});
