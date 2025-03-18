import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { type Address, type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { Account, AssetBalance } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { type AnyDecodedTransaction } from '@/domains/network';
import { TracksDetails } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { isUndelegateTransaction } from '@/entities/transaction';

type Props = {
  transaction: AnyDecodedTransaction;
  chainId: ChainId;
};

export const GovernanceDelegateDetails = ({ transaction, chainId }: Props) => {
  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);

  const chain = chains[chainId];
  const api = apis[chainId];

  const defaultAsset = chain?.assets[0];

  const [isUndelegationLoading, setIsUndelegationLoading] = useState(false);
  const [undelegationVotes, setUndelegationVotes] = useState<string>();
  const [undelegationTarget, setUndelegationTarget] = useState<Address>();

  const result = [];

  useEffect(() => {
    if (isUndelegateTransaction(transaction)) {
      setIsUndelegationLoading(true);
    }

    if (!api) return;

    operationDetailsUtils.getUndelegationData(api, transaction).then(({ votes, target }) => {
      setUndelegationVotes(votes);
      setUndelegationTarget(target);
      setIsUndelegationLoading(false);
    });
  }, [api, transaction]);

  // TODO: Move this to domain layer
  const delegationTarget = operationDetailsUtils.getDelegationTarget(transaction);
  const delegationTracks = operationDetailsUtils.getDelegationTracks(transaction);
  const delegationVotes = operationDetailsUtils.getDelegationVotes(transaction);

  if (isUndelegationLoading) {
    result.push(
      <>
        <DetailRow label={t('operation.details.delegationTarget')}>
          <Skeleton width={40} height={6} />
        </DetailRow>

        <DetailRow label={t('operation.details.delegationVotes')}>
          <Skeleton width={20} height={5} />
        </DetailRow>
      </>,
    );
  }

  if (delegationTarget) {
    result.push(
      <DetailRow label={t('operation.details.delegationTarget')} className="text-text-secondary">
        <Account accountId={toAccountId(delegationTarget)} variant="short" chain={chain} />
      </DetailRow>,
    );
  }

  if (!delegationTarget && undelegationTarget) {
    result.push(
      <DetailRow label={t('operation.details.delegationTarget')} className="text-text-secondary">
        <Account accountId={toAccountId(undelegationTarget)} variant="short" chain={chain} />
      </DetailRow>,
    );
  }

  if (delegationVotes) {
    result.push(
      <DetailRow label={t('operation.details.delegationVotes')} className="text-text-secondary">
        <FootnoteText>
          <AssetBalance
            className="text-text-secondary"
            value={delegationVotes}
            asset={defaultAsset}
            showSymbol={false}
          />
        </FootnoteText>
      </DetailRow>,
    );
  }

  if (!delegationVotes && undelegationVotes) {
    result.push(
      <DetailRow label={t('operation.details.delegationVotes')} className="text-text-secondary">
        <FootnoteText>
          <AssetBalance
            className="text-text-secondary"
            value={undelegationVotes}
            asset={defaultAsset}
            showSymbol={false}
          />
        </FootnoteText>
      </DetailRow>,
    );
  }

  if (delegationTracks) {
    result.push(
      <DetailRow label={t('operation.details.delegationTracks')} className="text-text-secondary">
        <div className="-mr-2">
          <TracksDetails tracks={delegationTracks.map(Number)} />
        </div>
      </DetailRow>,
    );
  }

  return <>{result.map((e) => e)}</>;
};
