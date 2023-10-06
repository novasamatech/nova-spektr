import { BaseModal } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { SelectableSignatory } from '@renderer/entities/signatory';
import { cnTw } from '@renderer/shared/lib/utils';
import type { Asset, Account, Chain } from '@renderer/shared/core';

type Props = {
  isOpen: boolean;
  chain: Chain;
  nativeAsset: Asset;
  accounts: Account[];
  onClose: () => void;
  onSelect: (account: Account) => void;
};

export const SignatorySelectModal = ({ isOpen, onClose, onSelect, accounts, nativeAsset, chain }: Props) => {
  const { t } = useI18n();

  return (
    <BaseModal
      closeButton
      panelClass="w-[420px]"
      isOpen={isOpen}
      title={t('operation.selectSignatory')}
      onClose={onClose}
    >
      <ul className={cnTw('mt-1', accounts.length > 7 && 'max-h-[332px] overflow-y-auto')}>
        {accounts.map((account) => (
          <li key={account.id}>
            <SelectableSignatory
              accountId={account.accountId}
              addressPrefix={chain.addressPrefix}
              name={account.name}
              asset={nativeAsset}
              chainId={chain.chainId}
              explorers={chain.explorers}
              value={account}
              onSelected={onSelect}
            />
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};
