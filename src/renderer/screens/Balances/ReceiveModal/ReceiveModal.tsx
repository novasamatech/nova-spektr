import cn from 'classnames';
import { useEffect, useState } from 'react';

import { QrTextGenerator } from '@renderer/components/common';
import { ExplorerIcons } from '@renderer/components/common/Explorers/common/constants';
import { Address, BaseModal, Button, Dropdown, Icon } from '@renderer/components/ui';
import { Option, ResultOption } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { SigningType } from '@renderer/domain/shared-kernel';
import { toAddress } from '@renderer/services/balance/common/utils';
import { copyToClipboard } from '@renderer/utils/strings';
import { useAccount } from '@renderer/services/account/accountService';

export type ReceivePayload = {
  chain: Chain;
  asset: Asset;
};

type Props = {
  data?: ReceivePayload;
  isOpen: boolean;
  onClose: () => void;
};

const ReceiveModal = ({ data, isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { getActiveAccounts } = useAccount();

  const [activeAccount, setActiveAccount] = useState<ResultOption<number>>();
  const [activeAccountsOptions, setActiveAccountsOptions] = useState<Option<number>[]>([]);

  const activeAccounts = getActiveAccounts();

  useEffect(() => {
    const accounts = activeAccounts.reduce<Option[]>((acc, account, index) => {
      if (
        (account.chainId !== undefined && account.chainId !== data?.chain.chainId) ||
        account.signingType === SigningType.WATCH_ONLY
      ) {
        return acc;
      }

      const address = toAddress(account.publicKey || '0x00', data?.chain.addressPrefix);

      const accountType =
        account.signingType === SigningType.PARITY_SIGNER ? 'paritySignerBackground' : 'watchOnlyBackground';

      const accountOption = {
        id: index.toString(),
        value: index,
        element: (
          <div className="grid grid-rows-2 grid-flow-col gap-x-2.5">
            <Icon className="row-span-2 self-center" name={accountType} size={34} />
            <p className="text-left text-neutral text-lg font-semibold leading-5">{account.name}</p>
            <Address type="short" address={address} canCopy={false} />
          </div>
        ),
      };

      return acc.concat(accountOption);
    }, []);

    if (accounts.length === 0) return;

    setActiveAccountsOptions(accounts);
    setActiveAccount({ id: accounts[0].id, value: accounts[0].value });
  }, [activeAccounts.length, data?.chain.chainId]);

  const account = activeAccount ? activeAccounts[activeAccount.value] : undefined;
  const publicKey = account?.publicKey || '0x00';
  const address = toAddress(publicKey, data?.chain.addressPrefix);

  //eslint-disable-next-line i18next/no-literal-string
  const qrCodePayload = `substrate:${address}:${publicKey}`;

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

        {activeAccounts.length > 1 && (
          <Dropdown
            weight="lg"
            placeholder={t('receive.selectWalletPlaceholder')}
            className="w-full mb-2.5"
            activeId={activeAccount?.id}
            options={activeAccountsOptions}
            onChange={setActiveAccount}
          />
        )}

        <div className="w-full bg-shade-2 rounded-2lg overflow-hidden">
          <div className="flex flex-col items-center pb-2.5 rounded-b-2lg bg-shade-5">
            <QrTextGenerator
              skipEncoding
              className={cn('mt-10 mb-6', !activeAccount && 'invisible')}
              payload={qrCodePayload}
              size={280}
              bgColor="#F1F1F1"
            />

            <Address className="mb-2 text-sm text-neutral-variant" type="full" address={address} />

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
