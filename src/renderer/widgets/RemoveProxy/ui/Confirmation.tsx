import { useState } from 'react';

import { Fee, Transaction } from '@entities/transaction';
import { Button, DetailRow, FootnoteText, Icon } from '@shared/ui';
import { ExtendedChain } from '@entities/network';
import { useI18n } from '@app/providers';
import { SignButton } from '@entities/operation/ui/SignButton';
import { Account, ProxyAccount, Wallet } from '@shared/core';
import { AddressWithExplorers, WalletIcon } from '@entities/wallet';
import { proxyUtils } from '@entities/proxy';

type Props = {
  transaction: Transaction;
  proxyAccount: ProxyAccount;
  proxiedAccount: Account | null;
  proxiedWallet: Wallet | null;
  connection: ExtendedChain;
  onResult?: () => void;
  onBack?: () => void;
};

export const Confirmation = ({
  proxyAccount,
  proxiedAccount,
  proxiedWallet,
  connection,
  transaction,
  onResult,
  onBack,
}: Props) => {
  const { t } = useI18n();

  const [feeLoaded, setFeeLoaded] = useState(false);

  const { addressPrefix, explorers } = connection;

  if (!proxiedWallet || !proxiedAccount) return null;

  return (
    <div className="flex flex-col items-center pt-4 gap-y-4 pb-4 pl-5 pr-3">
      <div className="flex flex-col items-center gap-y-3 mb-2">
        <div className="flex items-center justify-center shrink-0 w-15 h-15 box-border rounded-full border-[2.5px] border-icon-default">
          <Icon name="proxied" size={42} />
        </div>
      </div>

      <dl className="flex flex-col gap-y-4 w-full">
        <DetailRow label={t('proxy.details.wallet')} className="flex gap-x-2">
          <WalletIcon type={proxiedWallet.type} size={16} />
          <FootnoteText className="pr-2">{proxiedWallet.name}</FootnoteText>
        </DetailRow>

        <DetailRow label={t('proxy.details.account')}>
          <AddressWithExplorers
            type="short"
            explorers={explorers}
            addressFont="text-footnote text-inherit"
            accountId={proxiedAccount.accountId}
            addressPrefix={addressPrefix}
            wrapperClassName="text-text-secondary"
          />
        </DetailRow>

        <hr className="border-filter-border w-full pr-2" />

        <DetailRow label={t('proxy.details.revokeAccessType')} className="pr-2">
          <FootnoteText>{t(proxyUtils.getProxyTypeName(proxyAccount.proxyType))}</FootnoteText>
        </DetailRow>

        <DetailRow label={t('proxy.details.revokeFor')}>
          <AddressWithExplorers
            type="short"
            explorers={explorers}
            addressFont="text-footnote text-inherit"
            accountId={proxyAccount.accountId}
            addressPrefix={addressPrefix}
            wrapperClassName="text-text-secondary"
          />
        </DetailRow>

        <hr className="border-filter-border w-full pr-2" />

        <DetailRow label={t('operation.networkFee')} className="text-text-primary pr-2">
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
      </dl>

      <div className="flex w-full justify-between mt-3 pr-2">
        <Button variant="text" onClick={onBack}>
          {t('operation.goBackButton')}
        </Button>

        <SignButton disabled={!feeLoaded} type={proxiedWallet.type} onClick={onResult} />
      </div>
    </div>
  );
};
