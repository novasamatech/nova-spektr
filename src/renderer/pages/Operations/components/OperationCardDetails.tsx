import { useStoreMap, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { chainsService } from '@/shared/api/network';
import {
  type Address,
  type FlexibleMultisigAccount,
  type FlexibleMultisigTransaction,
  type MultisigAccount,
  type MultisigTransaction,
  type Transaction,
  TransactionType,
  type Validator,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw, getAssetById, nonNullable, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, DetailRow, FootnoteText, Icon } from '@/shared/ui';
import { Skeleton } from '@/shared/ui-kit';
import { identityDomain } from '@/domains/identity';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle } from '@/entities/chain';
import { TracksDetails, voteTransactionService } from '@/entities/governance';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { type ExtendedChain, networkModel, networkUtils } from '@/entities/network';
import { proxyUtils } from '@/entities/proxy';
import { ValidatorsModal, useValidatorsMap } from '@/entities/staking';
import {
  isAddProxyTransaction,
  isManageProxyTransaction,
  isRemoveProxyTransaction,
  isRemovePureProxyTransaction,
  isUndelegateTransaction,
  isXcmTransaction,
} from '@/entities/transaction';
import { AddressWithExplorers, ExplorersPopover, WalletCardSm, walletModel } from '@/entities/wallet';
import { AddressStyle, InteractionStyle } from '../common/constants';
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
  getSender,
  getUndelegationData,
  getVote,
  // eslint-disable-next-line import-x/max-dependencies
} from '../common/utils';

import { OperationAdvancedDetails } from './OperationAdvancedDetails';

type Props = {
  tx: MultisigTransaction | FlexibleMultisigTransaction;
  account: MultisigAccount | FlexibleMultisigAccount | null;
  extendedChain?: ExtendedChain;
};

export const OperationCardDetails = ({ tx, account, extendedChain }: Props) => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletModel.$activeWallet);
  const wallets = useUnit(walletModel.$wallets);
  const chains = useUnit(networkModel.$chains);

  const payee = getPayee(tx);
  const sender = getSender(tx);
  const delegate = getDelegate(tx);
  const proxyType = getProxyType(tx);
  const destinationChain = getDestinationChain(tx);
  const destination = getDestination(tx, chains, destinationChain);

  const delegationTarget = getDelegationTarget(tx);
  const delegationTracks = getDelegationTracks(tx);
  const delegationVotes = getDelegationVotes(tx);

  const referendumId = getReferendumId(tx);
  const vote = getVote(tx);

  const api = extendedChain?.api;
  const defaultAsset = extendedChain?.assets[0];
  const addressPrefix = extendedChain?.addressPrefix;
  const explorers = extendedChain?.explorers;
  const connection = extendedChain?.connection;

  const [isUndelegationLoading, setIsUndelegationLoading] = useState(false);
  const [undelegationVotes, setUndelegationVotes] = useState<string>();
  const [undelegationTarget, setUndelegationTarget] = useState<Address>();

  const identities = useStoreMap({
    store: identityDomain.identity.$list,
    keys: [tx.chainId],
    fn: (value, [chainId]) => value[chainId] ?? {},
  });

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

  const [isAdvancedShown, toggleAdvanced] = useToggle();
  const [isValidatorsOpen, toggleValidators] = useToggle();

  const transaction = getTransactionFromMultisigTx(tx);
  const validatorsMap = useValidatorsMap(api, connection && networkUtils.isLightClientConnection(connection));

  const allValidators = Object.values(validatorsMap);

  useEffect(() => {
    const accounts = Object.keys(validatorsMap).map(toAccountId) as AccountId[];

    if (accounts.length === 0) return;

    identityDomain.identity.request({ chainId: tx.chainId, accounts });
  }, [validatorsMap]);

  const startStakingValidators: Address[] =
    (tx.transaction?.type === TransactionType.BATCH_ALL &&
      tx.transaction.args.transactions.find((tx: Transaction) => tx.type === TransactionType.NOMINATE)?.args
        ?.targets) ||
    [];

  const selectedValidators: Validator[] =
    allValidators.filter((v) => (transaction?.args.targets || startStakingValidators).includes(v.address)) || [];
  const selectedValidatorsAddress = selectedValidators.map((validator) => validator.address);
  const notSelectedValidators = allValidators.filter((v) => !selectedValidatorsAddress.includes(v.address));

  const validatorsAsset =
    transaction && getAssetById(transaction.args.asset, chainsService.getChainById(tx.chainId)?.assets);

  const valueClass = 'text-text-secondary';

  return (
    <dl className="flex w-full flex-col gap-y-1">
      {account && activeWallet && (
        <DetailRow label={t('operation.details.multisigWallet')} className={valueClass}>
          <div className="-mr-2">
            <ExplorersPopover
              button={<WalletCardSm wallet={activeWallet} />}
              address={account.accountId}
              explorers={explorers}
              addressPrefix={addressPrefix}
            />
          </div>
        </DetailRow>
      )}

      {isXcmTransaction(transaction) && (
        <>
          {sender && (
            <DetailRow label={t('operation.details.sender')} className={valueClass}>
              <AddressWithExplorers
                explorers={explorers}
                addressFont={AddressStyle}
                type="short"
                address={sender}
                addressPrefix={addressPrefix}
                wrapperClassName="-mr-2 min-w-min"
              />
            </DetailRow>
          )}

          <DetailRow label={t('operation.details.fromNetwork')} className={valueClass}>
            <ChainTitle chainId={tx.chainId} fontClass={valueClass} />
          </DetailRow>

          {destinationChain && (
            <DetailRow label={t('operation.details.toNetwork')} className={valueClass}>
              <ChainTitle chainId={destinationChain} fontClass={valueClass} />
            </DetailRow>
          )}
        </>
      )}

      {destination && (
        <DetailRow label={t('operation.details.recipient')} className={valueClass}>
          <AddressWithExplorers
            type="short"
            explorers={explorers}
            addressFont={AddressStyle}
            address={destination}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {isAddProxyTransaction(transaction) && delegate && (
        <DetailRow label={t('operation.details.delegateTo')} className={valueClass}>
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            type="short"
            address={delegate}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {isRemoveProxyTransaction(transaction) && delegate && (
        <DetailRow label={t('operation.details.revokeFor')} className={valueClass}>
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            type="short"
            address={delegate}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {isRemovePureProxyTransaction(transaction) && sender && (
        <DetailRow label={t('operation.details.revokeFor')} className={valueClass}>
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            type="short"
            address={sender}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {isManageProxyTransaction(transaction) && proxyType && (
        <DetailRow label={t('operation.details.accessType')} className={valueClass}>
          <FootnoteText className={valueClass}>{t(proxyUtils.getProxyTypeName(proxyType))}</FootnoteText>
        </DetailRow>
      )}

      {referendumId && (
        <DetailRow label={t('operation.details.referendum')} className={valueClass}>
          <FootnoteText className={valueClass}>#{referendumId}</FootnoteText>
        </DetailRow>
      )}

      {vote && (
        <DetailRow label={t('operation.details.votes')} className={valueClass}>
          <FootnoteText className={valueClass}>
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
                      className={valueClass}
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
        <DetailRow label={t('operation.details.delegationTarget')} className={valueClass}>
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            type="short"
            address={delegationTarget}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {!delegationTarget && undelegationTarget && (
        <DetailRow label={t('operation.details.delegationTarget')} className={valueClass}>
          <AddressWithExplorers
            explorers={explorers}
            addressFont={AddressStyle}
            type="short"
            address={undelegationTarget}
            addressPrefix={addressPrefix}
            wrapperClassName="-mr-2 min-w-min"
          />
        </DetailRow>
      )}

      {delegationVotes && (
        <DetailRow label={t('operation.details.delegationVotes')} className={valueClass}>
          <FootnoteText className={valueClass}>
            <AssetBalance
              className={valueClass}
              value={delegationVotes}
              asset={defaultAsset}
              showSymbol={false}
            ></AssetBalance>
          </FootnoteText>
        </DetailRow>
      )}

      {!delegationVotes && undelegationVotes && (
        <DetailRow label={t('operation.details.delegationVotes')} className={valueClass}>
          <FootnoteText className={valueClass}>
            <AssetBalance
              className={valueClass}
              value={undelegationVotes}
              asset={defaultAsset}
              showSymbol={false}
            ></AssetBalance>
          </FootnoteText>
        </DetailRow>
      )}

      {delegationTracks && (
        <DetailRow label={t('operation.details.delegationTracks')} className={valueClass}>
          <TracksDetails tracks={delegationTracks.map(Number)} />
        </DetailRow>
      )}

      {Boolean(selectedValidators?.length) && defaultAsset && (
        <>
          <DetailRow label={t('operation.details.validators')} className={valueClass}>
            <button
              type="button"
              className={cnTw('flex items-center gap-x-1 text-text-secondary', InteractionStyle)}
              onClick={toggleValidators}
            >
              <FootnoteText as="span" className="text-inherit">
                {selectedValidators.length}
              </FootnoteText>
              <Icon name="info" size={16} />
            </button>
          </DetailRow>
          <ValidatorsModal
            isOpen={isValidatorsOpen}
            asset={validatorsAsset}
            identities={identities}
            selectedValidators={selectedValidators}
            notSelectedValidators={notSelectedValidators}
            explorers={extendedChain?.explorers}
            onClose={toggleValidators}
          />
        </>
      )}

      {payee && (
        <DetailRow
          label={t('operation.details.payee')}
          className={cnTw(valueClass, { 'pr-0': typeof payee === 'string' })}
        >
          {typeof payee === 'string' ? (
            t('staking.confirmation.restakeRewards')
          ) : (
            <AddressWithExplorers
              type="short"
              explorers={explorers}
              addressFont={AddressStyle}
              address={payee.Account}
              addressPrefix={addressPrefix}
              wrapperClassName="-mr-2 min-w-min"
            />
          )}
        </DetailRow>
      )}

      <Button
        variant="text"
        pallet="primary"
        size="sm"
        suffixElement={<Icon name={isAdvancedShown ? 'up' : 'down'} size={16} />}
        className="-ml-2 w-fit text-action-text-default hover:text-action-text-default"
        onClick={toggleAdvanced}
      >
        {t('operation.advanced')}
      </Button>

      {isAdvancedShown && nonNullable(account) && nonNullable(extendedChain) && (
        <OperationAdvancedDetails tx={tx} chain={extendedChain} wallets={wallets} />
      )}
    </dl>
  );
};
