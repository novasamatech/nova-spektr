import { useEffect, useState } from 'react';

import { QrTextGenerator } from '@renderer/components/common';
import { Address, BaseModal, Button, Dropdown, Icon } from '@renderer/components/ui';
import { Explorer } from '@renderer/components/ui/Icon/data/explorer';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { toAddress } from '@renderer/services/balance/common/utils';
import { copyToClipboard } from '@renderer/utils/strings';
import { useI18n } from '@renderer/context/I18nContext';
import { DropdownOption } from '@renderer/components/ui/Dropdown/common/types';
import { useWallet } from '@renderer/services/wallet/walletService';
import { WalletType } from '@renderer/domain/wallet';
import { ChainId } from '@renderer/domain/shared-kernel';
import { WalletDS } from '@renderer/services/storage';

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
};

type Props = {
  data?: ReceivePayload;
  isOpen: boolean;
  onClose: () => void;
};

const getAddress = (wallet: WalletDS, chainId: ChainId): string | undefined => {
  const mainAccounts = wallet.mainAccounts?.[0];
  const chainAccounts = wallet.chainAccounts?.[0];

  if (mainAccounts) {
    return mainAccounts.accountId;
  }

  if (chainAccounts && chainAccounts.chainId === chainId) {
    return chainAccounts.accountId;
  }
};

const ReceiveModal = ({ data, isOpen, onClose }: Props) => {
  const { t } = useI18n();

  const [activeAccount, setActiveAccount] = useState<DropdownOption>();
  const [accounts, setAccoounts] = useState<DropdownOption[]>([]);
  const { getActiveWallets } = useWallet();
  const activeWallets = getActiveWallets();

  useEffect(() => {
    const accounts =
      activeWallets?.reduce((result, wallet, id) => {
        const address = getAddress(wallet, data?.chain.chainId || '0x');

        if (!address) return result;

        return [
          ...result,
          {
            label: (
              <div className="flex items-center  gap-2.5">
                <Icon
                  name={wallet.type === WalletType.PARITY ? 'paritySignerBackground' : 'watchOnlyBackground'}
                  size={34}
                />
                <div>
                  <div className="text-neutral text-lg font-semibold leading-5">{wallet.name}</div>
                  <div>
                    <Address type="short" address={address} />
                  </div>
                </div>
              </div>
            ),
            value: id,
          },
        ];
      }, [] as DropdownOption[]) || [];

    setAccoounts(accounts);
    setActiveAccount(accounts[0]);
  }, [activeWallets?.length]);

  const wallet = activeWallets?.[activeAccount?.value as number] || activeWallets?.[0];
  const publicKey = wallet?.mainAccounts?.[0]?.publicKey || wallet?.chainAccounts?.[0]?.publicKey || '0x00';
  const address = toAddress(publicKey, data?.chain.addressPrefix);

  //eslint-disable-next-line i18next/no-literal-string
  const qrCodePayload = `substrate:${address}:${publicKey}:Ff`;

  const onCopyAddress = async () => {
    await copyToClipboard(address);
  };

  return (
    <BaseModal closeButton title={t('receive.title')} isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center max-w-[500px]">
        <div className="flex mt-4 mb-6 text-neutral font-semibold">
          <div className="flex items-center justify-center bg-shade-70 border border-shade-20 rounded-full w-6 h-6">
            <img src={data?.asset.icon} alt="" width={16} height={16} />
          </div>
          <span className="ml-1 uppercase">{data?.asset.symbol}</span>
          <span className="mx-2.5 text-neutral-variant">{t('receive.on')}</span>
          <img src={data?.chain.icon} alt="" width={24} height={24} />
          <span className="ml-1">{data?.chain.name}</span>
        </div>

        <div className="w-full bg-shade-2 rounded-2lg overflow-hidden">
          <div className="flex flex-col items-center  pb-2.5 rounded-b-2lg bg-shade-5">
            {activeWallets && activeWallets.length > 1 && (
              <Dropdown
                placeholder={t('receive.selectWalletPlaceholder')}
                className="w-full"
                selected={activeAccount}
                options={accounts}
                height={15}
                onSelected={setActiveAccount}
              />
            )}

            <div className="mt-4">
              <QrTextGenerator skipEncoding payload={qrCodePayload} size={280} bgColor="#F1F1F1" />
            </div>

            <Address className="mt-6 mb-2 text-sm text-neutral-variant" type="full" address={address} />

            {(data?.chain.explorers || []).length > 0 && (
              <ul className="flex gap-x-3">
                {data?.chain.explorers?.map(({ name, account }) => (
                  <li aria-label={t('receive.explorerLinkLabel', { name })} key={name}>
                    <a href={account?.replace('{address}', address)} rel="noopener noreferrer" target="_blank">
                      <Icon as="img" name={ExplorerIcons[name]} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center gap-x-2.5 px-2.5 py-3.5 text-neutral-variant bg-shade-2">
            <Icon name="warnCutout" size={30} />
            <p className="uppercase text-xs leading-[14px]">
              {t('receive.sendOnlyLabel')}{' '}
              <span className="font-bold">
                {/* eslint-disable-next-line i18next/no-literal-string */}
                {data?.asset.symbol} ({data?.asset.name})
              </span>{' '}
              {t('receive.chainLabel1')}{' '}
              <span className="font-bold">{t('receive.chainLabel2', { name: data?.chain.name })}</span>{' '}
              {t('receive.chainLabel3')}
            </p>
          </div>
        </div>

        <Button className="mt-5" variant="fill" pallet="primary" weight="lg" onClick={onCopyAddress}>
          {t('receive.copyAddressButton')}
        </Button>
      </div>
    </BaseModal>
  );
};

export default ReceiveModal;
