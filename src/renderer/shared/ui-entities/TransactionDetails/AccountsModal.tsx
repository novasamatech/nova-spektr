import { type PropsWithChildren } from 'react';

import { type Account, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Modal } from '@/shared/ui-kit';
import { Account as AccountComponent } from '../Account/Account';

type Props = PropsWithChildren<{
  accounts: Account[];
  chain: Chain;
}>;

export const AccountsModal = ({ accounts, chain, children }: Props) => {
  const { t } = useI18n();

  return (
    <Modal size="sm">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('staking.confirmation.accountsTitle')}</Modal.Title>
      <Modal.Content>
        <ul className="flex flex-col px-3 pb-3 pt-2">
          {accounts.map((account) => (
            <li key={account.accountId} className="flex items-center justify-between gap-2 p-2" data-testid="account">
              <AccountComponent title={account.name} accountId={account.accountId} chain={chain} />
            </li>
          ))}
        </ul>
      </Modal.Content>
    </Modal>
  );
};
