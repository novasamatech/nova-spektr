import { useState } from 'react';
import { useUnit } from 'effector-react';

import { Fee } from '@entities/transaction';
import { Button, DetailRow, FootnoteText, Icon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { SignButton } from '@entities/operation/ui/SignButton';
import { AddressWithExplorers, WalletIcon } from '@entities/wallet';
import { proxyUtils } from '@entities/proxy';
import { useNetworkData } from '@entities/network';
import { addProxyModel } from '../model/add-proxy-model';
import { walletSelectModel } from '@features/wallets';
import { Step } from '../lib/types';

export const Confirmation = () => {
  const { t } = useI18n();

  const transaction = useUnit(addProxyModel.$transaction);
  const wallet = useUnit(walletSelectModel.$walletForDetails);
  const account = useUnit(addProxyModel.$account);

  const { api, chain } = useNetworkData(transaction!.chainId);

  const [isFeeLoading, setIsFeeLoading] = useState(false);

  if (!account) return null;

  return (
    <div className="flex flex-col items-center pt-4 gap-y-4 pb-4 pl-5 pr-3">
      <div className="flex flex-col items-center gap-y-3 mb-2">
        <div className="flex items-center justify-center shrink-0 w-15 h-15 box-border rounded-full border-[2.5px] border-icon-default">
          <Icon name="proxied" size={42} />
        </div>
      </div>

      <dl className="flex flex-col gap-y-4 w-full">
        <DetailRow label={t('proxy.details.wallet')} className="flex gap-x-2">
          <WalletIcon type={wallet!.type} size={16} />
          <FootnoteText className="pr-2">{wallet!.name}</FootnoteText>
        </DetailRow>

        <DetailRow label={t('proxy.details.account')}>
          <AddressWithExplorers
            type="short"
            explorers={chain.explorers}
            addressFont="text-footnote text-inherit"
            accountId={account.accountId}
            addressPrefix={chain.addressPrefix}
            wrapperClassName="text-text-secondary"
          />
        </DetailRow>

        <hr className="border-filter-border w-full pr-2" />

        <DetailRow label={t('proxy.details.revokeAccessType')} className="pr-2">
          <FootnoteText>{t(proxyUtils.getProxyTypeName(transaction!.args.proxyType))}</FootnoteText>
        </DetailRow>

        {/*<DetailRow label={t('proxy.details.revokeFor')}>*/}
        {/*  <AddressWithExplorers*/}
        {/*    type="short"*/}
        {/*    explorers={chain.explorers}*/}
        {/*    addressFont="text-footnote text-inherit"*/}
        {/*    accountId={proxyAccount.accountId}*/}
        {/*    addressPrefix={chain.addressPrefix}*/}
        {/*    wrapperClassName="text-text-secondary"*/}
        {/*  />*/}
        {/*</DetailRow>*/}

        <hr className="border-filter-border w-full pr-2" />

        <DetailRow label={t('operation.networkFee')} className="text-text-primary pr-2">
          <Fee
            className="text-footnote text-text-primary"
            api={api}
            asset={chain.assets[0]}
            transaction={transaction!}
            onFeeLoading={setIsFeeLoading}
          />
        </DetailRow>
      </dl>

      <div className="flex w-full justify-between mt-3 pr-2">
        <Button variant="text" onClick={() => addProxyModel.events.stepChanged(Step.INIT)}>
          {t('operation.goBackButton')}
        </Button>

        <SignButton
          disabled={!isFeeLoading}
          type={wallet!.type}
          onClick={() => addProxyModel.events.stepChanged(Step.SIGN)}
        />
      </div>
    </div>
  );
};
