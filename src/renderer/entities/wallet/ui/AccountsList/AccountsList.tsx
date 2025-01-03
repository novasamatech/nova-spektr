import { TEST_IDS } from '@/shared/constants';
import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText } from '@/shared/ui';
import { AccountExplorers, Address } from '@/shared/ui-entities';
import { ChainTitle } from '@/entities/chain';

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
          const { chainId, addressPrefix } = chain;

          return (
            <li key={chainId} className="flex items-center py-2">
              <ChainTitle className="flex-1" fontClass="text-text-primary" chain={chain} />

              <div className="flex flex-1 pl-2">
                <FootnoteText className="w-[180px] text-text-secondary">
                  <Address address={toAddress(accountId, { prefix: addressPrefix })} variant="truncate" showIcon />
                </FootnoteText>
                <AccountExplorers accountId={accountId} chain={chain} testId={TEST_IDS.COMMON.INFO_BUTTON} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
