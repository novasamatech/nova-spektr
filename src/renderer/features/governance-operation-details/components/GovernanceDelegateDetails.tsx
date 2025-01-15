import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { type Address, type MultisigTransaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { TracksDetails } from '@/entities/governance';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { isUndelegateTransaction } from '@/entities/transaction';

type Props = { operation: MultisigTransaction };

export const GovernanceDelegateDetails = ({ operation }: Props) => {
  const { t } = useI18n();
  const transaction = getTransactionFromMultisigTx(operation);

  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);

  const chain = chains[operation.chainId];
  const api = apis[operation.chainId];

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

    operationDetailsUtils.getUndelegationData(api, operation).then(({ votes, target }) => {
      setUndelegationVotes(votes);
      setUndelegationTarget(target);
      setIsUndelegationLoading(false);
    });
  }, [api, operation]);

  if (
    transaction?.type &&
    ![TransactionType.DELEGATE, TransactionType.UNDELEGATE, TransactionType.EDIT_DELEGATION].includes(transaction.type)
  ) {
    return null;
  }

  // TODO: Move this to domain layer
  const delegationTarget = operationDetailsUtils.getDelegationTarget(operation);
  const delegationTracks = operationDetailsUtils.getDelegationTracks(operation);
  const delegationVotes = operationDetailsUtils.getDelegationVotes(operation);

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
