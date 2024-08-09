import { type PropsWithChildren } from 'react';

import { useI18n } from '@app/providers';
import { DetailRow, FootnoteText } from '@shared/ui';
import { AddressWithExplorers, ExplorersPopover, WalletCardSm, WalletIcon } from '@entities/wallet';
import { type ConfirmItem } from '../lib/createTransactionConfirmStore';

type Props = PropsWithChildren<{
  confirm: ConfirmItem;
}>;

export const ConfirmDetails = ({ confirm, children }: Props) => {
  const { t } = useI18n();
  const { meta, wallets } = confirm;

  return (
    <dl className="flex flex-col gap-y-4 w-full">
      {wallets.proxied && meta.proxiedAccount && (
        <>
          <DetailRow label={t('transfer.senderProxiedWallet')} className="flex gap-x-2">
            <WalletIcon type={wallets.proxied.type} size={16} />
            <FootnoteText className="pr-2">{wallets.proxied.name}</FootnoteText>
          </DetailRow>

          <DetailRow label={t('transfer.senderProxiedAccount')}>
            <AddressWithExplorers
              type="short"
              explorers={meta.chain.explorers}
              addressFont="text-footnote text-inherit"
              accountId={meta.proxiedAccount.accountId}
              addressPrefix={meta.chain.addressPrefix}
              wrapperClassName="text-text-secondary"
            />
          </DetailRow>

          <hr className="border-filter-border w-full pr-2" />

          {wallets.initiator && (
            <DetailRow label={t('transfer.signingWallet')} className="flex gap-x-2">
              <WalletIcon type={wallets.initiator.type} size={16} />
              <FootnoteText className="pr-2">{wallets.initiator.name}</FootnoteText>
            </DetailRow>
          )}

          <DetailRow label={t('transfer.signingAccount')}>
            <AddressWithExplorers
              type="short"
              explorers={meta.chain.explorers}
              addressFont="text-footnote text-inherit"
              accountId={meta.proxiedAccount.proxiedAccountId}
              addressPrefix={meta.chain.addressPrefix}
              wrapperClassName="text-text-secondary"
            />
          </DetailRow>
        </>
      )}

      {!wallets.proxied && (
        <>
          {wallets.initiator && (
            <DetailRow label={t('proxy.details.wallet')} className="flex gap-x-2">
              <WalletIcon type={wallets.initiator.type} size={16} />
              <FootnoteText className="pr-2">{wallets.initiator.name}</FootnoteText>
            </DetailRow>
          )}

          <DetailRow label={t('proxy.details.sender')}>
            <AddressWithExplorers
              type="short"
              explorers={meta.chain.explorers}
              addressFont="text-footnote text-inherit"
              accountId={meta.account.accountId}
              addressPrefix={meta.chain.addressPrefix}
              wrapperClassName="text-text-secondary"
            />
          </DetailRow>
        </>
      )}

      {wallets.signer && meta.signatory && (
        <DetailRow label={t('proxy.details.signatory')}>
          <ExplorersPopover
            button={<WalletCardSm wallet={wallets.signer} />}
            address={meta.signatory.accountId}
            explorers={meta.chain.explorers}
            addressPrefix={meta.chain.addressPrefix}
          />
        </DetailRow>
      )}

      {children}
    </dl>
  );
};
