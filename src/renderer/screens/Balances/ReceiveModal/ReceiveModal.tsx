import { QrTextGenerator } from '@renderer/components/common';
import { Address, BaseModal, Button, Icon } from '@renderer/components/ui';
import { Explorer } from '@renderer/components/ui/Icon/data/explorer';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { PublicKey } from '@renderer/domain/shared-kernel';
import { toAddress } from '@renderer/services/balance/common/utils';
import { copyToClipboard } from '@renderer/utils/strings';

// TODO: create a separate components for Explorer links
const ExplorerIcons: Record<string, Explorer> = {
  Polkascan: 'polkascan',
  'Sub.ID': 'subid',
  Subscan: 'subscan',
  Statescan: 'statescan',
};

export type ReceivePayload = {
  chain: Chain;
  asset: Asset;
  activeWallets: {
    name: string;
    publicKey: PublicKey;
  }[];
};

type Props = {
  data?: ReceivePayload;
  isOpen: boolean;
  onClose: () => void;
};

const ReceiveModal = ({ data, isOpen, onClose }: Props) => {
  const wallet = data?.activeWallets[0] || { name: '', publicKey: '' as PublicKey };

  const address = toAddress(wallet.publicKey, data?.chain.addressPrefix);

  const qrCodePayload = `substrate:${address}:${wallet.publicKey}:Ff`;

  const onCopyAddress = () => {
    copyToClipboard(address);
  };

  return (
    <BaseModal closeButton className="px-5 py-5 max-w-[500px]" title="Receive" isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center">
        <div className="flex mt-4 mb-6 text-neutral font-semibold">
          <div className="flex items-center justify-center bg-shade-70 border border-shade-20 rounded-full w-6 h-6">
            <img src={data?.asset.icon} alt="" width={16} height={16} />
          </div>
          <span className="ml-1 uppercase">{data?.asset.symbol}</span>
          <span className="mx-2.5 text-neutral-variant">on</span>
          <img src={data?.chain.icon} alt="" width={24} height={24} />
          <span className="ml-1">{data?.chain.name}</span>
        </div>

        {/* TODO: in future add Dropdown for wallet select */}
        <div className="w-full bg-shade-2 rounded-2lg overflow-hidden">
          <div className="flex flex-col items-center pt-7.5 pb-2.5 rounded-b-2lg bg-shade-5">
            <QrTextGenerator payload={qrCodePayload} size={280} bgColor="#F1F1F1" />

            <Address className="mt-6 mb-2 text-sm text-neutral-variant" full address={address} />

            <ul className="flex gap-x-3">
              {data?.chain.explorers.map(({ name, account }) => (
                <li aria-label={`Link to ${name}`} key={name}>
                  <a href={account?.replace('{address}', address)} rel="noopener noreferrer" target="_blank">
                    <Icon as="img" name={ExplorerIcons[name]} />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-x-2.5 px-2.5 py-3.5 text-neutral-variant bg-shade-2">
            <Icon name="warnCutout" size={30} />
            <p className="uppercase text-xs leading-[14px]">
              Send only{' '}
              <span className="font-bold">
                {data?.asset.symbol} ({data?.asset.name})
              </span>{' '}
              token to this address on the <span className="font-bold">{data?.chain.name} (Parachain)</span> network
            </p>
          </div>
        </div>

        <Button className="mt-5" variant="fill" pallet="primary" weight="lg" onClick={onCopyAddress}>
          Copy address
        </Button>
      </div>
    </BaseModal>
  );
};

export default ReceiveModal;
