import { type ComponentProps, memo } from 'react';

import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Account } from '@/shared/ui-entities/Account/Account';
import { useAccountName } from '@/domains/network';

type Props = Omit<ComponentProps<typeof Account>, 'chain'> & {
  accountId: AccountId;
  chain: Chain | undefined;
  title?: string;
};

export const NamedAccount = memo((props: Props) => {
  const { accountId, chain, title, ...rest } = props;
  const resolvedName = useAccountName({ accountId, chain, title });

  return <Account {...rest} accountId={accountId} chain={chain ?? null} title={resolvedName} />;
});
