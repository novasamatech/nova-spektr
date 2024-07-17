import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { OperationTitle } from '@entities/chain';
import { DefaultExplorer, ExplorerIcons } from '@shared/ui/ExplorerLink/constants';
import { BaseModal, Button, FootnoteText, HelpText, Icon, Select } from '@shared/ui';
import { type DropdownOption, type DropdownResult } from '@shared/ui/types';
import { useI18n } from '@app/providers';
import { DEFAULT_TRANSITION, cnTw, copyToClipboard, toAddress } from '@shared/lib/utils';
import { AccountAddress, accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { useToggle } from '@shared/lib/hooks';
import type { Asset, Chain } from '@shared/core';
import { QrTextGenerator } from '@entities/transaction';

type Props = {
  chain: Chain;
  asset: Asset;
  onClose: () => void;
};

// TODO: Divide into model + feature/entity
export const ReceiveAssetModal = ({ chain, asset, onClose }: Props) => {
  const { t } = useI18n();
  const wallet = useUnit(walletModel.$activeWallet);

  const [isModalOpen, toggleIsModalOpen] = useToggle(true);
  const [activeAccount, setActiveAccount] = useState<DropdownResult<number>>();
  const [activeAccountsOptions, setActiveAccountsOptions] = useState<DropdownOption<number>[]>([]);

  useEffect(() => {
    if (!wallet || walletUtils.isWatchOnly(wallet)) return;

    const accounts = wallet?.accounts.reduce<DropdownOption[]>((acc, account, index) => {
      const isBaseAccount = accountUtils.isBaseAccount(account);
      const isPolkadotVault = walletUtils.isPolkadotVault(wallet);
      const isChainMatch = accountUtils.isChainIdMatch(account, chain.chainId);

      if (isPolkadotVault && isBaseAccount) return acc;

      if (isChainMatch) {
        const accountName = accountUtils.isShardAccount(account) ? undefined : account.name;

        const element = (
          <AccountAddress
            type="adaptive"
            className="max-w-[365px]"
            accountId={account.accountId}
            addressPrefix={chain.addressPrefix}
            name={accountName}
            size={20}
            canCopy={false}
            showIcon
          />
        );

        acc.push({ id: index.toString(), value: index, element });
      }

      return acc;
    }, []);

    if (accounts.length === 0) return;

    setActiveAccountsOptions(accounts);
    setActiveAccount({ id: accounts[0].id, value: accounts[0].value });
  }, [wallet, chain]);

  const closeReceiveModal = () => {
    toggleIsModalOpen();
    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  const isVault = walletUtils.isPolkadotVault(wallet) || walletUtils.isMultiShard(wallet);
  const account = activeAccount ? wallet?.accounts[activeAccount.value] : undefined;
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
      headerClass="py-3 pl-5 pr-3"
      closeButton
      onClose={closeReceiveModal}
    >
      {isVault && wallet?.accounts.length > 1 && (
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
        className={cnTw('mb-4', !activeAccount && 'invisible')}
        payload={qrCodePayload}
        size={240}
      />

      {(chain.explorers || []).length > 0 && (
        <ul className="flex gap-x-2 mb-4">
          {chain.explorers?.map(({ name, account }) => (
            <li aria-label={t('receive.explorerLinkLabel', { name })} key={name} className="flex">
              <a
                href={account?.replace('{address}', address)}
                rel="noopener noreferrer"
                target="_blank"
                className="px-1.5 py-1"
              >
                <Icon size={16} as="img" name={ExplorerIcons[name] || ExplorerIcons[DefaultExplorer]} />
              </a>
            </li>
          ))}
        </ul>
      )}

      <HelpText className="w-[240px] text-text-secondary break-all mb-2" align="center">
        {toAddress(accountId, { prefix })}
      </HelpText>

      <Button variant="text" size="sm" onClick={() => copyToClipboard(address)}>
        {t('receive.copyAddressButton')}
      </Button>
    </BaseModal>
  );
};
