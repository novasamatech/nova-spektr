import { type ApiPromise } from '@polkadot/api';
import { useStoreMap, useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import {
  type Account as AccountType,
  type Address,
  type Chain,
  type FlexibleMultisigAccount,
  type FlexibleMultisigTransaction,
  type MultisigAccount,
  type MultisigTransaction,
  type Transaction,
  type Validator,
  type Wallet,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CaptionText, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Account, AccountExplorers } from '@/shared/ui-entities';
import { Box, Skeleton } from '@/shared/ui-kit';
import { identityDomain } from '@/domains/identity';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { TracksDetails, voteTransactionService } from '@/entities/governance';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel, networkUtils } from '@/entities/network';
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
import { WalletIcon, walletModel } from '@/entities/wallet';
import { InteractionStyle } from '../common/constants';
import {
  getDelegate,
  getDelegationTarget,
  getDelegationTracks,
  getDelegationVotes,
  getDestination,
  getDestinationChain,
  getPayee,
  getProxyType,
  getReferendumId,
  getSpawner,
  getUndelegationData,
  getVote,
  // eslint-disable-next-line import-x/max-dependencies
} from '../common/utils';

type Props = {
  tx: MultisigTransaction | FlexibleMultisigTransaction;
  account?: MultisigAccount | FlexibleMultisigAccount;
  signatory?: AccountType;
  chain: Chain;
  api: ApiPromise;
};

export const Details = ({ api, tx, account, chain, signatory }: Props) => {
  const { t } = useI18n();

  const connection = useStoreMap({
    store: networkModel.$connections,
    keys: [chain.chainId],
    fn: (connections, [chainId]) => connections[chainId] ?? null,
  });
  const activeWallet = useUnit(walletModel.$activeWallet);
  const wallets = useUnit(walletModel.$wallets);
  const chains = useUnit(networkModel.$chains);

  const payee = getPayee(tx);
  const spawner = getSpawner(tx);
  const delegate = getDelegate(tx);
  const proxyType = getProxyType(tx);
  const destinationChain = getDestinationChain(tx);
  const destination = getDestination(tx, chains, destinationChain);

  const delegationTarget = getDelegationTarget(tx);
  const delegationTracks = getDelegationTracks(tx);
  const delegationVotes = getDelegationVotes(tx);

  const [isUndelegationLoading, setIsUndelegationLoading] = useState(false);
  const [undelegationVotes, setUndelegationVotes] = useState<string>();
  const [undelegationTarget, setUndelegationTarget] = useState<Address>();

  const referendumId = getReferendumId(tx);
  const vote = getVote(tx);

  const identities = useStoreMap({
    store: identityDomain.identity.$list,
    keys: [tx.chainId],
    fn: (value, [chainId]) => value[chainId] ?? {},
  });

  const signatoryWallet = wallets.find((w) => w.id === signatory?.walletId);

  useEffect(() => {
    if (isUndelegateTransaction(transaction)) {
      setIsUndelegationLoading(true);
    }

    if (!api) return;

    getUndelegationData(api, tx).then(({ votes, target }) => {
      setUndelegationVotes(votes);
      setUndelegationTarget(target);
      setIsUndelegationLoading(false);
    });
  }, [api, tx]);

  const defaultAsset = chain?.assets?.[0];

  const validatorsMap = useValidatorsMap(api, connection && networkUtils.isLightClientConnection(connection));

  const [isValidatorsOpen, toggleValidators] = useToggle();

  const allValidators = Object.values(validatorsMap);

  const transaction = getTransactionFromMultisigTx(tx);

  useEffect(() => {
    const accounts = Object.keys(validatorsMap).map(toAccountId) as AccountId[];

    if (accounts.length === 0) return;

    identityDomain.identity.request({ chainId: tx.chainId, accounts });
  }, [validatorsMap]);

  const startStakingValidators: Address[] =
    (tx.transaction?.type === 'batchAll' &&
      tx.transaction.args.transactions.find((tx: Transaction) => tx.type === 'nominate')?.args?.targets) ||
    [];

  const selectedValidators: Validator[] =
    allValidators.filter((v) => (transaction?.args.targets || startStakingValidators).includes(v.address)) || [];

  const proxied = useMemo((): { wallet: Wallet; account: AccountType } | undefined => {
    if (!tx.transaction || !isProxyTransaction(tx.transaction)) {
      return undefined;
    }

    const proxiedAccountId = toAccountId(tx.transaction.args.real);
    const { wallet, account } = wallets.reduce<{ wallet?: Wallet; account?: AccountType }>(
      (acc, wallet) => {
        if (acc.wallet) {
          return acc;
        }

        const account = wallet.accounts.find((account) => account.accountId === proxiedAccountId);

        return { wallet, account };
      },
      { wallet: undefined, account: undefined },
    );

    if (!wallet || !account) {
      return undefined;
    }

    return { wallet, account };
  }, [tx, wallets]);

  const hasSender = isXcmTransaction(tx.transaction) || isTransferTransaction(tx.transaction);

  const isDividerVisible =
    (isXcmTransaction(tx.transaction) && transaction?.args.destinationChain) ||
    isManageProxyTransaction(tx.transaction) ||
    destination ||
    transaction?.args.payee;

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
              className={cnTw('flex items-center gap-x-1', InteractionStyle)}
              onClick={toggleValidators}
            >
              <div className="rounded-[30px] bg-icon-accent px-1.5 py-[1px]">
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

      {isXcmTransaction(tx.transaction) && destinationChain && (
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
