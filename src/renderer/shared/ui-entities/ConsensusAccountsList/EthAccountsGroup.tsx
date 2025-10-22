import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui/Icon/Icon';
import { FootnoteText } from '@/shared/ui/Typography';
import { Account } from '../Account/Account';

import { Collapsible } from './Collapsible';
import { ListItem } from './ListItem';
import { type ChainAccountPair } from './types';

type EthAccountsGroupProps = {
  chains: ChainAccountPair[];
  bgColor?: string;
};
export const EthAccountsGroup = memo<EthAccountsGroupProps>(({ chains, bgColor }) => {
  const { t } = useI18n();

  if (chains.length === 0) return null;

  const [chain, accountId] = chains[0]!;

  return (
    <Collapsible>
      <Collapsible.Trigger sticky bgColor={bgColor}>
        <div className="grid w-full min-w-0 grid-cols-[calc(50%-16px)_1fr] items-center gap-2 py-4 pr-2 text-footnote">
          <div className="flex items-center gap-x-2">
            <Icon name="ethereum" size={16} />
            <FootnoteText as="span" className="text-text-primary">
              {t('walletDetails.vault.evmGroup')}
            </FootnoteText>
          </div>
          <div className="min-w-0 text-text-secondary">
            <Account variant="truncate" accountId={accountId} chain={chain} />
          </div>
        </div>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <div className="divide-y divide-divider pl-6">
          {chains.map(([chain, accountId]) => (
            <ListItem key={chain.chainId} chain={chain} accountId={accountId} />
          ))}
        </div>
      </Collapsible.Content>
    </Collapsible>
  );
});
EthAccountsGroup.displayName = 'EthAccountsGroup';
