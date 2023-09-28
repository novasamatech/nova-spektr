import cn from 'classnames';
import { useEffect, useState } from 'react';

import { OperationTitle, QrTextGenerator } from '@renderer/components/common';
import { DefaultExplorer, ExplorerIcons } from '@renderer/components/common/ExplorerLink/constants';
import { BaseModal, Button, FootnoteText, HelpText, Icon, Select } from '@renderer/shared/ui';
import { DropdownOption, DropdownResult } from '@renderer/shared/ui/types';
import { useI18n } from '@renderer/app/providers';
import { copyToClipboard, DEFAULT_TRANSITION, toAddress } from '@renderer/shared/lib/utils';
import { AccountAddress, useAccount } from '@renderer/entities/account';
import { Chain } from '@renderer/entities/chain';
import { Asset } from '@renderer/entities/asset';
import { useToggle } from '@renderer/shared/lib/hooks';
import { SigningType } from '@renderer/entities/wallet';

type Props = {
  chain: Chain;
  asset: Asset;
  onClose: () => void;
};

// TODO: Divide into model + feature/entity
export const ReceiveAssetModal = ({ chain, asset, onClose }: Props) => {
  const { t } = useI18n();
  const { getActiveAccounts } = useAccount();

  const [isModalOpen, toggleIsModalOpen] = useToggle(true);
  const [activeAccount, setActiveAccount] = useState<DropdownResult<number>>();
  const [activeAccountsOptions, setActiveAccountsOptions] = useState<DropdownOption<number>[]>([]);

  const activeAccounts = getActiveAccounts();

  useEffect(() => {
    const accounts = activeAccounts.reduce<DropdownOption[]>((acc, account, index) => {
      const isWatchOnly = account.signingType === SigningType.WATCH_ONLY;
      const isWrongChain = account.chainId && account.chainId !== chain.chainId;

      if (isWatchOnly || isWrongChain) return acc;

      const element = (
        <AccountAddress
          type="short"
          accountId={account.accountId}
          addressPrefix={chain.addressPrefix}
          name={account.name}
          size={20}
          canCopy={false}
          showIcon
        />
      );

      return acc.concat({ id: index.toString(), value: index, element });
    }, []);

    if (accounts.length === 0) return;

    setActiveAccountsOptions(accounts);
    setActiveAccount({ id: accounts[0].id, value: accounts[0].value });
  }, [activeAccounts.length, chain]);

  const closeReceiveModal = () => {
    toggleIsModalOpen();
    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  const hasShards = activeAccounts.length > 1;
  const account = activeAccount ? activeAccounts[activeAccount.value] : undefined;
  const accountId = account?.accountId || '0x00';
  const prefix = chain.addressPrefix;
  const address = toAddress(accountId, { prefix });

  //eslint-disable-next-line i18next/no-literal-string
  const qrCodePayload = `substrate:${address}:${accountId}`;

  return (
    <BaseModal
      isOpen={isModalOpen}
      title={<OperationTitle title={t('receive.title', { asset: asset.symbol })} chainId={chain.chainId} />}
      contentClass="pb-6 px-4 pt-4 flex flex-col items-center"
      headerClass="py-3 px-5 max-w-[440px]"
      closeButton
      onClose={closeReceiveModal}
    >
      {hasShards && (
        <Select
          placeholder={t('receive.selectWalletPlaceholder')}
          className="w-full mb-6"
          disabled={activeAccountsOptions.length === 1}
          selectedId={activeAccount?.id}
          options={activeAccountsOptions}
          onChange={setActiveAccount}
        />
      )}

      <FootnoteText className="w-[240px] mb-4" align="center">
        {/* eslint-disable-next-line i18next/no-literal-string */}
        {t('receive.sendOnlyLabel')} {asset.symbol} ({asset.name}) {t('receive.chainLabel', { name: chain.name })}
      </FootnoteText>

      <QrTextGenerator
        skipEncoding
        className={cn('mb-4', !activeAccount && 'invisible')}
        payload={qrCodePayload}
        size={240}
      />

      {(chain.explorers || []).length > 0 && (
        <ul className="flex gap-x-2 mb-4">
          {chain.explorers?.map(({ name, account }) => (
            <li aria-label={t('receive.explorerLinkLabel', { name })} key={name} className="flex">
              <a href={account?.replace('{address}', address)} rel="noopener noreferrer" target="_blank">
                <Icon size={16} as="img" name={ExplorerIcons[name] || ExplorerIcons[DefaultExplorer]} />
              </a>
            </li>
          ))}
        </ul>
      )}

      <HelpText className="w-[240px] mb-2 break-all" align="center">
        <AccountAddress
          className="justify-center"
          address={toAddress(accountId, { prefix })}
          showIcon={false}
          type="adaptive"
        />
      </HelpText>

      <Button variant="text" size="sm" onClick={() => copyToClipboard(address)}>
        {t('receive.copyAddressButton')}
      </Button>
    </BaseModal>
  );
};
