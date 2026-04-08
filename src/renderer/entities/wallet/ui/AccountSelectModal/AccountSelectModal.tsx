import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { accountUtils } from '../../lib/account-utils';
import { AccountAddress } from '../AccountAddress/AccountAddress';

type Props = {
  isOpen: boolean;
  chain: Chain;
  accounts: AnyAccount[];
  onSelect: (account: AnyAccount) => void;
  onClose: () => void;
};

export const AccountSelectModal = ({ isOpen, accounts, chain, onClose, onSelect }: Props) => {
  const { t } = useI18n();

  return (
    <Modal size="sm" isOpen={isOpen} onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('operation.selectAccount')}</Modal.Title>
      <Modal.Content>
        <div className="px-3 pb-4">
          <ul className={cnTw('mt-1', accounts.length > 7 && 'max-h-[332px] overflow-y-auto')}>
            {accounts.map((account) => (
              <li key={account.id}>
                <button
                  className={cnTw(
                    'group flex w-full items-center rounded-sm px-2 py-1.5 text-text-secondary',
                    'hover:bg-action-background-hover active:text-text-primary',
                  )}
                  onClick={() => onSelect(account)}
                >
                  <AccountAddress
                    type="short"
                    addressFont="text-body text-inherit"
                    accountId={account.accountId}
                    addressPrefix={chain.addressPrefix}
                    name={!accountUtils.isVaultShardAccount(account) ? account.name : ''}
                  />
                  <Icon name="right" className="ml-auto" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Modal.Content>
    </Modal>
  );
};
