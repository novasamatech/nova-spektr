import { useState } from 'react';
import { useUnit } from 'effector-react';

import { Transaction, DepositWithLabel, Fee, XcmTypes } from '@renderer/entities/transaction';
import { TransactionAmount } from '@renderer/pages/Operations/components/TransactionAmount';
import { Button, DetailRow, FootnoteText, Icon } from '@renderer/shared/ui';
import { ExtendedChain } from '@renderer/entities/network';
import { useI18n } from '@renderer/app/providers';
import { XcmFee } from '@renderer/entities/transaction/ui/XcmFee/XcmFee';
import { AssetXCM, XcmConfig } from '@renderer/shared/api/xcm';
import type { Account, MultisigAccount } from '@renderer/shared/core';
import Details from '../Details';
import { walletModel } from '@renderer/entities/wallet';

const AmountFontStyle = 'font-manrope text-text-primary text-[32px] leading-[36px] font-bold';

type Props = {
  transaction: Transaction;
  account: Account | MultisigAccount;
  signatory?: Account;
  description?: string;
  connection: ExtendedChain;
  config?: XcmConfig;
  xcmAsset?: AssetXCM;
  onResult?: () => void;
  onBack?: () => void;
};

export const Confirmation = ({
  account,
  connection,
  transaction,
  signatory,
  description,
  config,
  xcmAsset,
  onResult,
  onBack,
}: Props) => {
  const { t } = useI18n();

  const activeWallet = useUnit(walletModel.$activeWallet);

  const [feeLoaded, setFeeLoaded] = useState(false);

  const isXcmTransfer = XcmTypes.includes(transaction?.type);
  const asset = xcmAsset && connection.assets.find((a) => a.assetId === xcmAsset.assetId);

  return (
    <div className="flex flex-col items-center pt-4 gap-y-3">
      {isXcmTransfer && (
        <div className="flex items-center justify-center shrink-0 w-15 h-15 box-border rounded-full border-[2.5px] border-icon-default">
          <Icon name="crossChain" size={42} />
        </div>
      )}

      {transaction && <TransactionAmount tx={transaction} showIcon={false} className={AmountFontStyle} />}

      {description && (
        <FootnoteText className="py-2 px-3 rounded bg-block-background ml-3 text-text-secondary">
          {description}
        </FootnoteText>
      )}

      <Details
        transaction={transaction}
        account={account}
        wallet={activeWallet}
        signatory={signatory}
        connection={connection}
        withAdvanced={false}
      />

      <hr className="border-divider my-1 w-full" />

      <DetailRow label={t('operation.networkFee')} className="text-text-primary">
        {connection.api && transaction && (
          <Fee
            className="text-footnote text-text-primary"
            api={connection.api}
            asset={connection.assets[0]}
            transaction={transaction}
            onFeeChange={(fee) => setFeeLoaded(Boolean(fee))}
          />
        )}
      </DetailRow>

      {isXcmTransfer && config && asset && (
        <DetailRow label={t('operation.xcmFee')} className="text-text-primary">
          {config && connection.api && (
            <XcmFee api={connection.api} transaction={transaction} asset={asset} config={config} />
          )}
        </DetailRow>
      )}

      {signatory && connection.api && (
        <DepositWithLabel
          api={connection.api}
          asset={connection.assets[0]}
          threshold={(account as MultisigAccount).threshold}
        />
      )}

      <div className="flex w-full justify-between mt-5">
        <Button variant="text" onClick={onBack}>
          {t('operation.goBackButton')}
        </Button>

        <Button disabled={!feeLoaded} prefixElement={<Icon name="vault" size={14} />} onClick={onResult}>
          {t('operation.signButton')}
        </Button>
      </div>
    </div>
  );
};
