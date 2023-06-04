import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';
import { Account } from '@renderer/domain/account';
import { BaseModal } from '@renderer/components/ui-redesign';
import AddressWithExplorers from '@renderer/components/common/AddressWithExplorers/AddressWithExplorers';

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
      panelClass="w-[368px]"
      title={t('staking.confirmation.accountsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <li className="flex flex-col gap-y-3">
        {accounts.map((account) => (
          <li key={account.accountId}>
            <AddressWithExplorers
              accountId={account.accountId}
              addressPrefix={addressPrefix}
              name={account.name}
              size={20}
              explorers={explorers}
              addressFont="text-body text-text-secondary"
              type="short"
              className="gap-x-1"
            />
          </li>
        ))}
      </li>
    </BaseModal>
  );
};

export default AccountsModal;
