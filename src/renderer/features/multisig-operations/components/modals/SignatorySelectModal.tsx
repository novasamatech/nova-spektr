import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Modal } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { SelectableSignatory } from '@/entities/signatory';

type Props = {
  isOpen: boolean;
  chain: Chain;
  nativeAsset: Asset;
  accounts: AnyAccount[];
  onClose: () => void;
  onSelect: (account: AnyAccount) => void;
};

export const SignatorySelectModal = ({ isOpen, onClose, onSelect, accounts, nativeAsset, chain }: Props) => {
  const { t } = useI18n();

  return (
    <Modal size="sm" height="fit" isOpen={isOpen} onToggle={onClose}>
      <Modal.Title>{t('operation.selectSignatory')}</Modal.Title>
      <Modal.Content>
        <ul className={cnTw('mb-2', accounts.length > 7 && 'max-h-[332px] overflow-y-auto')}>
          {accounts.map(account => (
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
      </Modal.Content>
    </Modal>
  );
};
