import cnTw from '@renderer/shared/utils/twMerge';
import { toAddress } from '@renderer/shared/utils/address';
import { Icon } from '@renderer/components/ui';
import { DefaultExplorer, ExplorerIcons } from '@renderer/components/common/Explorers/common/constants';
import { Explorer } from '@renderer/domain/chain';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountId, Address, HexString } from '@renderer/domain/shared-kernel';
import { FootnoteText } from '@renderer/components/ui-redesign';

type WithAccount = {
  address: Address | AccountId;
  addressPrefix?: number;
};

type WithExtrinsic = {
  hash: HexString;
};

type Props = {
  explorer: Explorer;
} & (WithAccount | WithExtrinsic);

const ExplorerLink = ({ explorer, ...props }: Props) => {
  const { t } = useI18n();
  const { account, extrinsic, name } = explorer;

  const href = (props as WithExtrinsic).hash
    ? extrinsic && extrinsic.replace('{hash}', (props as WithExtrinsic).hash)
    : account &&
      account.replace(
        '{address}',
        toAddress((props as WithAccount).address, { prefix: (props as WithAccount).addressPrefix }),
      );

  if (!href) return null;

  return (
    <a
      className={cnTw('rounded-md flex items-center gap-x-2 p-2 select-none')}
      href={href}
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
