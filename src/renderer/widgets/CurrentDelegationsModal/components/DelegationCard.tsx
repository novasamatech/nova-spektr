import { type BN, BN_ZERO } from '@polkadot/util';
import { useMemo } from 'react';
import { Trans } from 'react-i18next';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Asset, type Conviction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, DetailRow, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { locksService } from '@/entities/governance';
import { DelegateName } from '@/features/governance';

type Props = {
  asset: Asset;
  delegate: DelegateAccount;
  votes?: {
    conviction: Conviction;
    balance: BN;
  }[];
  onClick: () => void;
};

export const DelegationCard = ({ asset, delegate, votes = [], onClick }: Props) => {
  const { t } = useI18n();

  const totalVotes = useMemo(() => {
    return votes.reduce((acc, { balance }) => acc.add(balance), BN_ZERO);
  }, [votes.length]);

  return (
    <button
      className={cnTw(
        'w-full rounded-sm border border-container-border bg-white transition-shadow',
        'shadow-shadow-1 hover:shadow-shadow-2 focus:shadow-shadow-2',
      )}
      onClick={onClick}
    >
      <Box direction="column" gap={4} padding={4}>
        <DelegateName delegate={delegate} titleClassName="max-w-[200px]" />
        <FootnoteText>{delegate.shortDescription}</FootnoteText>
      </Box>

      <div className="flex flex-col gap-4 border-t border-divider p-3">
        <DetailRow label={t('governance.addDelegation.card.lockedAmount')}>
          {votes.length > 1 && <AssetBalance value={totalVotes} asset={asset} />}

          {votes.length === 1 && votes[0] && (
            <BodyText>
              <Trans
                t={t}
                i18nKey="general.actions.duration"
                values={{ duration: locksService.getLockPeriodsMultiplier(votes[0].conviction) }}
                components={{
                  balance: <AssetBalance value={totalVotes} asset={asset} />,
                }}
              />
            </BodyText>
          )}
        </DetailRow>
      </div>
    </button>
  );
};
