import cn from 'classnames';
import { useEffect, useState } from 'react';

import { AccountAddress, QrTextGenerator } from '@renderer/components/common';
import { DefaultExplorer, ExplorerIcons } from '@renderer/components/common/ExplorerLink/constants';
import { Icon } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui-redesign/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { Asset } from '@renderer/domain/asset';
import { Chain } from '@renderer/domain/chain';
import { SigningType } from '@renderer/domain/shared-kernel';
import { copyToClipboard } from '@renderer/shared/utils/strings';
import { useAccount } from '@renderer/services/account/accountService';
import { toAddress } from '@renderer/shared/utils/address';
import { BaseModal, Button, FootnoteText, Select } from '@renderer/components/ui-redesign';
import OperationModalTitle from '@renderer/screens/Operations/components/OperationModalTitle';
import { HelpText } from '@renderer/components/ui-redesign/Typography';
import cnTw from '@renderer/shared/utils/twMerge';
import { IconButtonStyle } from '@renderer/components/ui-redesign/Buttons/IconButton/IconButton';

type Props = {
  chain: Chain;
  asset: Asset;
  isOpen: boolean;
  onClose: () => void;
};

export const ReceiveModal = ({ chain, asset, isOpen, onClose }: Props) => {
  const { t } = useI18n();
  const { getActiveAccounts } = useAccount();

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
  }, [activeAccounts.length, chain.chainId]);

  const account = activeAccount ? activeAccounts[activeAccount.value] : undefined;
  const accountId = account?.accountId || '0x00';
  const prefix = chain.addressPrefix;
  const address = toAddress(accountId, { prefix });

  //eslint-disable-next-line i18next/no-literal-string
  const qrCodePayload = `substrate:${address}:${accountId}`;

  return (
    <BaseModal
      title={<OperationModalTitle title={t('receive.title', { asset: asset.symbol })} chainId={chain.chainId} />}
      contentClass="pb-6 px-4 pt-4 flex flex-col items-center"
      headerClass="py-4 px-5 max-w-[440px]"
      closeButton
      isOpen={isOpen}
      onClose={onClose}
    >
      <Select
        placeholder={t('receive.selectWalletPlaceholder')}
        className="w-full mb-6"
        disabled={activeAccountsOptions.length === 1}
        selectedId={activeAccount?.id}
        options={activeAccountsOptions}
        onChange={setActiveAccount}
      />

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
              <a
                href={account?.replace('{address}', address)}
                rel="noopener noreferrer"
                target="_blank"
                className={cnTw(IconButtonStyle, 'spektr-icon-button flex py-1 px-1.5 rounded')}
              >
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
