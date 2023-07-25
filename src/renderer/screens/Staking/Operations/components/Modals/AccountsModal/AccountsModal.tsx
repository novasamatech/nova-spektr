import { useI18n } from '@renderer/app/providers';
import { Asset } from '@renderer/entities/asset/model/asset';
import { Explorer } from '@renderer/entities/chain/model/chain';
import { Account } from '@renderer/entities/account/model/account';
import { BaseModal } from '@renderer/shared/ui';
import { AddressWithExplorers } from '@renderer/entities/account/ui/AddressWithExplorers/AddressWithExplorers';
import { cnTw } from '@renderer/shared/lib/utils';

type Props = {
  isOpen: boolean;
  accounts: Account[];
  amounts?: string[];
  asset: Asset;
  explorers?: Explorer[];
  addressPrefix?: number;
  onClose: () => void;
};

const AccountsModal = ({ isOpen, accounts, explorers, addressPrefix, onClose }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      closeButton
      contentClass="pb-3 px-3 pt-2"
      panelClass="w-[480px]"
      title={t('staking.confirmation.accountsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <ul className={cnTw('flex flex-col gap-y-3', accounts.length > 7 && 'max-h-[388px] overflow-y-auto')}>
        {accounts.map((account) => (
          <li key={account.accountId}>
            <AddressWithExplorers
              className="gap-x-1"
              addressFont="text-body text-text-secondary"
              type="full"
              size={20}
              accountId={account.accountId}
              addressPrefix={addressPrefix}
              name={account.name}
              explorers={explorers}
            />
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};

export default AccountsModal;
