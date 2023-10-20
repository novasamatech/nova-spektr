import { cnTw } from '@renderer/shared/lib/utils';
import { ChainTitle } from '@renderer/entities/chain';
import { useI18n } from '@renderer/app/providers';
import { FootnoteText } from '@renderer/shared/ui';
import { AccountId, Chain } from '@renderer/shared/core';
import { AddressWithExplorers } from '@renderer/entities/wallet';

type Props = {
  accounts: {
    chain: Chain;
    accountId: AccountId;
  }[];
  className?: string;
};

export const MultiAccountsList = ({ accounts, className }: Props) => {
  const { t } = useI18n();

  return (
    <>
      <div className="flex mx-3 py-4">
        <FootnoteText className="w-[214px] text-text-tertiary">
          {t('accountList.networksColumn', { chains: accounts.length })}
        </FootnoteText>
        <FootnoteText className="w-[214px] text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
      </div>

      <ul className={cnTw('flex flex-col z-0 divide-y divide-divider overflow-y-auto overflow-x-hidden', className)}>
        {accounts.map(({ chain, accountId }) => {
          const { chainId, addressPrefix, explorers } = chain;

          return (
            <li key={chainId} className="flex items-center mx-3 py-4">
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
    </>
  );
};
