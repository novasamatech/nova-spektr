import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { type Address, TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { toAccountId } from '@/shared/lib/utils';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { Account } from '@/shared/ui-entities';
import { Skeleton } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { TracksDetails, voteTransactionService } from '@/entities/governance';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { isUndelegateTransaction } from '@/entities/transaction';
import { multisigOperationsFeature } from '@/features/multisig-operations';

import { GovernanceOperationTitle } from './components/GovernanceOperationTitle';

export const governanceOperationDetailFeature = createFeature({
  name: 'governance/operation-details',
});

governanceOperationDetailFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => {
    const { t } = useI18n();
    const transaction = getTransactionFromMultisigTx(operation);

    const chains = useUnit(networkModel.$chains);
    const chain = chains[operation.chainId];
    const defaultAsset = chain?.assets[0];

    const result = [];

    if (
      transaction?.type &&
      ![TransactionType.UNLOCK, TransactionType.VOTE, TransactionType.REVOTE, TransactionType.REMOVE_VOTE].includes(
        transaction.type,
      )
    ) {
      return null;
    }

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
              <span className="uppercase">
                {t(`governance.referendum.${voteTransactionService.getDecision(vote)}`)}
              </span>
              :{' '}
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
  },
  order: 1,
});

governanceOperationDetailFeature.inject(multisigOperationsFeature.slots.operationDetails, {
  render: ({ operation }) => {
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
      ![TransactionType.DELEGATE, TransactionType.UNDELEGATE, TransactionType.EDIT_DELEGATION].includes(
        transaction.type,
      )
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
  },
  order: 1,
});

governanceOperationDetailFeature.inject(multisigOperationsFeature.slots.operationTitle, {
  render: ({ operation }) => {
    const transaction = getTransactionFromMultisigTx(operation);

    if (
      transaction?.type &&
      [
        TransactionType.UNLOCK,
        TransactionType.VOTE,
        TransactionType.REVOTE,
        TransactionType.REMOVE_VOTE,
        TransactionType.DELEGATE,
        TransactionType.UNDELEGATE,
        TransactionType.EDIT_DELEGATION,
      ].includes(transaction.type)
    ) {
      return <GovernanceOperationTitle tx={operation} />;
    }

    return null;
  },
  order: 1,
});
