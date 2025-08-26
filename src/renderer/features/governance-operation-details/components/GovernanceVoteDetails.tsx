import { useUnit } from 'effector-react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { type MultisigOperation } from '@/domains/network';
import { voteTransactionService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';

type Props = { operation: MultisigOperation };

export const GovernanceVoteDetails = ({ operation }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const chain = chains[operation.chainId];
  const defaultAsset = chain?.assets[0];

  const result = [];

  const referendumId = operationDetailsUtils.getReferendumId(operation);
  const vote = operationDetailsUtils.getVote(operation);

  if (referendumId) {
    result.push(
      <DetailRow label={t('operation.details.referendum')} className="text-text-secondary">
        <FootnoteText className="text-text-secondary">#{referendumId}</FootnoteText>
      </DetailRow>,
    );
  }

  if (vote) {
    result.push(
      <DetailRow label={t('operation.details.votes')} className="text-text-secondary">
        <FootnoteText className="text-text-secondary">
          <>
            <span className="uppercase">{t(`governance.referendum.${voteTransactionService.getDecision(vote)}`)}</span>:{' '}
            <Trans
              t={t}
              i18nKey="governance.addDelegation.votesValue"
              components={{
                votes: (
                  <AssetBalance
                    value={voteTransactionService.getVotes(vote)}
                    asset={defaultAsset}
                    showSymbol={false}
                    className="text-text-secondary"
                  />
                ),
              }}
            />
          </>
        </FootnoteText>
      </DetailRow>,
    );
  }

  return <>{result.map((e) => e)}</>;
};
