import cnTw from '@renderer/shared/utils/twMerge';
import { Chain as ChainType } from '@renderer/domain/chain';
import { AccountId } from '@renderer/domain/shared-kernel';
import AddressWithExplorers from '../AddressWithExplorers/AddressWithExplorers';
import { useI18n } from '@renderer/context/I18nContext';
import { Chain, FootnoteText } from '@renderer/components/ui-redesign';

type Props = {
  accountId: AccountId;
  chains: ChainType[];
  className?: string;
};

const AccountsList = ({ accountId, chains, className }: Props) => {
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

export default AccountsList;
