import { BaseModal } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { AccountDS } from '@renderer/shared/api/storage';
import { Chain } from '@renderer/entities/chain';
import { SelectableAccount } from './SelectableAccount';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (account: AccountDS) => void;
  accounts: AccountDS[];
  chain: Chain;
};

const AccountSelectModal = ({ isOpen, onClose, onSelect, accounts, chain }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      closeButton
      isOpen={isOpen}
      title={t('operation.selectSignatory')}
      panelClass="w-[420px]"
      onClose={onClose}
    >
      <ul className="mt-1 max-h-[332px] overflow-y-scroll">
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
