import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { useDeferredValue, useMemo, useState } from 'react';

import { type Asset, type Chain, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useDeferredList } from '@/shared/lib/hooks';
import { performSearch, toAddress } from '@/shared/lib/utils';
import { BodyText, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { Box, Label, ScrollArea, SearchInput, Skeleton } from '@/shared/ui-kit';
import { EmptyAssetsState } from '@/entities/asset';
import { accountUtils } from '@/entities/wallet';
import { NamedAccount } from '@/widgets/NameResolver';
import { receiveModel } from '../model/receive-model';

type Props = {
  chain: Chain;
  asset: Asset;
};

type AccountsWithBalance =
  | (VaultChainAccount & {
      balance?: BN;
    })
  | (VaultShardAccount & {
      balance?: BN;
    })[];

export const SelectAccount = ({ asset, chain }: Props) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const chainAccounts = useUnit(receiveModel.$chainAccounts);

  const deferredQuery = useDeferredValue(query);
  const { list, isLoading } = useDeferredList({ list: chainAccounts });

  const filteredAccounts = useMemo(() => {
    return performSearch({
      query: deferredQuery,
      records: list,
      getMeta: (account) => ({
        address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
        name: account.name,
      }),
      weights: {
        name: 1,
        address: 0.5,
      },
    });
  }, [list, chain, deferredQuery]);

  const accountsGroup: AccountsWithBalance[] = useMemo(
    () => accountUtils.getAccountsAndShardGroups(filteredAccounts),
    [filteredAccounts],
  );

  return (
    <>
      <Box shrink={0} padding={[3, 5, 0]}>
        <SearchInput value={query} placeholder={t('balances.searchPlaceholder')} onChange={setQuery} />
      </Box>
      <FootnoteText className="px-5 pt-4 text-text-tertiary">{t('receive.selectAccount')}</FootnoteText>
      <ScrollArea>
        <ul className="h-[590px] p-5 pt-2 text-text-secondary">
          <Skeleton fullWidth active={isLoading}>
            {accountsGroup.map((account) =>
              accountUtils.isAccountWithShards(account) ? (
                <ShardAccounts accounts={account} chain={chain} asset={asset} key={account.at(0)?.groupId} />
              ) : (
                <button
                  className="flex w-full appearance-none flex-col px-3 py-2 hover:bg-action-background-hover"
                  key={account.accountId}
                  onClick={() => receiveModel.selectAccount(account)}
                >
                  <Box direction="row" gap={6} verticalAlign="center">
                    <NamedAccount accountId={account.accountId} chain={chain} iconSize={20} />
                    <AssetBalance value={account.balance} asset={asset} className="whitespace-nowrap text-inherit" />
                  </Box>
                </button>
              ),
            )}
            <EmptyAssetsState size={64} />
          </Skeleton>
        </ul>
      </ScrollArea>
    </>
  );
};

type ShardAccountsProps = {
  accounts: (VaultShardAccount & { balance?: BN })[];
  chain: Chain;
  asset: Asset;
};

const ShardAccounts = ({ accounts, chain, asset }: ShardAccountsProps) => {
  const groupValue = accounts.reduce((acc, shard) => acc.add(shard.balance || new BN(0)), new BN(0));

  return (
    <>
      <Box direction="row" verticalAlign="center" gap={2} margin={[0, 3]}>
        <Label variant="gray">{accounts.length}</Label>
        <BodyText className="my-2 text-text-secondary">{accounts.at(0)?.name || ''}</BodyText>
        <AssetBalance value={groupValue} asset={asset} className="ml-auto whitespace-nowrap text-inherit" />
      </Box>
      <ul className="text-text-secondary">
        {accounts.map((account) => (
          <button
            className="flex w-full appearance-none flex-col py-2 pr-3 pl-10 hover:bg-action-background-hover"
            key={account.accountId}
            onClick={() => receiveModel.selectAccount(account)}
          >
            <Box direction="row" gap={6} verticalAlign="center">
              <NamedAccount accountId={account.accountId} chain={chain} iconSize={20} />
              <AssetBalance value={account.balance} asset={asset} className="whitespace-nowrap text-inherit" />
            </Box>
          </button>
        ))}
      </ul>
    </>
  );
};
