import cn from 'classnames';
import { forwardRef, useState } from 'react';

import { getShortAddress, includes } from '@renderer/shared/utils/strings';
import { Address, ButtonLink, Checkbox, Icon, Identicon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { AccountDS } from '@renderer/services/storage';
import { useAccount } from '@renderer/services/account/accountService';
import { SigningType, WalletType } from '@renderer/domain/shared-kernel';
import { useWalletsStructure } from './useWalletStructure';
import { ChainWithAccounts, RootAccount, WalletStructure } from './types';
import { Expandable, Explorers } from '@renderer/components/common';
import Paths from '@renderer/routes/paths';

type Props = {
  className?: string;
};

const GroupLabels = {
  [SigningType.MULTISIG]: 'wallets.multisigLabel',
  [WalletType.MULTISHARD_PARITY_SIGNER]: 'wallets.multishardLabel',
  [SigningType.WATCH_ONLY]: 'wallets.watchOnlyLabel',
  [SigningType.PARITY_SIGNER]: 'wallets.paritySignerLabel',
};

const Wallets = forwardRef<HTMLDivElement, Props>(({ className }, ref) => {
  const { t } = useI18n();
  const { getLiveAccounts, toggleActiveAccount } = useAccount();

  const [query, setQuery] = useState('');

  const wallets = useWalletsStructure({ signingType: SigningType.PARITY_SIGNER }, query);
  const watchOnlyAccounts = getLiveAccounts({ signingType: SigningType.WATCH_ONLY });
  const paritySignerAccounts = getLiveAccounts({ signingType: SigningType.PARITY_SIGNER });
  const multisigAccounts = getLiveAccounts({ signingType: SigningType.MULTISIG });

  const searchAccount = (accounts: AccountDS[] = [], query: string = '') => {
    return accounts.filter((account) => {
      return includes(account.name, query) || includes(account.accountId, query);
    });
  };

  const searchedParitySignerAccounts = searchAccount(
    paritySignerAccounts.filter((a) => !a.walletId),
    query,
  );
  const searchedWatchOnlyAccounts = searchAccount(watchOnlyAccounts, query);
  const searchedMultisigAccounts = searchAccount(multisigAccounts, query);

  const accountGroups = [
    {
      label: GroupLabels[SigningType.MULTISIG],
      accounts: searchedMultisigAccounts,
    },
    {
      label: GroupLabels[WalletType.MULTISHARD_PARITY_SIGNER],
      accounts: wallets,
    },
    {
      label: GroupLabels[SigningType.PARITY_SIGNER],
      accounts: searchedParitySignerAccounts,
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
        onChange={setQuery}
      />

      <div className="flex-1 flex flex-col overflow-auto gap-2.5">
        {accountGroups
          .filter(({ accounts }) => accounts.length > 0)
          .map(({ label, accounts }) => (
            <div key={label} className="border shadow-surface rounded-2lg bg-shade-10 font-semibold text-2xs">
              <div className="flex items-center uppercase text-neutral-variant p-2.5">
                {t(label)}
                <div className="ml-1 flex items-center justify-center bg-shade-20 w-4 h-4 rounded">
                  {accounts.length}
                </div>
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
                              <li className="h-10 gap-x-1 flex w-full items-center">
                                <Checkbox
                                  className="mr-1.5"
                                  checked={(account as WalletStructure).isActive}
                                  onChange={(e) => selectWallet(account as WalletStructure, e.target.checked)}
                                />

                                <div className="flex flex-1 gap-x-1 overflow-hidden">
                                  <p className="text-neutral text-sm text-semibold truncate">{account.name}</p>
                                  <div className="ml-1 flex items-center justify-center bg-shade-20 w-4 h-4 rounded">
                                    {(account as WalletStructure).amount}
                                  </div>
                                </div>
                              </li>
                            }
                          >
                            {/* Root accounts */}
                            <ul className="bg-shade-2">
                              {(account as WalletStructure).rootAccounts.map((rootAccount) => (
                                <Expandable
                                  itemClass="px-2 hover:bg-shade-10"
                                  key={rootAccount.id}
                                  alwaysActive={query.length > 0}
                                  item={
                                    <li className="h-10 gap-x-1 flex w-full items-center">
                                      <Checkbox
                                        className="mr-1.5"
                                        checked={rootAccount.isActive}
                                        onChange={(e) => selectRootAccount(rootAccount, e.target.checked)}
                                      />

                                      <div className="flex flex-1 gap-x-1 items-center overflow-hidden">
                                        <div className="relative">
                                          <Identicon
                                            address={rootAccount.accountId}
                                            signType={rootAccount.signingType}
                                            background={false}
                                          />
                                        </div>

                                        <p className="text-neutral-variant text-sm text-semibold truncate">
                                          {rootAccount.name}
                                        </p>
                                        <div className="ml-1 flex items-center justify-center bg-shade-20 w-4 h-4 rounded">
                                          {rootAccount.amount}
                                        </div>
                                      </div>
                                    </li>
                                  }
                                >
                                  <ul className="bg-shade-5">
                                    {/* Chains */}
                                    {rootAccount.chains.map((chain) => (
                                      <Expandable
                                        itemClass="px-2 hover:bg-shade-10"
                                        key={chain.chainId}
                                        alwaysActive={query.length > 0}
                                        item={
                                          <li className="h-10 gap-x-1 flex w-full items-center">
                                            <Checkbox
                                              checked={chain.isActive}
                                              onChange={(e) => selectChain(chain, e.target.checked)}
                                            />

                                            <div className="flex flex-1 ml-0.5 items-center gap-x-1 overflow-hidden h-full">
                                              <div className="rounded-full border border-shade-30 w-[5px] h-[5px] box-border start-tree relative"></div>
                                              <div className="flex items-center uppercase text-shade-40">
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
                                          </li>
                                        }
                                      >
                                        <ul>
                                          {/* Chain accounts */}
                                          {chain.accounts.map((chainAccount) => (
                                            <li
                                              className="h-10 px-2 flex items-center hover:bg-shade-10 tree-wrapper"
                                              key={chainAccount.id}
                                            >
                                              <Checkbox
                                                checked={chainAccount.isActive}
                                                onChange={() => toggleActiveAccount(chainAccount.id || '')}
                                              />

                                              <div className="flex flex-1 ml-1.5 justify-between gap-x-1 items-center h-full">
                                                <div className="grid grid-rows-2 grid-flow-col gap-x-1 h-full overflow-hidden">
                                                  <div className="row-span-2 self-center relative w-[14px] h-[5px] ml-0.5 middle-tree">
                                                    <div className="bg-shade-30 absolute w-[9px] h-[1px] top-[2px] left-[1px]"></div>
                                                    <div className="border-shade-30 absolute rounded-full border w-[5px] h-[5px] box-border top-0 right-0"></div>
                                                  </div>

                                                  <Address
                                                    className="row-span-2 self-center"
                                                    address={chainAccount.accountId || ''}
                                                    signType={chainAccount.signingType}
                                                    name={chainAccount.name}
                                                    subName={getShortAddress(chainAccount.accountId || '', 8)}
                                                    size={24}
                                                  />
                                                </div>

                                                <Explorers
                                                  explorers={chain.explorers}
                                                  address={chainAccount.accountId || ''}
                                                />
                                              </div>
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
                          <li className="h-10 px-2 flex items-center hover:bg-shade-10" key={(account as AccountDS).id}>
                            <Checkbox
                              className="mr-1.5"
                              checked={(account as AccountDS).isActive}
                              onChange={() => toggleActiveAccount((account as AccountDS).id || '')}
                            />

                            <div className="flex flex-1 gap-x-1 overflow-hidden">
                              <Address
                                address={(account as AccountDS).accountId || ''}
                                signType={(account as AccountDS).signingType}
                                name={account.name}
                                size={24}
                              />
                            </div>
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

      <div className="bottom-0 w-full border-t border-shade-10 flex flex-col gap-y-1 -mx-2.5 px-2.5">
        <ButtonLink
          to={Paths.WATCH_ONLY}
          className="w-fit"
          prefixElement={<Icon name="addLine" size={16} />}
          pallet="primary"
          variant="text"
        >
          {t('wallets.addWatchOnlyButton')}
        </ButtonLink>
        <ButtonLink
          to={Paths.PARITY}
          className="w-fit"
          prefixElement={<Icon name="qrLine" size={16} />}
          pallet="primary"
          variant="text"
        >
          {t('wallets.addByParitySignerButton')}
        </ButtonLink>
        <ButtonLink
          to={Paths.CREATE_MULTISIG_ACCOUNT}
          className="w-full"
          prefixElement={<Icon name="multisigOutline" size={16} />}
          pallet="primary"
          variant="fill"
        >
          {t('wallets.addMultisigWalletButton')}
        </ButtonLink>
      </div>
    </div>
  );
});

export default Wallets;
