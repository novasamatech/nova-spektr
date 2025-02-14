import { type Account, type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BaseModal } from '@/shared/ui';
import { SelectableSignatory } from '@/entities/signatory';

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
      contentClass="px-3 pb-3 py-2"
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
              asset={nativeAsset}
              walletId={account.walletId}
              chainId={chain.chainId}
              value={account}
              onSelected={onSelect}
            />
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};
