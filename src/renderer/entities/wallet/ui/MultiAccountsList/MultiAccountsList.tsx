import { useI18n } from '@/app/providers';
import { type AccountId, type Chain } from '@/shared/core';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { AccountExplorers, Address } from '@/shared/ui-entities';
import { ChainTitle } from '@/entities/chain';

type Props = {
  accounts: {
    chain: Chain;
    accountId: AccountId;
  }[];
  className?: string;
  headerClassName?: string;
};

export const MultiAccountsList = ({ accounts, className, headerClassName }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col">
      <div className={cnTw('flex px-5 py-4', headerClassName)}>
        <FootnoteText className="w-[214px] text-text-tertiary">
          {t('accountList.networksColumn', { chains: accounts.length })}
        </FootnoteText>
        <FootnoteText className="w-[214px] text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
      </div>

      <ul className={cnTw('z-0 flex flex-col divide-y divide-divider overflow-y-auto overflow-x-hidden', className)}>
        {accounts.map(({ chain, accountId }) => {
          const { chainId, addressPrefix } = chain;

          return (
            <li key={chainId} className="flex items-center px-5 py-4">
              <ChainTitle className="w-[214px]" fontClass="text-text-primary" chain={chain} />

              <div className="flex w-[214px]">
                <FootnoteText className="w-[180px] text-text-secondary">
                  <Address address={toAddress(accountId, { prefix: addressPrefix })} variant="truncate" showIcon />
                </FootnoteText>
                <AccountExplorers accountId={accountId} chain={chain} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
