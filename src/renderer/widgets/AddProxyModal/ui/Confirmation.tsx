import { useState } from 'react';
import { useUnit } from 'effector-react';

import { FeeWithLabel, ProxyDepositWithLabel, MultisigDepositWithLabel } from '@entities/transaction';
import { Button, DetailRow, FootnoteText, Icon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { SignButton } from '@entities/operation/ui/SignButton';
import { AddressWithExplorers, WalletIcon, accountUtils, ExplorersPopover, WalletCardSm } from '@entities/wallet';
import { proxyUtils } from '@entities/proxy';
import { confirmModel } from '../model/confirm-model';

type Props = {
  onGoBack: () => void;
};

export const Confirmation = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const store = useUnit(confirmModel.$confirmStore);
  const initiatorWallet = useUnit(confirmModel.$initiatorWallet);
  const signerWallet = useUnit(confirmModel.$signerWallet);
  const api = useUnit(confirmModel.$api);

  if (!store || !api || !initiatorWallet) return null;

  const [isFeeLoading, setIsFeeLoading] = useState(true);

  return (
    <div className="flex flex-col items-center pt-4 gap-y-4 pb-4 px-5">
      <div className="flex flex-col items-center gap-y-3 mb-2">
        <Icon name="proxyConfirm" size={60} />

        <FootnoteText className="py-2 px-3 rounded bg-block-background ml-3 text-text-secondary">
          {store.description}
        </FootnoteText>
      </div>

      <dl className="flex flex-col gap-y-4 w-full">
        <DetailRow label={t('proxy.details.wallet')} className="flex gap-x-2">
          <WalletIcon type={initiatorWallet.type} size={16} />
          <FootnoteText className="pr-2">{initiatorWallet.name}</FootnoteText>
        </DetailRow>

        <DetailRow label={t('proxy.details.account')}>
          <AddressWithExplorers
            type="short"
            explorers={store.chain.explorers}
            addressFont="text-footnote text-inherit"
            accountId={store.account.accountId}
            addressPrefix={store.chain.addressPrefix}
            wrapperClassName="text-text-secondary"
          />
        </DetailRow>

        {signerWallet && store.signatory && (
          <DetailRow label={t('proxy.details.signatory')}>
            <ExplorersPopover
              button={<WalletCardSm wallet={signerWallet} />}
              address={store.signatory.accountId}
              explorers={store.chain.explorers}
              addressPrefix={store.chain.addressPrefix}
            />
          </DetailRow>
        )}

        <hr className="border-filter-border w-full pr-2" />

        <DetailRow label={t('proxy.details.grantAccessType')} className="pr-2">
          <FootnoteText>{t(proxyUtils.getProxyTypeName(store.transaction.args.proxyType))}</FootnoteText>
        </DetailRow>

        <DetailRow label={t('proxy.details.delegateTo')}>
          <AddressWithExplorers
            type="short"
            explorers={store.chain.explorers}
            addressFont="text-footnote text-inherit"
            address={store.transaction.args.delegate}
            wrapperClassName="text-text-secondary"
          />
        </DetailRow>

        <hr className="border-filter-border w-full pr-2" />

        <ProxyDepositWithLabel api={api} asset={store.chain.assets[0]} />

        {accountUtils.isMultisigAccount(store.account) && (
          <MultisigDepositWithLabel api={api} asset={store.chain.assets[0]} threshold={store.account.threshold} />
        )}

        <FeeWithLabel
          api={api}
          asset={store.chain.assets[0]}
          transaction={store.transaction}
          onFeeLoading={setIsFeeLoading}
        />
      </dl>

      <div className="flex w-full justify-between mt-3">
        <Button variant="text" onClick={onGoBack}>
          {t('operation.goBackButton')}
        </Button>

        <SignButton
          disabled={isFeeLoading}
          type={(signerWallet || initiatorWallet).type}
          onClick={() => confirmModel.output.formSubmitted}
        />
      </div>
    </div>
  );
};
