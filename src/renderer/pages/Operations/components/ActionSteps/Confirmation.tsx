import { useEffect, useState } from 'react';
import { useStore } from 'effector-react';

import {
  MultisigTransaction,
  Transaction,
  Fee,
  DepositWithLabel,
  TransactionType,
  isXcmTransaction,
} from '@renderer/entities/transaction';
import { TransactionAmount } from '@renderer/pages/Operations/components/TransactionAmount';
import { Button, DetailRow, FootnoteText, Icon } from '@renderer/shared/ui';
import { ExtendedChain } from '@renderer/entities/network';
import { useI18n } from '@renderer/app/providers';
import { getIconName } from '../../common/utils';
import type { Account, MultisigAccount } from '@renderer/shared/core';
import Details from '../Details';
import * as sendAssetModel from '@renderer/widgets/SendAssetModal/model/send-asset';
import { XcmFee } from '@renderer/entities/transaction/ui/XcmFee/XcmFee';

type Props = {
  tx: MultisigTransaction;
  account: MultisigAccount;
  signatory?: Account;
  connection: ExtendedChain;
  feeTx?: Transaction;
  onSign: () => void;
};
export const Confirmation = ({ tx, account, connection, signatory, feeTx, onSign }: Props) => {
  const xcmConfig = useStore(sendAssetModel.$finalConfig);
  const { t } = useI18n();
  const [isFeeLoaded, setIsFeeLoaded] = useState(false);

  const asset = connection.assets[0];

  const iconName = getIconName(tx.transaction);
  const transaction =
    tx.transaction?.type === 'batchAll'
      ? tx.transaction.args.transactions.find(
          (tx: Transaction) => tx.type === TransactionType.BOND || tx.type === TransactionType.UNSTAKE,
        ) || tx.transaction.args.transactions[0]
      : tx.transaction;

  useEffect(() => {
    sendAssetModel.events.xcmConfigRequested();
  }, []);

  return (
    <div className="flex flex-col items-center gap-y-3">
      <div className="flex flex-col items-center gap-y-3 mb-6">
        <div className="flex items-center justify-center w-15 h-15 box-content rounded-full border-2 border-icon-default">
          <Icon className="text-icon-default" name={iconName} size={42} />
        </div>

        {tx.transaction && <TransactionAmount tx={tx.transaction} />}

        {tx.description && (
          <FootnoteText className="py-2 px-3 rounded bg-block-background ml-3 text-text-secondary">
            {tx.description}
          </FootnoteText>
        )}
      </div>

      <Details tx={tx} account={account} connection={connection} signatory={signatory} />

      {signatory && connection?.api && (
        <DepositWithLabel
          api={connection.api}
          asset={connection.assets[0]}
          className="text-footnote"
          threshold={(account as MultisigAccount).threshold}
        />
      )}

      <DetailRow label={t('operation.networkFee')} className="text-text-primary">
        {connection?.api && feeTx && (
          <Fee
            className="text-footnote"
            api={connection.api}
            asset={connection.assets[0]}
            transaction={feeTx}
            onFeeChange={(fee) => setIsFeeLoaded(Boolean(fee))}
          />
        )}
      </DetailRow>

      {isXcmTransaction(transaction) && xcmConfig && (
        <DetailRow label={t('operation.xcmFee')} className="text-text-primary pr-2">
          {xcmConfig && connection.api && (
            // TODO pass proper asset
            <XcmFee api={connection.api} transaction={transaction} asset={asset} config={xcmConfig} />
          )}
        </DetailRow>
      )}

      <Button
        disabled={!isFeeLoaded}
        className="mt-3 ml-auto"
        prefixElement={<Icon name="vault" size={14} />}
        onClick={onSign}
      >
        {t('operation.signButton')}
      </Button>
    </div>
  );
};
