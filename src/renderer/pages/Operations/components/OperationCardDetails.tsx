import { useStoreMap, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { chainsService } from '@/shared/api/network';
import {
  type Address,
  type MultisigAccount,
  type MultisigTransaction,
  type Transaction,
  TransactionType,
  type Validator,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { cnTw, copyToClipboard, getAssetById, toAccountId, truncate } from '@/shared/lib/utils';
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
import { signatoryUtils } from '@/entities/signatory';
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
  getMultisigExtrinsicLink,
  getPayee,
  getProxyType,
  getReferendumId,
  getSender,
  getUndelegationData,
  getVote,
  // eslint-disable-next-line import-x/max-dependencies
} from '../common/utils';

type Props = {
  tx: MultisigTransaction;
  account?: MultisigAccount;
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

  const { indexCreated, blockCreated, deposit, depositor, callHash, callData } = tx;

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

  const depositorSignatory = account?.signatories.find((s) => s.accountId === depositor);
  const extrinsicLink = getMultisigExtrinsicLink(callHash, indexCreated, blockCreated, explorers);
  const validatorsAsset =
    transaction && getAssetById(transaction.args.asset, chainsService.getChainById(tx.chainId)?.assets);

  const valueClass = 'text-text-secondary';
  const depositorWallet =
    depositorSignatory && signatoryUtils.getSignatoryWallet(wallets, depositorSignatory.accountId);

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

      {isAdvancedShown && (
        <>
          {callHash && (
            <DetailRow label={t('operation.details.callHash')} className={valueClass}>
              <button
                type="button"
                className={cnTw('group flex items-center gap-x-1', InteractionStyle)}
                onClick={() => copyToClipboard(callHash)}
              >
                <FootnoteText className="text-inherit">{truncate(callHash, 7, 8)}</FootnoteText>
                <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
              </button>
            </DetailRow>
          )}

          {callData && (
            <DetailRow label={t('operation.details.callData')} className={valueClass}>
              <button
                type="button"
                className={cnTw('group flex items-center gap-x-1', InteractionStyle)}
                onClick={() => copyToClipboard(callData)}
              >
                <FootnoteText className="text-inherit">{truncate(callData, 7, 8)}</FootnoteText>
                <Icon name="copy" size={16} className="group-hover:text-icon-hover" />
              </button>
            </DetailRow>
          )}

          {deposit && defaultAsset && depositorSignatory && <hr className="border-divider" />}

          {depositorSignatory && (
            <DetailRow label={t('operation.details.depositor')} className={valueClass}>
              <div className="-mr-2">
                {depositorWallet ? (
                  <ExplorersPopover
                    button={<WalletCardSm wallet={depositorWallet} />}
                    address={depositorSignatory.accountId}
                    explorers={explorers}
                    addressPrefix={addressPrefix}
                  />
                ) : (
                  <AddressWithExplorers
                    explorers={explorers}
                    accountId={depositorSignatory.accountId}
                    name={depositorSignatory.name}
                    addressFont={AddressStyle}
                    addressPrefix={addressPrefix}
                    wrapperClassName="min-w-min"
                    type="short"
                  />
                )}
              </div>
            </DetailRow>
          )}

          {deposit && defaultAsset && (
            <DetailRow label={t('operation.details.deposit')} className={valueClass}>
              <AssetBalance
                value={deposit}
                asset={defaultAsset}
                showIcon={false}
                className="py-[3px] text-footnote text-text-secondary"
              />
            </DetailRow>
          )}

          {deposit && defaultAsset && depositorSignatory && <hr className="border-divider" />}

          {indexCreated && blockCreated && (
            <DetailRow label={t('operation.details.timePoint')} className={valueClass}>
              {extrinsicLink ? (
                <a
                  className={cnTw('group flex items-center gap-x-1', InteractionStyle)}
                  href={extrinsicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FootnoteText className="text-text-secondary">
                    {blockCreated}-{indexCreated}
                  </FootnoteText>
                  <Icon name="globe" size={16} className="group-hover:text-icon-hover" />
                </a>
              ) : (
                `${blockCreated}-${indexCreated}`
              )}
            </DetailRow>
          )}
        </>
      )}
    </dl>
  );
};
