import cn from 'classnames';
import { forwardRef, useState } from 'react';

import { Address, Checkbox, Icon, Identicon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountDS } from '@renderer/services/storage';
import { useAccount } from '@renderer/services/account/accountService';
import { SigningType, WalletType } from '@renderer/domain/shared-kernel';
import { useWalletsStructure } from './useWalletStructure';
import { ChainWithAccounts, RootAccount, WalletStructure } from './types';
import { Expandable } from '@renderer/components/common';

type Props = {
  className?: string;
};

const GroupLabels = {
  [SigningType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [SigningType.PARITY_SIGNER]: 'wallets.paritySignerLabel',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'wallets.multishardWalletsLabel',
};

const Wallets = forwardRef<HTMLDivElement, Props>(({ className }, ref) => {
  const { t } = useI18n();
  const { getLiveAccounts, toggleActiveAccount } = useAccount();

  const [query, setQuery] = useState('');

  const wallets = useWalletsStructure({ signingType: SigningType.PARITY_SIGNER }, query);
  const watchOnlyAccounts = getLiveAccounts({ signingType: SigningType.WATCH_ONLY });
  const paritySignerAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER, walletId: null });

  const searchAccount = (accounts: AccountDS[] = [], query: string = '') => {
    return accounts.filter((account) => {
      return account.name.toLowerCase().includes(query.toLowerCase()) || (account.accountId || '').includes(query);
    });
  };

  const searchedParitySignerAccountss = searchAccount(paritySignerAccounts, query);
  const searchedWatchOnlyAccounts = searchAccount(watchOnlyAccounts, query);

  const accountGroups = [
    {
      label: GroupLabels[WalletType.MULTISHARD_PARITY_SIGNER],
      accounts: wallets,
    },
    {
      label: GroupLabels[SigningType.PARITY_SIGNER],
      accounts: searchedParitySignerAccountss,
    },
    {
      label: GroupLabels[SigningType.WATCH_ONLY],
      accounts: searchedWatchOnlyAccounts,
    },
  ];

  const selectChain = (chain: ChainWithAccounts, checked: boolean) => {
    chain.accounts.forEach((account) => {
      if (checked === account.isActive) return;

      toggleActiveAccount(account.id || '');
    });
  };

  const selectRootAccount = (rootAccount: RootAccount, checked: boolean) => {
    checked !== rootAccount.isActive && toggleActiveAccount(rootAccount.id || '');

    rootAccount.chains.forEach((chain) => {
      selectChain(chain, checked);
    });
  };

  const selectWallet = (wallet: WalletStructure, checked: boolean) => {
    wallet.rootAccounts.forEach((rootAccount) => {
      selectRootAccount(rootAccount, checked);
    });
  };

  return (
    <div ref={ref} className={cn('flex px-2.5 py-4 flex-col gap-2.5 h-full bg-shade-2', className)}>
      <Input
        wrapperClass="w-full bg-shade-5 rounded-2lg text-sm"
        prefixElement={<Icon name="search" className="w-5 h-5" />}
        placeholder={t('wallets.searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {accountGroups.map(({ label, accounts }) => (
        <div key={label} className="border shadow-surface rounded-2lg bg-shade-10 font-semibold text-2xs">
          <div className="flex items-center uppercase text-neutral-variant p-2.5">
            {t(label)}
            <div className="ml-1 flex items-center justify-center bg-shade-20 w-4 h-4 rounded">{accounts.length}</div>
          </div>

          {accounts.length > 0 && (
            <ul className="bg-white m-0.5 rounded-2lg">
              {accounts.map((account) => (
                <li key={account.name}>
                  <ul>
                    {(account as WalletStructure).rootAccounts ? (
                      <Expandable
                        itemClass="px-2 hover:bg-shade-10"
                        key={(account as AccountDS).id}
                        alwaysActive={query.length > 0}
                        item={
                          <li className="h-10 w-full">
                            <Checkbox
                              className="w-full h-full"
                              onChange={(e) => selectWallet(account as WalletStructure, e.target.checked)}
                            >
                              <div className="flex gap-x-1 overflow-hidden">
                                <p className="text-neutral text-sm text-semibold truncate">{account.name}</p>
                                <div className="ml-1 flex items-center justify-center bg-shade-20 w-4 h-4 rounded">
                                  {(account as WalletStructure).amount}
                                </div>
                              </div>
                            </Checkbox>
                          </li>
                        }
                      >
                        <ul>
                          {(account as WalletStructure).rootAccounts.map((rootAccount) => (
                            <Expandable
                              itemClass="px-2 hover:bg-shade-10"
                              key={rootAccount.id}
                              alwaysActive={query.length > 0}
                              item={
                                <li className="h-10 w-full">
                                  <Checkbox
                                    className="w-full h-full"
                                    checked={rootAccount.isActive}
                                    onChange={(e) => selectRootAccount(rootAccount, e.target.checked)}
                                  >
                                    <div className="flex gap-x-1 items-center overflow-hidden">
                                      <Identicon
                                        address={rootAccount.accountId || ''}
                                        theme={'polkadot'}
                                        background={false}
                                      />

                                      <p className="text-neutral text-sm text-semibold truncate">{rootAccount.name}</p>
                                      <div className="ml-1 flex items-center justify-center bg-shade-20 w-4 h-4 rounded">
                                        {rootAccount.amount}
                                      </div>
                                    </div>
                                  </Checkbox>
                                </li>
                              }
                            >
                              <ul>
                                {rootAccount.chains.map((chain) => (
                                  <Expandable
                                    itemClass="px-2 hover:bg-shade-10"
                                    key={chain.chainId}
                                    alwaysActive={query.length > 0}
                                    item={
                                      <li className="h-10 w-full">
                                        <Checkbox
                                          className="w-full h-full"
                                          checked={chain.isActive}
                                          onChange={(e) => selectChain(chain, e.target.checked)}
                                        >
                                          <div className="flex items-center gap-x-1 overflow-hidden h-full">
                                            <div className="rounded-full border border-shade-30 w-[5px] h-[5px] box-border start-tree relative"></div>
                                            <div className="flex items-center uppercase text-neutral-variant">
                                              <img
                                                className="inline-block mx-1"
                                                width={14}
                                                height={14}
                                                alt={chain.name}
                                                src={chain.icon}
                                              />

                                              {chain.name}
                                              <div className="ml-1 flex items-center justify-center bg-shade-20 w-4 h-4 rounded">
                                                {chain.accounts.length}
                                              </div>
                                            </div>
                                          </div>
                                        </Checkbox>
                                      </li>
                                    }
                                  >
                                    <ul>
                                      {chain.accounts.map((chainAccount) => (
                                        <li className="h-10 px-2 hover:bg-shade-10 tree-wrapper" key={chainAccount.id}>
                                          <Checkbox
                                            className="w-full h-full"
                                            checked={chainAccount.isActive}
                                            onChange={() => toggleActiveAccount(chainAccount.id || '')}
                                          >
                                            <div className="grid grid-rows-2 grid-flow-col gap-x-1 overflow-hidden">
                                              <div className="row-span-2 self-center relative w-[14px] h-[5px] ml-0.5 middle-tree">
                                                <div className="bg-shade-30 absolute w-[9px] h-[1px] top-[2px] left-[1px]"></div>
                                                <div className="border-shade-30 absolute rounded-full border w-[5px] h-[5px] box-border top-0 right-0"></div>
                                              </div>

                                              <div className="row-span-2 self-center relative">
                                                <Identicon
                                                  address={chainAccount.accountId || ''}
                                                  theme={'polkadot'}
                                                  background={false}
                                                />
                                                <Icon
                                                  className="absolute bottom-0 right-0"
                                                  name="paritySignerBackground"
                                                  size={14}
                                                />
                                              </div>

                                              <p className="text-neutral text-sm text-semibold truncate">
                                                {chainAccount.name}
                                              </p>

                                              <Address
                                                type="short"
                                                address={chainAccount.accountId || ''}
                                                canCopy={false}
                                                showIcon={false}
                                              />
                                            </div>
                                          </Checkbox>
                                        </li>
                                      ))}
                                    </ul>
                                  </Expandable>
                                ))}
                              </ul>
                            </Expandable>
                          ))}
                        </ul>
                      </Expandable>
                    ) : (
                      <li className="h-10 px-2 hover:bg-shade-10" key={(account as AccountDS).id}>
                        <Checkbox
                          className="w-full h-full"
                          checked={(account as AccountDS).isActive}
                          onChange={() => toggleActiveAccount((account as AccountDS).id || '')}
                        >
                          <div className="flex gap-x-1 overflow-hidden">
                            <div className="row-span-2 self-center relative">
                              <Identicon
                                address={(account as AccountDS).accountId || ''}
                                theme={'polkadot'}
                                background={false}
                              />
                              <Icon
                                className="absolute bottom-0 right-0"
                                name={
                                  (account as AccountDS).signingType === SigningType.PARITY_SIGNER
                                    ? 'paritySignerBackground'
                                    : 'watchOnlyBackground'
                                }
                                size={14}
                              />
                            </div>

                            <p className="text-neutral text-sm text-semibold truncate">{account.name}</p>
                          </div>
                        </Checkbox>
                      </li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
});

export default Wallets;
