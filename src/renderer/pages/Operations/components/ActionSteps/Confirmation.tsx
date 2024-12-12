import { useStoreMap, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { type Account, type MultisigAccount, type MultisigTransaction, type Transaction } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getAssetById } from '@/shared/lib/utils';
import { DetailRow, Icon } from '@/shared/ui';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { type ExtendedChain, networkModel } from '@/entities/network';
import { SignButton } from '@/entities/operations';
import { priceProviderModel } from '@/entities/price';
import {
  Fee,
  FeeLoader,
  MultisigDepositWithLabel,
  XcmFee,
  getIconName,
  isXcmTransaction,
} from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { xcmTransferModel } from '@/widgets/Transfer';
import { TransactionAmount } from '@/pages/Operations/components/TransactionAmount';
import { Details } from '../Details';

type Props = {
  tx: MultisigTransaction;
  account: MultisigAccount;
  signAccount?: Account;
  chainConnection: ExtendedChain;
  feeTx?: Transaction;
  onSign: () => void;
};
export const Confirmation = ({ tx, account, chainConnection, signAccount, feeTx, onSign }: Props) => {
  const { t } = useI18n();
  const [isFeeLoaded, setIsFeeLoaded] = useState(false);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const wallets = useUnit(walletModel.$wallets);
  const signerWallet = walletUtils.getWalletFilteredAccounts(wallets, {
    walletFn: walletUtils.isValidSignatory,
    accountFn: (acc) => signAccount?.accountId === acc.accountId,
  });

  const xcmConfig = useUnit(xcmTransferModel.$config);
  const asset = getAssetById(tx.transaction?.args.assetId, chainConnection.assets) || chainConnection.assets[0];

  const transaction = getTransactionFromMultisigTx(tx);

  const xcmApi = useStoreMap({
    store: networkModel.$apis,
    keys: [transaction],
    fn: (apis, [transaction]) => {
      if (transaction && isXcmTransaction(transaction)) {
        return apis[transaction.args.destinationChain] ?? null;
      }

      return null;
    },
  });

  useEffect(() => {
    xcmTransferModel.events.xcmConfigLoaded();
  }, []);

  return (
    <div className="flex flex-col items-center gap-y-3 px-5 pb-4">
      <div className="mb-6 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name={getIconName(tx.transaction)} size={60} />

        {tx.transaction && <TransactionAmount tx={tx.transaction} />}
      </div>

      <Details tx={tx} account={account} extendedChain={chainConnection} signatory={signAccount} />
      {signAccount && chainConnection?.api && (
        <MultisigDepositWithLabel
          api={chainConnection.api}
          asset={chainConnection.assets[0]}
          className="text-footnote"
          threshold={(account as MultisigAccount).threshold}
        />
      )}

      <DetailRow label={t('operation.networkFee')} className="text-text-primary">
        {chainConnection?.api && feeTx ? (
          <Fee
            className="text-footnote"
            api={chainConnection.api}
            asset={chainConnection.assets[0]}
            transaction={feeTx}
            onFeeChange={(fee) => setIsFeeLoaded(Boolean(fee))}
          />
        ) : (
          <FeeLoader fiatFlag={!!fiatFlag} />
        )}
      </DetailRow>

      {isXcmTransaction(transaction) && xcmConfig && xcmApi && (
        <DetailRow label={t('operation.xcmFee')} className="text-text-primary">
          <XcmFee api={xcmApi} transaction={transaction} asset={asset} config={xcmConfig} />
        </DetailRow>
      )}

      <SignButton disabled={!isFeeLoaded} className="ml-auto mt-3" type={signerWallet?.type} onClick={onSign} />
    </div>
  );
};
