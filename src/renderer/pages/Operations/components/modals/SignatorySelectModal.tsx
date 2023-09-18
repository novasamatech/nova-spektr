import { BaseModal } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { AccountDS } from '@renderer/shared/api/storage';
import { Asset } from '@renderer/entities/asset';
import { Chain } from '@renderer/entities/chain';
import { SelectableSignatory } from '@renderer/entities/signatory';
import { cnTw } from '@renderer/shared/lib/utils';

type Props = {
  isOpen: boolean;
  chain: Chain;
  nativeAsset: Asset;
  accounts: AccountDS[];
  onClose: () => void;
  onSelect: (account: AccountDS) => void;
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
