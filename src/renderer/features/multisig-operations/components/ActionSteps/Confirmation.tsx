import { type ApiPromise } from '@polkadot/api';
import { useStoreMap, useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import {
  type Account,
  type Asset,
  type Chain,
  type FlexibleMultisigAccount,
  type FlexibleMultisigTransaction,
  type MultisigAccount,
  type MultisigTransaction,
  type Transaction,
} from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { getAssetById, getAssetByTypeExtras } from '@/shared/lib/utils';
import { DetailRow, Icon } from '@/shared/ui';
import { getTransactionFromMultisigTx } from '@/entities/multisig';
import { networkModel } from '@/entities/network';
import { SignButton } from '@/entities/operations';
import { priceProviderModel } from '@/entities/price';
import { Fee, FeeLoader, MultisigDepositWithLabel, XcmFee, isXcmTransaction } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { xcmTransferModel } from '@/widgets/Transfer';
import { Details } from '../Details';

import { getIconName } from './transactionConfirmIcon';

export const confirmTransactionInfoSlot = createSlot<{
  operation: MultisigTransaction | FlexibleMultisigTransaction;
}>();

type Props = {
  tx: MultisigTransaction | FlexibleMultisigTransaction;
  account: MultisigAccount | FlexibleMultisigAccount;
  signAccount?: Account;
  chain: Chain;
  api: ApiPromise;
  feeTx?: Transaction | null;
  onSign: () => void;
};
export const Confirmation = ({ api, tx, account, chain, signAccount, feeTx, onSign }: Props) => {
  const { t } = useI18n();
  const [isFeeLoaded, setIsFeeLoaded] = useState(false);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  const wallets = useUnit(walletModel.$wallets);
  const signerWallet = walletUtils.getWalletFilteredAccounts(wallets, {
    walletFn: walletUtils.isValidSignatory,
    accountFn: acc => signAccount?.accountId === acc.accountId,
  });

  const xcmConfig = useUnit(xcmTransferModel.$config);
  const transaction = getTransactionFromMultisigTx(tx);
  let asset: Asset | null = null;
  if (transaction) {
    if (transaction.args.assetId) {
      asset = getAssetByTypeExtras(api, chain.assets, transaction.args.assetId) ?? chain.assets[0];
    } else {
      asset = getAssetById(transaction.args.asset, chain.assets) ?? chain.assets[0];
    }
  }

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
    if (asset) {
      xcmTransferModel.events.xcmStarted({ chain, asset });
    }
  }, [chain, asset]);

  return (
    <div className="flex flex-col items-center gap-y-3 px-5 pb-4">
      <div className="mb-6 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name={getIconName(transaction)} size={60} />

        {transaction && <Slot id={confirmTransactionInfoSlot} props={{ operation: tx }} />}
      </div>

      <Details api={api} tx={tx} account={account} chain={chain} signatory={signAccount} />
      {signAccount && api && (
        <MultisigDepositWithLabel
          api={api}
          asset={chain.assets[0]}
          className="text-footnote"
          threshold={(account as MultisigAccount).threshold}
        />
      )}

      <DetailRow label={t('operation.networkFee')} className="text-text-primary">
        {api && feeTx ? (
          <Fee
            className="text-footnote"
            api={api}
            asset={chain.assets[0]}
            transaction={feeTx}
            onFeeChange={fee => setIsFeeLoaded(Boolean(fee))}
          />
        ) : (
          <FeeLoader fiatFlag={!!fiatFlag} />
        )}
      </DetailRow>

      {isXcmTransaction(transaction) && xcmConfig && xcmApi && asset && (
        <DetailRow label={t('operation.xcmFee')} className="text-text-primary">
          <XcmFee api={xcmApi} transaction={transaction} asset={asset} config={xcmConfig} />
        </DetailRow>
      )}

      <SignButton disabled={!isFeeLoaded} className="ml-auto mt-3" type={signerWallet?.type} onClick={onSign} />
    </div>
  );
};
