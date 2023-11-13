import { BaseModal } from '@shared/ui';
import { useI18n } from '@app/providers';
import { SelectableAccount } from './SelectableAccount';
import { cnTw } from '@shared/lib/utils';
import { Account, Chain } from '@shared/core';

type Props = {
  isOpen: boolean;
  chain: Chain;
  accounts: Account[];
  onSelect: (account: Account) => void;
  onClose: () => void;
};

const AccountSelectModal = ({ isOpen, onClose, onSelect, accounts, chain }: Props) => {
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
        {accounts.map((a) => (
          <li key={a.id}>
            <SelectableAccount
              accountId={a.accountId}
              addressPrefix={chain.addressPrefix}
              name={a.name}
              chainId={chain.chainId}
              explorers={chain.explorers}
              value={a}
              onSelected={onSelect}
            />
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};

export default AccountSelectModal;
