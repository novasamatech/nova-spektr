import { useUnit } from 'effector-react';
import { Trans } from 'react-i18next';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { type AnyDecodedTransaction } from '@/domains/network';
import { voteTransactionService } from '@/entities/governance';
import { networkModel } from '@/entities/network';

type Props = {
  transaction: AnyDecodedTransaction;
  chainId: ChainId;
};

export const GovernanceVoteDetails = ({ transaction, chainId }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const chain = chains[chainId];
  const defaultAsset = chain?.assets[0];

  const result = [];

  const referendumId = transaction.args.referendum;
  const vote = transaction.args.vote;

  if (referendumId) {
    result.push(
      <DetailRow label={t('operation.details.referendum')} className="text-text-secondary">
        <FootnoteText className="text-text-secondary">#{referendumId.toString()}</FootnoteText>
      </DetailRow>,
    );
  }

  if (vote) {
    result.push(
      <DetailRow label={t('operation.details.votes')} className="text-text-secondary">
        <FootnoteText className="text-text-secondary">
          <>
            <span className="uppercase">
              {t(`governance.referendum.${voteTransactionService.getDecision(vote as never)}`)}
            </span>
            :{' '}
            <Trans
              t={t}
              i18nKey="governance.addDelegation.votesValue"
              components={{
                votes: (
                  <AssetBalance
                    value={voteTransactionService.getVotes(vote as never)}
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
