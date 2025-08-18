import { type ApiPromise } from '@polkadot/api';
import { useStoreMap, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { type Address, type Chain, type Transaction, type Validator, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw, keys, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CaptionText, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Account, AccountExplorers, AssetBalance, WalletIcon } from '@/shared/ui-entities';
import { Box, Skeleton } from '@/shared/ui-kit';
import { type AnyAccount, type MultisigOperation, identity } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { TracksDetails, voteTransactionService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { operationDetailsUtils } from '@/entities/operations';
import { proxyUtils } from '@/entities/proxy';
import { SelectedValidatorsModal, useValidatorsMap } from '@/entities/staking';
import {
  isAddProxyTransaction,
  isManageProxyTransaction,
  isProxyTransaction,
  isRemoveProxyTransaction,
  isRemovePureProxyTransaction,
  isTransferTransaction,
  isUndelegateTransaction,
  isXcmTransaction,
} from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

type Props = {
  operation: MultisigOperation;
  account?: AnyAccount;
  signatory?: AnyAccount;
  chain: Chain;
  api: ApiPromise;
};

export const Details = ({ api, operation, account, chain, signatory }: Props) => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletSelect.$selectedWallet);
  const wallets = useUnit(walletModel.$wallets);
  const chains = useUnit(networkModel.$chains);

  const payee = operationDetailsUtils.getPayee(operation);
  const spawner = operationDetailsUtils.getSpawner(operation);
  const delegate = operationDetailsUtils.getDelegate(operation);
  const proxyType = operationDetailsUtils.getProxyType(operation);
  const destinationChain = operationDetailsUtils.getDestinationChain(operation);
  const destination = operationDetailsUtils.getDestination(operation, chains, destinationChain);

  const delegationTarget = operationDetailsUtils.getDelegationTarget(operation);
  const delegationTracks = operationDetailsUtils.getDelegationTracks(operation);
  const delegationVotes = operationDetailsUtils.getDelegationVotes(operation);

  const [isUndelegationLoading, setIsUndelegationLoading] = useState(false);
  const [undelegationVotes, setUndelegationVotes] = useState<string>();
  const [undelegationTarget, setUndelegationTarget] = useState<AccountId>();

  const referendumId = operationDetailsUtils.getReferendumId(operation);
  const vote = operationDetailsUtils.getVote(operation);

  const identities = useStoreMap({
    store: identity.$list,
    keys: [operation.chainId],
    fn: (value, [chainId]) => value[chainId] ?? {},
  });

  const signatoryWallet = wallets.find(w => w.id === signatory?.walletId);

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

  const defaultAsset = chain?.assets?.[0];

  const validatorsMap = useValidatorsMap(api);

  const [isValidatorsOpen, toggleValidators] = useToggle();

  const allValidators = Object.values(validatorsMap);

  const transaction = operation.transaction;

  useEffect(() => {
    const accounts = keys(validatorsMap).map(toAccountId);

    if (accounts.length === 0) return;

    identity.request({ chainId: operation.chainId, accounts });
  }, [validatorsMap]);

  const startStakingValidators: Address[] =
    (transaction?.type === 'batchAll' &&
      transaction.args.transactions.find((tx: Transaction) => tx.type === 'nominate')?.args?.targets) ||
    [];

  const selectedValidators: Validator[] =
    allValidators.filter(v => (transaction?.args.targets || startStakingValidators).includes(v.accountId)) || [];

  const proxied = useMemo((): { wallet: Wallet; account: AnyAccount } | undefined => {
    if (!transaction || !isProxyTransaction(transaction)) {
      return undefined;
    }

    const proxiedAccountId = toAccountId(transaction.args.real);
    const { wallet, account } = wallets.reduce<{ wallet?: Wallet; account?: AnyAccount }>(
      (acc, wallet) => {
        if (acc.wallet) {
          return acc;
        }

        const account = wallet.accounts.find(account => account.accountId === proxiedAccountId);

        return { wallet, account };
      },
      { wallet: undefined, account: undefined },
    );

    if (!wallet || !account) {
      return undefined;
    }

    return { wallet, account };
  }, [operation, wallets]);

  const hasSender = isXcmTransaction(transaction) || isTransferTransaction(transaction);

  const isDividerVisible =
    (isXcmTransaction(transaction) && transaction?.args.destinationChain) ||
    isManageProxyTransaction(transaction) ||
    destination ||
    selectedValidators.length !== 0;

  return (
    <dl className="flex w-full flex-col gap-y-4">
      {proxied && (
        <>
          <DetailRow label={t('operation.details.senderProxiedWallet')}>
            <div className="flex max-w-none items-center gap-x-2">
              <WalletIcon type={proxied.wallet.type} size={16} />
              <FootnoteText>{proxied.wallet.name}</FootnoteText>
            </div>
          </DetailRow>

          <DetailRow label={t('operation.details.senderAccount')} className="text-text-secondary">
            <Account chain={chain} accountId={proxied.account.accountId} variant="short" />
          </DetailRow>

          <hr className="border-filter-border" />
        </>
      )}

      {account && activeWallet && (
        <DetailRow label={t('operation.details.multisigWallet')}>
          <div className="flex max-w-none items-center gap-x-2">
            <WalletIcon type={activeWallet.type} size={16} />
            <FootnoteText>{activeWallet.name}</FootnoteText>
          </div>
        </DetailRow>
      )}

      {signatory && signatoryWallet && (
        <DetailRow label={t('transfer.signatoryLabel')} className="text-text-secondary">
          <Box direction="row" gap={2}>
            <WalletIcon type={signatoryWallet.type} size={16} />
            <span>{signatoryWallet.name}</span>
            {chain ? <AccountExplorers accountId={signatory.accountId} chain={chain} /> : null}
          </Box>
        </DetailRow>
      )}

      {account && (
        <DetailRow
          label={t(hasSender ? 'operation.details.sender' : 'operation.details.account')}
          className="text-text-secondary"
        >
          <Account chain={chain} accountId={account.accountId} variant="short" />
        </DetailRow>
      )}

      {Boolean(selectedValidators.length) && defaultAsset && (
        <>
          <DetailRow label={t('operation.details.validators')}>
            <button
              type="button"
              className={cnTw(
                '-mr-2 flex cursor-pointer items-center gap-x-1 rounded-sm px-2 py-[3px]',
                'hover:bg-action-background-hover hover:text-text-primary',
              )}
              onClick={toggleValidators}
            >
              <div className="rounded-[30px] bg-icon-accent px-1.5 py-px">
                <CaptionText className="text-white" align="center">
                  {selectedValidators.length}
                </CaptionText>
              </div>
              <Icon name="info" size={16} />
            </button>
          </DetailRow>
          <SelectedValidatorsModal
            isOpen={isValidatorsOpen}
            validators={selectedValidators}
            identities={identities}
            onClose={toggleValidators}
          />
        </>
      )}

      {isDividerVisible && <hr className="border-filter-border" />}

      {isAddProxyTransaction(transaction) && delegate && (
        <DetailRow label={t('operation.details.delegateTo')} className="text-text-secondary">
          <Account chain={chain} accountId={delegate} variant="short" />
        </DetailRow>
      )}

      {isRemoveProxyTransaction(transaction) && delegate && (
        <DetailRow label={t('operation.details.revokeFor')} className="text-text-secondary">
          <Account chain={chain} accountId={delegate} variant="short" />
        </DetailRow>
      )}

      {isRemovePureProxyTransaction(transaction) && proxyType && spawner && (
        <>
          <DetailRow label={t('operation.details.revokeAccessType')}>
            <FootnoteText className="text-text-secondary">{t(proxyUtils.getProxyTypeName(proxyType))}</FootnoteText>
          </DetailRow>
          <DetailRow label={t('operation.details.revokeFor')} className="text-text-secondary">
            <Account chain={chain} accountId={spawner} variant="short" />
          </DetailRow>
        </>
      )}

      {isManageProxyTransaction(transaction) && proxyType && (
        <DetailRow label={t('operation.details.accessType')}>
          <FootnoteText className="text-text-secondary">{t(proxyUtils.getProxyTypeName(proxyType))}</FootnoteText>
        </DetailRow>
      )}

      {isXcmTransaction(transaction) && destinationChain && (
        <DetailRow label={t('operation.details.toNetwork')}>
          <ChainTitle chainId={destinationChain} />
        </DetailRow>
      )}

      {destination && (
        <DetailRow label={t('operation.details.recipient')} className="text-text-secondary">
          <Account chain={chain} accountId={destination} variant="short" />
        </DetailRow>
      )}

      {payee && (
        <DetailRow
          label={t('operation.details.payee')}
          className={cnTw('text-text-secondary', { 'pr-0': typeof payee === 'string' })}
        >
          {typeof payee === 'string' ? (
            t('staking.confirmation.restakeRewards')
          ) : (
            <Account chain={chain} accountId={payee.Account} variant="short" />
          )}
        </DetailRow>
      )}

      {referendumId && (
        <DetailRow label={t('operation.details.referendum')}>
          <FootnoteText className="text-text-secondary">#{referendumId}</FootnoteText>
        </DetailRow>
      )}

      {vote && (
        <DetailRow label={t('operation.details.votes')}>
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
        </DetailRow>
      )}

      {isUndelegationLoading && (
        <>
          <DetailRow label={t('operation.details.delegationTarget')} className="text-text-secondary">
            <Skeleton width={40} height={6} />
          </DetailRow>

          <DetailRow label={t('operation.details.delegationVotes')}>
            <Skeleton width={20} height={5} />
          </DetailRow>
        </>
      )}

      {delegationTarget && (
        <DetailRow label={t('operation.details.delegationTarget')} className="text-text-secondary">
          <Account chain={chain} accountId={delegationTarget} variant="short" />
        </DetailRow>
      )}

      {!delegationTarget && undelegationTarget && (
        <DetailRow label={t('operation.details.delegationTarget')} className="text-text-secondary">
          <Account chain={chain} accountId={undelegationTarget} variant="short" />
        </DetailRow>
      )}

      {delegationVotes && (
        <DetailRow label={t('operation.details.delegationVotes')}>
          <FootnoteText>
            <AssetBalance
              className="text-text-secondary"
              value={delegationVotes}
              asset={defaultAsset}
              showSymbol={false}
            />
          </FootnoteText>
        </DetailRow>
      )}

      {!delegationVotes && undelegationVotes && (
        <DetailRow label={t('operation.details.delegationVotes')}>
          <FootnoteText>
            <AssetBalance
              className="text-text-secondary"
              value={undelegationVotes}
              asset={defaultAsset}
              showSymbol={false}
            />
          </FootnoteText>
        </DetailRow>
      )}

      {delegationTracks && (
        <DetailRow label={t('operation.details.delegationTracks')} className="text-text-secondary">
          <TracksDetails tracks={delegationTracks.map(Number)} />
        </DetailRow>
      )}

      <hr className="border-filter-border" />
    </dl>
  );
};
