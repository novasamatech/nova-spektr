import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import {
  MultisigTransaction,
  Transaction,
  Fee,
  DepositWithLabel,
  isXcmTransaction,
  XcmFee,
} from '@entities/transaction';
import { TransactionAmount } from '@pages/Operations/components/TransactionAmount';
import { DetailRow, FootnoteText, Icon } from '@shared/ui';
import { ExtendedChain } from '@entities/network';
import { useI18n } from '@app/providers';
import { getIconName } from '../../common/utils';
import { type Account, type MultisigAccount, WalletType } from '@shared/core';
import Details from '../Details';
import { getAssetById } from '@shared/lib/utils';
import { getTransactionFromMultisigTx } from '@entities/multisig';
import { sendAssetModel } from '@widgets/SendAssetModal';
import { SignButton } from '@entities/operation/ui/SignButton';
import { walletModel } from '@entities/wallet';

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

  const activeWallet = useUnit(walletModel.$activeWallet);
  const xcmConfig = useUnit(sendAssetModel.$finalConfig);
  const asset = getAssetById(tx.transaction?.args.assetId, connection.assets) || connection.assets[0];

  const iconName = getIconName(tx.transaction);
  const transaction = getTransactionFromMultisigTx(tx);

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

      {isXcmTransaction(transaction) && xcmConfig && connection.api && (
        <DetailRow label={t('operation.xcmFee')} className="text-text-primary pr-2">
          <XcmFee api={connection.api} transaction={transaction} asset={asset} config={xcmConfig} />
        </DetailRow>
      )}

      <SignButton
        disabled={!isFeeLoaded}
        className="mt-3 ml-auto"
        type={activeWallet?.type || WalletType.SINGLE_PARITY_SIGNER}
        onClick={onSign}
      />
    </div>
  );
};
