import { useUnit } from 'effector-react';

import { toAddress } from '@/shared/lib/utils';
import { Address } from '@/shared/ui-entities';
import { Select } from '@/shared/ui-kit';
import { accountService } from '@/domains/network';
import { accountsStructureModel } from '../model/accountsStructureModel';

export const AccountSelector = () => {
  const selectedAccount = useUnit(accountsStructureModel.$selectedAccount);
  const chains = useUnit(accountsStructureModel.$allChainsMap);
  const availableAccounts = useUnit(accountsStructureModel.$availableAccounts);

  return (
    <Select
      value={selectedAccount?.id ?? null}
      placeholder="Select account"
      onChange={(id) => {
        const account = availableAccounts?.find((a) => a.id === id);
        if (account) {
          accountsStructureModel.selectAccount(account);
        }
      }}
    >
      {availableAccounts?.map((account) => {
        const chain = accountService.isChainAccount(account) ? chains.get(account.chainId) : undefined;
        return (
          <Select.Item key={account.id} value={account.id}>
            <Address
              showIcon
              variant="short"
              iconSize={20}
              title={chain?.name}
              address={toAddress(account.accountId, { prefix: chain?.addressPrefix })}
            />
          </Select.Item>
        );
      })}
    </Select>
  );
};
