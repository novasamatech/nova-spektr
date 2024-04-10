import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { TransactionAmount } from '@pages/Operations/components/TransactionAmount';
import { DetailRow, FootnoteText, Icon } from '@shared/ui';
import { ExtendedChain } from '@entities/network';
import { useI18n } from '@app/providers';
import { type Account, type MultisigAccount } from '@shared/core';
import { getAssetById } from '@shared/lib/utils';
import { getTransactionFromMultisigTx } from '@entities/multisig';
import { xcmTransferModel } from '@widgets/Transfer';
import { SignButton } from '@entities/operations';
import { walletModel } from '@entities/wallet';
import { getIconName } from '@entities/transaction/lib/transactionConfirmIcon';
import { priceProviderModel } from '@entities/price';
import { Details } from '../Details';
import {
  MultisigTransaction,
  Transaction,
  Fee,
  MultisigDepositWithLabel,
  isXcmTransaction,
  XcmFee,
  FeeLoader,
} from '@entities/transaction';

type Props = {
  tx: MultisigTransaction;
  account: MultisigAccount;
  signatory?: Account;
  connection: ExtendedChain;
  feeTx?: Transaction;
  onSign: () => void;
};
export const Confirmation = ({ tx, account, connection, signatory, feeTx, onSign }: Props) => {
  const { t } = useI18n();
  const [isFeeLoaded, setIsFeeLoaded] = useState(false);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const wallets = useUnit(walletModel.$wallets);
  const wallet = wallets.find((w) => w.id === signatory?.walletId);

  const xcmConfig = useUnit(xcmTransferModel.$config);
  const asset = getAssetById(tx.transaction?.args.assetId, connection.assets) || connection.assets[0];

  const transaction = getTransactionFromMultisigTx(tx);

  useEffect(() => {
    xcmTransferModel.events.xcmConfigLoaded();
  }, []);

  return (
    <div className="flex flex-col items-center gap-y-3">
      <div className="flex flex-col items-center gap-y-3 mb-6">
        <Icon className="text-icon-default" name={getIconName(tx.transaction)} size={60} />

        {tx.transaction && <TransactionAmount tx={tx.transaction} />}

        {tx.description && (
          <FootnoteText className="py-2 px-3 rounded bg-block-background ml-3 text-text-secondary">
            {tx.description}
          </FootnoteText>
        )}
      </div>

      <Details tx={tx} account={account} extendedChain={connection} signatory={signatory} />

      {signatory && connection?.api && (
        <MultisigDepositWithLabel
          api={connection.api}
          asset={connection.assets[0]}
          className="text-footnote"
          threshold={(account as MultisigAccount).threshold}
        />
      )}

      <DetailRow label={t('operation.networkFee')} className="text-text-primary">
        {connection?.api && feeTx ? (
          <Fee
            className="text-footnote"
            api={connection.api}
            asset={connection.assets[0]}
            transaction={feeTx}
            onFeeChange={(fee) => setIsFeeLoaded(Boolean(fee))}
          />
        ) : (
          <FeeLoader fiatFlag={!!fiatFlag} />
        )}
      </DetailRow>

      {isXcmTransaction(transaction) && xcmConfig && connection.api && (
        <DetailRow label={t('operation.xcmFee')} className="text-text-primary">
          <XcmFee api={connection.api} transaction={transaction} asset={asset} config={xcmConfig} />
        </DetailRow>
      )}

      <SignButton disabled={!isFeeLoaded} className="mt-3 ml-auto" type={wallet?.type} onClick={onSign} />
    </div>
  );
};
