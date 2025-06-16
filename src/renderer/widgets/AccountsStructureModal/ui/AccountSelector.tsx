import { useUnit } from 'effector-react';

import { toAddress } from '@/shared/lib/utils';
import { Address } from '@/shared/ui-entities';
import { Select } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { accountsStructureModel } from '../model/accountsStructureModel';

type AccountSelector = {
  walletAccounts: AnyAccount[];
};

export const AccountSelector = ({ walletAccounts }: AccountSelector) => {
  const selectedAccount = useUnit(accountsStructureModel.$selectedAccount);
  const selectAccount = useUnit(accountsStructureModel.events.selectAccount);

  return (
    <Select
      value={selectedAccount?.id ?? null}
      placeholder="Select account"
      onChange={(id) => {
        const account = walletAccounts.find((a) => a.id === id);
        if (account) {
          selectAccount(account);
        }
      }}
    >
      {walletAccounts.map((account) => {
        return (
          <Select.Item key={account.id} value={account.id}>
            <Address showIcon variant="short" iconSize={20} address={toAddress(account.accountId)} />
          </Select.Item>
        );
      })}
    </Select>
  );
};
