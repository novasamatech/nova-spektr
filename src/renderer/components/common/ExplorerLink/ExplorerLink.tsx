import { cnTw, toAddress } from '@renderer/shared/lib/utils';
import { Icon, FootnoteText } from '@renderer/shared/ui';
import { DefaultExplorer, ExplorerIcons } from '@renderer/components/common/ExplorerLink/constants';
import { Explorer } from '@renderer/entities/chain';
import { useI18n } from '@renderer/app/providers';
import { AccountId, Address, HexString } from '@renderer/domain/shared-kernel';

const isExtrinsic = (props: WithAccount | WithExtrinsic): props is WithExtrinsic =>
  (props as WithExtrinsic).hash !== undefined;

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

  const href = isExtrinsic(props)
    ? extrinsic && extrinsic.replace('{hash}', props.hash)
    : account && account.replace('{address}', toAddress(props.address, { prefix: props.addressPrefix }));

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
