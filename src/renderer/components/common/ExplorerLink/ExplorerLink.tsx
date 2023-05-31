import cnTw from '@renderer/shared/utils/twMerge';
import { toAddress } from '@renderer/shared/utils/address';
import { Icon } from '@renderer/components/ui';
import { DefaultExplorer, ExplorerIcons } from '@renderer/components/common/Explorers/common/constants';
import { Explorer } from '@renderer/domain/chain';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountId, Address } from '@renderer/domain/shared-kernel';
import { FootnoteText } from '@renderer/components/ui-redesign';

interface Props {
  explorer: Explorer;
  address: Address | AccountId;
  addressPrefix?: number;
}

const ExplorerLink = ({ explorer, address, addressPrefix }: Props) => {
  const { t } = useI18n();
  const { account, name } = explorer;

  if (!account) return null;

  return (
    <a
      className={cnTw('rounded-md flex items-center gap-x-2 p-2 select-none')}
      href={account.replace('{address}', toAddress(address, { prefix: addressPrefix }))}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Icon as="img" name={ExplorerIcons[name] || ExplorerIcons[DefaultExplorer]} size={12} />
      <FootnoteText as="span" className="text-text-secondary">
        {t('general.explorers.explorerButton', { name })}
      </FootnoteText>
    </a>
  );
};

export default ExplorerLink;
