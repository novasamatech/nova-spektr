import cn from 'classnames';
import { encodeAddress } from '@polkadot/util-crypto';

import { toPublicKey } from '@renderer/shared/utils/address';
import { Icon } from '@renderer/components/ui';
import { DefaultExplorer, ExplorerIcons } from '@renderer/components/common/Explorers/common/constants';
import { Explorer } from '@renderer/domain/chain';
import { useI18n } from '@renderer/context/I18nContext';

interface Props {
  explorer: Explorer;
  address: string;
  addressPrefix?: number;
}

const ExplorerLink = ({ explorer, address, addressPrefix }: Props) => {
  const { t } = useI18n();
  const { account, name } = explorer;

  if (!account) return null;

  return (
    <a
      className={cn('rounded-2lg flex items-center gap-x-2 p-2 select-none transition')}
      href={account.replace('{address}', encodeAddress(toPublicKey(address) || '', addressPrefix))}
      rel="noopener noreferrer"
      target="_blank"
    >
      <Icon as="img" name={ExplorerIcons[name] || ExplorerIcons[DefaultExplorer]} size={16} />
      {t('general.explorers.explorerButton', { name })}
    </a>
  );
};

export default ExplorerLink;
