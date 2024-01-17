import { cnTw } from '@shared/lib/utils';
import { ChainTitle } from '@entities/chain';
import { AddressWithExplorers } from '@entities/wallet';
import { useI18n } from '@app/providers';
import { FootnoteText } from '@shared/ui';
import type { AccountId, Chain } from '@shared/core';

type Props = {
  accountId: AccountId;
  chains: Chain[];
  className?: string;
};

export const AccountsList = ({ accountId, chains, className }: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col">
      <div className="flex items-center px-5 pb-2">
        <FootnoteText className="flex-1 text-text-tertiary">
          {t('accountList.networksColumn', { chains: chains.length })}
        </FootnoteText>
        <FootnoteText className="flex-1 px-2 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
      </div>

      <ul className={cnTw('flex flex-col px-5 divide-y divide-divider overflow-y-auto overflow-x-hidden', className)}>
        {chains.map((chain) => {
          const { chainId, addressPrefix, explorers } = chain;

          return (
            <li key={chainId} className="flex items-center py-2">
              <ChainTitle className="flex-1" fontClass="text-text-primary" chain={chain} />

              <div className="flex-1 pl-2">
                <AddressWithExplorers
                  type="adaptive"
                  position="right-0"
                  className="w-[166px]"
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
