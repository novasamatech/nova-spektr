import { cnTw } from '@renderer/shared/lib/utils';
import { Chain as ChainType } from '@renderer/entities/chain/model/chain';
import { AccountId } from '@renderer/domain/shared-kernel';
import { AddressWithExplorers } from '@renderer/entities/account';
import { useI18n } from '@renderer/app/providers';
import { Chain, FootnoteText } from '@renderer/shared/ui';

type Props = {
  accountId: AccountId;
  chains: ChainType[];
  className?: string;
};

export const AccountsList = ({ accountId, chains, className }: Props) => {
  const { t } = useI18n();

  return (
    <>
      <div className="flex mx-3 py-4">
        <FootnoteText className="w-[214px] text-text-tertiary">
          {t('accountList.networksColumn', { chains: chains.length })}
        </FootnoteText>
        <FootnoteText className="w-[214px] text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
      </div>

      <ul className={cnTw('flex flex-col z-0 divide-y divide-divider overflow-y-auto overflow-x-hidden', className)}>
        {chains.map((chain) => {
          const { chainId, addressPrefix, explorers } = chain;

          return (
            <li key={chainId} className="flex items-center mx-3 py-4">
              <Chain className="w-[214px]" fontClass="text-text-primary" chain={chain} />

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
