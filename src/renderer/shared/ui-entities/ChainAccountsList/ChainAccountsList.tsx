import { memo } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText } from '@/shared/ui';
import { ScrollArea } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { Account } from '../Account/Account';

type Props = {
  accounts: (readonly [chain: Chain, accountId: AccountId])[];
};

export const ChainAccountsList = memo(({ accounts }: Props) => {
  const { t } = useI18n();
  const { list } = useDeferredList({ list: accounts });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 px-5 py-2">
        <FootnoteText className="flex-1 text-text-tertiary">
          {t('accountList.networksColumn', { count: accounts.length })}
        </FootnoteText>
        <FootnoteText className="flex-1 text-text-tertiary">{t('accountList.addressColumn')}</FootnoteText>
      </div>

      <ScrollArea>
        <ul className="flex flex-col divide-y divide-divider px-5 pb-3">
          {list.map(([chain, accountId]) => {
            return <ListItem key={chain.chainId} chain={chain} accountId={accountId} />;
          })}
        </ul>
      </ScrollArea>
    </div>
  );
});

const ListItem = memo(({ chain, accountId }: { chain: Chain; accountId: AccountId }) => {
  return (
    <li className="flex min-w-0 items-center gap-1 py-2 text-footnote">
      <div className="flex-1 basis-1/2">
        <ChainTitle fontClass="text-text-primary" chain={chain} />
      </div>
      <div className="flex min-w-0 flex-1 basis-1/2 text-text-secondary">
        <Account accountId={accountId} chain={chain} explorersTestId={TEST_IDS.COMMON.INFO_BUTTON} />
      </div>
    </li>
  );
});
