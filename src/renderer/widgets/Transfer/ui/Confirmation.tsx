import { useState } from 'react';
import { useUnit } from 'effector-react';

import { Button, DetailRow, FootnoteText, Icon } from '@shared/ui';
import { useI18n } from '@app/providers';
import { SignButton } from '@entities/operation/ui/SignButton';
import { AddressWithExplorers, WalletIcon, ExplorersPopover, WalletCardSm, accountUtils } from '@entities/wallet';
import { cnTw } from '@shared/lib/utils';
import { AssetBalance } from '@entities/asset';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { MultisigDepositWithLabel, FeeWithLabel } from '@entities/transaction';
import { confirmModel } from '../model/confirm-model';

type Props = {
  onGoBack: () => void;
};

export const Confirmation = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const confirmStore = useUnit(confirmModel.$confirmStore);
  const transaction = useUnit(confirmModel.$transaction);
  const initiatorWallet = useUnit(confirmModel.$initiatorWallet);
  const signerWallet = useUnit(confirmModel.$signerWallet);
  const api = useUnit(confirmModel.$api);

  if (!confirmStore || !transaction || !api || !initiatorWallet) return null;

  const [isFeeLoading, setIsFeeLoading] = useState(true);

  return (
    <div className="flex flex-col items-center pt-4 gap-y-4 pb-4 px-5">
      <div className="flex flex-col items-center gap-y-3 mb-2">
        <Icon name="transferConfirm" size={60} />
        {/*<Icon className="text-icon-default" name={isXcmTransfer ? 'crossChainConfirm' : 'transferConfirm'} size={60} />*/}

        <div className={cnTw('flex flex-col gap-y-1 items-center')}>
          <AssetBalance
            value={confirmStore.amount}
            asset={confirmStore.asset}
            className="font-manrope text-text-primary text-[32px] leading-[36px] font-bold"
          />
          <AssetFiatBalance asset={confirmStore.asset} amount={confirmStore.amount} className="text-headline" />
        </div>

        <FootnoteText className="py-2 px-3 rounded bg-block-background ml-3 text-text-secondary">
          {confirmStore.description}
        </FootnoteText>
      </div>

      <dl className="flex flex-col gap-y-4 w-full">
        {/*<div>PROXY section</div>*/}

        {/*<hr className="border-filter-border w-full pr-2" />*/}

        <DetailRow label={t('proxy.details.wallet')} className="flex gap-x-2">
          <WalletIcon type={initiatorWallet.type} size={16} />
          <FootnoteText className="pr-2">{initiatorWallet.name}</FootnoteText>
        </DetailRow>

        <DetailRow label={t('proxy.details.account')}>
          <AddressWithExplorers
            type="short"
            explorers={confirmStore.chain.explorers}
            addressFont="text-footnote text-inherit"
            accountId={confirmStore.account.accountId}
            addressPrefix={confirmStore.chain.addressPrefix}
            wrapperClassName="text-text-secondary"
          />
        </DetailRow>

        {signerWallet && confirmStore.signatory && (
          <DetailRow label={t('proxy.details.signatory')}>
            <ExplorersPopover
              button={<WalletCardSm wallet={signerWallet} />}
              address={confirmStore.signatory.accountId}
              explorers={confirmStore.chain.explorers}
              addressPrefix={confirmStore.chain.addressPrefix}
            />
          </DetailRow>
        )}

        <hr className="border-filter-border w-full pr-2" />

        {/*<div>XCM section</div>*/}
        {/*{transaction?.args.destinationChain && (*/}
        {/*  <DetailRow label={t('operation.details.destinationChain')}>*/}
        {/*    <ChainTitle*/}
        {/*      chainId={transaction.args.destinationChain}*/}
        {/*      fontClass="text-text-primary text-footnote"*/}
        {/*      className="px-2"*/}
        {/*    />*/}
        {/*  </DetailRow>*/}
        {/*)}*/}

        <DetailRow label={t('operation.details.recipient')}>
          <AddressWithExplorers
            type="short"
            explorers={confirmStore.chain.explorers}
            addressFont="text-footnote text-inherit"
            address={transaction.args.dest}
            addressPrefix={confirmStore.chain.addressPrefix}
            wrapperClassName="text-text-secondary"
          />
        </DetailRow>

        <hr className="border-filter-border w-full pr-2" />

        {accountUtils.isMultisigAccount(confirmStore.account) && (
          <MultisigDepositWithLabel
            api={api}
            asset={confirmStore.chain.assets[0]}
            threshold={confirmStore.account.threshold}
          />
        )}

        <FeeWithLabel
          api={api}
          asset={confirmStore.chain.assets[0]}
          transaction={transaction}
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
          onClick={confirmModel.output.formSubmitted}
        />
      </div>
    </div>
  );
};
