import { useI18n } from '@app/providers';
import { type AccountId, type Chain } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { FootnoteText } from '@shared/ui';
import { ChainTitle } from '@entities/chain';
import { AddressWithExplorers } from '@entities/wallet';

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

      <ul className={cnTw('flex flex-col divide-y divide-divider overflow-y-auto overflow-x-hidden px-5', className)}>
        {chains.map((chain) => {
          const { chainId, addressPrefix, explorers } = chain;

          return (
            <li key={chainId} className="flex items-center py-2">
              <ChainTitle className="flex-1" fontClass="text-text-primary" chain={chain} />

              <div className="flex-1 pl-2">
                <AddressWithExplorers
                  type="adaptive"
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
