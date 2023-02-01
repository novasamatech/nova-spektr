import { Menu } from '@headlessui/react';
import { u8aToHex } from '@polkadot/util';
import cn from 'classnames';
import { IndexableType } from 'dexie';
import keyBy from 'lodash/keyBy';
import { FormEvent, useEffect, useState } from 'react';

import { AccountsList, Explorers } from '@renderer/components/common';
import { AddressInfo, SeedInfo, SimpleSeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { BaseModal, Button, Icon, Identicon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Account, createAccount } from '@renderer/domain/account';
import { Chain } from '@renderer/domain/chain';
import { ChainId, HexString, PublicKey, SigningType, WalletType } from '@renderer/domain/shared-kernel';
import { useToggle } from '@renderer/shared/hooks';
import ScanMoreModal from '@renderer/screens/Onboarding/Parity/ScanMoreModal/ScanMoreModal';
import { useAccount } from '@renderer/services/account/accountService';
import { toAddress } from '@renderer/services/balance/common/utils';
import { useChains } from '@renderer/services/network/chainsService';
import { toPublicKey } from '@renderer/utils/address';
import { getShortAddress } from '@renderer/utils/strings';
import { useWallet } from '@renderer/services/wallet/walletService';
import { createWallet } from '@renderer/domain/wallet';
import './StepThree.css';

type Props = {
  qrData: SeedInfo[];
  onNextStep: () => void;
};

const StepThree = ({ qrData, onNextStep }: Props) => {
  const { t } = useI18n();

  const { getChainsData, sortChains } = useChains();
  const [isAccountsModalOpen, toggleAccountsModal] = useToggle();
  const [isQrModalOpen, toggleQrModal] = useToggle();
  const { addAccount } = useAccount();
  const { addWallet } = useWallet();

  const [chains, setChains] = useState<Chain[]>([]);
  const [chainsObject, setChainsObject] = useState<Record<string, Chain>>({});

  const [inactiveAccounts, setInactiveAccounts] = useState<Record<string, boolean>>({});
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});

  const [currentPublicKey, setCurrentPublicKey] = useState<PublicKey>();
  const [accounts, setAccounts] = useState<SimpleSeedInfo[]>([]);
  const [walletName, setWalletName] = useState('');

  useEffect(() => {
    (async () => {
      const chains = await getChainsData();
      setChains(sortChains(chains));
      setChainsObject(keyBy(chains, 'chainId'));

      const names = qrData.reduce((acc, data, index) => ({ ...acc, [getAccountId(index)]: data.name }), {});
      setAccountNames(names);
      setAccounts(qrData.map(formatAccount));
    })();
  }, []);

  const formatAccount = (newAccount: SeedInfo): SimpleSeedInfo => {
    return {
      address: newAccount.multiSigner ? toAddress(u8aToHex(newAccount.multiSigner?.public), 0) : '',
      derivedKeys: groupDerivedKeys(newAccount.derivedKeys),
    };
  };

  const mergeNewAccounts = (newAccounts: SeedInfo[]) => {
    const { oldAccs, newAccs, newNames } = newAccounts.reduce(
      (acc, current) => {
        if (current.derivedKeys.length === 0) {
          acc.newAccs.push(formatAccount(current));
          acc.newNames.push(current.name);
        } else {
          const address = u8aToHex(current.multiSigner?.public);
          const rootAccountIndex = acc.oldAccs.findIndex((a) => toPublicKey(a.address) === address);
          if (rootAccountIndex >= 0) {
            acc.oldAccs[rootAccountIndex] = formatAccount(current);
          } else {
            acc.oldAccs.push(formatAccount(current));
          }
        }

        return acc;
      },
      { oldAccs: accounts, newAccs: [], newNames: [] } as {
        oldAccs: SimpleSeedInfo[];
        newAccs: SimpleSeedInfo[];
        newNames: string[];
      },
    );

    const newLastIndex = parseInt(Object.keys(accountNames).pop()?.split('-')[0] || '0') + 1;
    const namesMap = newNames.reduce((_, name, index) => ({ [getAccountId(index + newLastIndex)]: name }), {});

    setAccountNames({ ...accountNames, ...namesMap });
    setAccounts(oldAccs.concat(newAccs));
  };

  const groupDerivedKeys = (derivedKeys: AddressInfo[]): Record<HexString, AddressInfo[]> => {
    return derivedKeys.reduce<Record<HexString, AddressInfo[]>>((acc, key) => {
      const genesisHash = u8aToHex(key.genesisHash);

      if (acc[genesisHash]) {
        acc[genesisHash].push(key);
      } else {
        acc[genesisHash] = [key];
      }

      return acc;
    }, {});
  };

  const getAccountId = (accountIndex: number, chainId?: string, derivedKeyIndex?: number): string =>
    `${accountIndex}${chainId ? `-${chainId}` : ''}${derivedKeyIndex !== undefined ? `-${derivedKeyIndex}` : ''}`;

  const updateAccountName = (name: string, accountIndex: number, chainId?: string, derivedKeyIndex?: number) => {
    setAccountNames((prev) => {
      const accountId = getAccountId(accountIndex, chainId, derivedKeyIndex);

      return { ...prev, [accountId]: name };
    });
  };

  const toggleAccount = (accountIndex: number, chainId?: string, derivedKeyIndex?: number) => {
    const accountId = getAccountId(accountIndex, chainId, derivedKeyIndex);

    setInactiveAccounts((prev) => {
      return { ...prev, [accountId]: !prev[accountId] };
    });
  };

  const walletIds = accounts.reduce<string[]>((acc, { derivedKeys }, accountIndex) => {
    const derivedKeysIds = Object.keys(derivedKeys).map((chainId) =>
      derivedKeys[chainId as HexString].map((_, index) => getAccountId(accountIndex, chainId, index)),
    );

    return [...acc, getAccountId(accountIndex), ...derivedKeysIds.flat()];
  }, []);

  const activeWalletsHaveName = walletIds.every((walletId) => inactiveAccounts[walletId] || accountNames[walletId]);

  const saveRootAccount = async (address: string, accountIndex: number, walletId: IndexableType) => {
    const rootAccountNameId = getAccountId(accountIndex);

    const rootAccount = createAccount({
      name: accountNames[rootAccountNameId],
      signingType: SigningType.PARITY_SIGNER,
      accountId: address,
      walletId,
    });

    return addAccount(rootAccount);
  };

  const createDerivedAccounts = (
    derivedKeys: AddressInfo[],
    chainId: ChainId,
    accountIndex: number,
    rootAccountId: IndexableType,
    walletId: IndexableType,
  ): Account[] => {
    return derivedKeys.reduce<Account[]>((acc, derivedKey, index) => {
      const accountId = getAccountId(accountIndex, chainId, index);

      if (inactiveAccounts[accountId]) return acc;

      return [
        ...acc,
        createAccount({
          name: accountNames[accountId],
          signingType: SigningType.PARITY_SIGNER,
          rootId: rootAccountId,
          accountId: derivedKey.address,
          chainId: chainId as ChainId,
          walletId,
          derivationPath: derivedKey.derivationPath,
        }),
      ];
    }, []);
  };

  const createWallets = async (event: FormEvent) => {
    event.preventDefault();

    let walletId: IndexableType;

    try {
      walletId = await addWallet(createWallet({ name: walletName, type: WalletType.MULTISHARD_PARITY_SIGNER }));
    } catch (e) {
      console.warn('Error saving main account', e);
    }

    const promises = accounts.map(async ({ address, derivedKeys }, accountIndex) => {
      let rootAccountId: IndexableType;

      try {
        rootAccountId = await saveRootAccount(address, accountIndex, walletId);
      } catch (e) {
        console.warn('Error saving main account', e);
      }

      const derivedAccounts = Object.keys(derivedKeys)
        .map((chainId) => {
          const chainDerivedKeys = derivedKeys[chainId as HexString];

          return createDerivedAccounts(chainDerivedKeys, chainId as ChainId, accountIndex, rootAccountId, walletId);
        })
        .flat();

      return derivedAccounts.map((derivedAccount) => addAccount(derivedAccount));
    });

    try {
      await Promise.all(promises);
    } catch (e) {
      console.warn('Error saving wallets', e);
    }

    onNextStep();
  };

  const fillAccountNames = () => {
    accounts.forEach((account, accountIndex) => {
      Object.entries(account.derivedKeys).forEach(([chainId, derivedKeys]) => {
        const { name: chainName } = chainsObject[chainId];

        derivedKeys.forEach((_, derivedKeyIndex) => {
          const accountId = getAccountId(accountIndex, chainId, derivedKeyIndex);
          const rootAccountId = getAccountId(accountIndex);
          if (accountNames[accountId]) return;

          const accountName = `${accountNames[rootAccountId]}//${chainName.toLowerCase()}//${derivedKeyIndex + 1}`;
          updateAccountName(accountName, accountIndex, chainId, derivedKeyIndex);
        });
      });
    });
  };

  return (
    <div className="flex h-full flex-col gap-10 justify-center items-center pt-7.5">
      <div className="flex flex-col items-center bg-slate-50 rounded-2lg w-full p-5">
        <form id="stepForm" className="w-full max-h-[370px] overflow-auto mb-10" onSubmit={createWallets}>
          <div className="grid grid-cols-2 items-center gap-2.5 p-4 bg-white shadow-surface rounded-2lg mb-4">
            <div>
              <div className="text-neutral font-semibold">{t('onboarding.paritySigner.walletNameLabel')}</div>
              <div className="uppercase text-neutral-variant text-2xs">
                {t('onboarding.paritySigner.walletNameDescription')}
              </div>
            </div>
            <div>
              <Input
                placeholder={t('onboarding.paritySigner.walletNamePlaceholder')}
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2.5 p-4 bg-white shadow-surface rounded-2lg">
            <div className="text-sm text-neutral-variant mb-5">{t('onboarding.paritySigner.choseWalletNameLabel')}</div>

            {accounts.map((account, accountIndex) => (
              <div key={getAccountId(accountIndex)}>
                <div className="grid grid-cols-2 w-full gap-4">
                  {account.address && (
                    <div className="col-span-1">
                      <Input
                        disabled
                        disabledStyle={inactiveAccounts[getAccountId(accountIndex)]}
                        placeholder={t('onboarding.paritySigner.accountAddressPlaceholder')}
                        value={getShortAddress(account.address, 10)}
                        wrapperClass={cn('flex items-center')}
                        prefixElement={<Identicon size={20} address={account.address} background={false} />}
                        suffixElement={
                          <Menu>
                            <Menu.Button className="flex items-center hover:bg-primary hover:text-white px-1 rounded-2xl">
                              <Icon name="options" size={20} />
                            </Menu.Button>
                            <Menu.Items
                              className={
                                'bg-white z-10 absolute right-0 top-0 rounded-2lg shadow-surface w-max border-2 border-shade-5 p-2.5'
                              }
                            >
                              <Menu.Item key={1}>
                                {({ active }) => (
                                  <Button
                                    variant="text"
                                    pallet="dark"
                                    className={cn('font-normal text-neutral', active && 'bg-primary text-white')}
                                    prefixElement={<Icon as="img" name="checkmark" />}
                                    onClick={() => {
                                      setCurrentPublicKey(toPublicKey(account.address));
                                      toggleAccountsModal();
                                    }}
                                  >
                                    {t('onboarding.paritySigner.checkAddress')}
                                  </Button>
                                )}
                              </Menu.Item>
                            </Menu.Items>
                          </Menu>
                        }
                      />
                    </div>
                  )}
                  <div className="col-span-1 flex flex-1 items-center">
                    <Input
                      className="text-primary"
                      disabled={inactiveAccounts[getAccountId(accountIndex)]}
                      disabledStyle={inactiveAccounts[getAccountId(accountIndex)]}
                      wrapperClass="flex flex-1 items-center"
                      placeholder={t('onboarding.paritySigner.accountNamePlaceholder')}
                      value={accountNames[getAccountId(accountIndex)] || ''}
                      suffixElement={
                        accountNames[getAccountId(accountIndex)] && (
                          <Button
                            variant="text"
                            pallet="dark"
                            weight="xs"
                            onClick={() => updateAccountName('', accountIndex)}
                          >
                            <Icon name="clearOutline" size={20} />
                          </Button>
                        )
                      }
                      onChange={(e) => updateAccountName(e.target.value, accountIndex)}
                    />

                    {accounts.length > 1 ||
                      (Object.values(account.derivedKeys).length > 0 && (
                        <Button
                          variant="text"
                          pallet={inactiveAccounts[getAccountId(accountIndex)] ? 'dark' : 'error'}
                          className="ml-4 px-0"
                          onClick={() => toggleAccount(accountIndex)}
                        >
                          {inactiveAccounts[getAccountId(accountIndex)] ? (
                            <Icon name="removeCutout" />
                          ) : (
                            <Icon name="removeLine" />
                          )}
                        </Button>
                      ))}
                  </div>
                </div>
                {Object.entries(account.derivedKeys).length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    {Object.entries(account.derivedKeys).map(([chainId, derivedKeys]) => {
                      const { name, icon, explorers, addressPrefix } = chainsObject[chainId];

                      return (
                        <div key={chainId} className="flex flex-col gap-2.5">
                          <div className="flex items-center mt-2.5">
                            <div className="rounded-full border border-shade-30 w-[5px] h-[5px] box-border ml-4.5 mr-4 start-tree relative"></div>
                            <div className="flex items-center text-neutral-variant uppercase font-bold text-2xs">
                              {t('onboarding.paritySigner.derivedLabel')}
                              <img className="inline-block mx-1" width={14} height={14} alt={name} src={icon} />
                              {name}
                            </div>
                          </div>
                          {derivedKeys.map(({ address }, derivedKeyIndex) => (
                            <div
                              key={getAccountId(accountIndex, chainId, derivedKeyIndex)}
                              className="tree-wrapper flex gap-4"
                            >
                              <div className="flex-1 flex items-center">
                                <div className="relative w-[14px] h-[5px] ml-5 mr-4 middle-tree">
                                  <div className="bg-shade-30 absolute w-[9px] h-[1px] top-[2px] left-[1px]"></div>
                                  <div className="border-shade-30 absolute rounded-full border w-[5px] h-[5px] box-border top-0 right-0"></div>
                                </div>
                                <Input
                                  disabled
                                  disabledStyle={inactiveAccounts[getAccountId(accountIndex, chainId, derivedKeyIndex)]}
                                  placeholder={t('onboarding.paritySigner.accountAddressPlaceholder')}
                                  value={getShortAddress(address, 10)}
                                  wrapperClass="flex flex-1 items-center"
                                  prefixElement={<Identicon size={20} address={address} background={false} />}
                                  suffixElement={
                                    <Explorers explorers={explorers} addressPrefix={addressPrefix} address={address} />
                                  }
                                />
                              </div>
                              <div className="flex flex-1 items-center">
                                <Input
                                  className="text-primary"
                                  disabled={inactiveAccounts[getAccountId(accountIndex, chainId, derivedKeyIndex)]}
                                  disabledStyle={inactiveAccounts[getAccountId(accountIndex, chainId, derivedKeyIndex)]}
                                  wrapperClass="flex flex-1 items-center"
                                  placeholder={t('onboarding.paritySigner.accountNamePlaceholder')}
                                  value={accountNames[getAccountId(accountIndex, chainId, derivedKeyIndex)] || ''}
                                  suffixElement={
                                    accountNames[getAccountId(accountIndex, chainId, derivedKeyIndex)] && (
                                      <Button
                                        variant="text"
                                        pallet="dark"
                                        weight="xs"
                                        onClick={() => updateAccountName('', accountIndex, chainId, derivedKeyIndex)}
                                      >
                                        <Icon name="clearOutline" size={20} />
                                      </Button>
                                    )
                                  }
                                  onChange={(e) =>
                                    updateAccountName(e.target.value, accountIndex, chainId, derivedKeyIndex)
                                  }
                                />
                                <Button
                                  className="ml-4 px-0"
                                  variant="text"
                                  pallet={
                                    inactiveAccounts[getAccountId(accountIndex, chainId, derivedKeyIndex)]
                                      ? 'dark'
                                      : 'error'
                                  }
                                  onClick={() => toggleAccount(accountIndex, chainId, derivedKeyIndex)}
                                >
                                  {inactiveAccounts[getAccountId(accountIndex, chainId, derivedKeyIndex)] ? (
                                    <Icon name="removeCutout" />
                                  ) : (
                                    <Icon name="removeLine" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <Button variant="text" pallet="primary" className="m-auto mt-2.5" onClick={toggleQrModal}>
              <Icon name="addLine" alt={t('onboarding.paritySigner.addAccount')} />
            </Button>
          </div>
        </form>

        {!activeWalletsHaveName ? (
          <Button key="fillNames" weight="lg" variant="fill" pallet="primary" onClick={fillAccountNames}>
            {t('onboarding.paritySigner.autoFillAccountsListButton')}
          </Button>
        ) : (
          <Button
            key="submitForm"
            form="stepForm"
            type="submit"
            weight="lg"
            variant="fill"
            pallet="primary"
            disabled={!activeWalletsHaveName || !walletName}
          >
            {activeWalletsHaveName && walletName
              ? t('onboarding.paritySigner.saveWalletButton')
              : t('onboarding.paritySigner.typeNameButton')}
          </Button>
        )}
      </div>

      <BaseModal
        closeButton
        contentClass="px-4 pb-4 max-w-2xl"
        title={t('onboarding.yourAccountsLabel')}
        description={t('onboarding.readAccountsLabel')}
        isOpen={isAccountsModalOpen}
        onClose={toggleAccountsModal}
      >
        <AccountsList className="pt-6 -mx-4" chains={chains} publicKey={currentPublicKey} />
      </BaseModal>

      <ScanMoreModal isOpen={isQrModalOpen} accounts={accounts} onResult={mergeNewAccounts} onClose={toggleQrModal} />
    </div>
  );
};

export default StepThree;
