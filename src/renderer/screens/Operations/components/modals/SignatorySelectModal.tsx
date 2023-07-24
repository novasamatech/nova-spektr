import { BaseModal } from '@renderer/shared/ui';
import { useI18n } from '@renderer/app/providers';
import { AccountDS } from '@renderer/services/storage';
import SelectableSignatory from '@renderer/components/common/SelectableSignatory/SelectableSignatory';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (account: AccountDS) => void;
  accounts: AccountDS[];
  chain: Chain;
  asset?: Asset;
};

const SignatorySelectModal = ({ isOpen, onClose, onSelect, accounts, asset, chain }: Props) => {
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
          accounts.map((a) => (
            <li key={a.id}>
              <SelectableSignatory
                accountId={a.accountId}
                addressPrefix={chain.addressPrefix}
                name={a.name}
                asset={asset}
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

export default SignatorySelectModal;
