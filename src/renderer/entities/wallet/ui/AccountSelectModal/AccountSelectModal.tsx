import { useI18n } from '@app/providers';
import { type Account, type Chain } from '@shared/core';
import { cnTw } from '@shared/lib/utils';
import { BaseModal, Icon } from '@shared/ui';
import { accountUtils } from '../../lib/account-utils';
import { AccountAddress } from '../AccountAddress/AccountAddress';

type Props = {
  isOpen: boolean;
  chain: Chain;
  accounts: Account[];
  onSelect: (account: Account) => void;
  onClose: () => void;
};

export const AccountSelectModal = ({ isOpen, accounts, chain, onClose, onSelect }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      closeButton
      isOpen={isOpen}
      contentClass="pb-4 px-3"
      title={t('operation.selectAccount')}
      panelClass="w-[368px]"
      onClose={onClose}
    >
      <ul className={cnTw('mt-1', accounts.length > 7 && 'max-h-[332px] overflow-y-auto')}>
        {accounts.map((account) => (
          <li key={account.id}>
            <button
              className={cnTw(
                'group flex w-full items-center rounded px-2 py-1.5 text-text-secondary',
                'hover:bg-action-background-hover active:text-text-primary',
              )}
              onClick={() => onSelect(account)}
            >
              <AccountAddress
                type="short"
                addressFont="text-body text-inherit"
                accountId={account.accountId}
                addressPrefix={chain.addressPrefix}
                name={!accountUtils.isShardAccount(account) ? account.name : ''}
              />
              <Icon name="right" className="ml-auto" size={16} />
            </button>
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};
