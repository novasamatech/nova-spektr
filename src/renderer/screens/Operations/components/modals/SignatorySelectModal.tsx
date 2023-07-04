import { BaseModal } from '@renderer/components/ui-redesign';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountDS } from '@renderer/services/storage';
import SelectableSignatory from '@renderer/components/common/SelectableSignatory/SelectableSignatory';
import { ChainId } from '@renderer/domain/shared-kernel';
import { Asset } from '@renderer/domain/asset';
import { Explorer } from '@renderer/domain/chain';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (account: AccountDS) => void;
  accounts: AccountDS[];
  chainId?: ChainId;
  asset?: Asset;
  explorers?: Explorer[];
};

const SignatorySelectModal = ({ isOpen, onClose, onSelect, accounts, asset, chainId, explorers }: Props) => {
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
        {asset &&
          chainId &&
          accounts.map((a) => (
            <li key={a.id}>
              <SelectableSignatory
                accountId={a.accountId}
                name={a.name}
                asset={asset}
                chainId={chainId}
                explorers={explorers}
                value={a}
                onSelected={onSelect}
              />
            </li>
          ))}
      </ul>
    </BaseModal>
  );
};

export default SignatorySelectModal;
