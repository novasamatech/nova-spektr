import { cnTw } from '@shared/lib/utils';
import { ChainTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { FootnoteText } from '@shared/ui';
import { type AccountId, type Chain } from '@shared/core';
import { AddressWithExplorers } from '@entities/wallet';

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

      <ul className={cnTw('flex flex-col z-0 divide-y divide-divider overflow-y-auto overflow-x-hidden', className)}>
        {accounts.map(({ chain, accountId }) => {
          const { chainId, addressPrefix, explorers } = chain;

          return (
            <li key={chainId} className="flex items-center px-5 py-4">
              <ChainTitle className="w-[214px]" fontClass="text-text-primary" chain={chain} />

              <div className="w-[214]">
                <AddressWithExplorers
                  type="adaptive"
                  position="right-0"
                  className="w-[160px]"
                  accountId={accountId}
                  addressPrefix={addressPrefix}
                  explorers={explorers}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
