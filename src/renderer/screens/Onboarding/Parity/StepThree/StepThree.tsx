import { Menu } from '@headlessui/react';
import { u8aToHex } from '@polkadot/util';
import cn from 'classnames';
import keyBy from 'lodash/keyBy';
import { FormEvent, useEffect, useState } from 'react';
import { IndexableType } from 'dexie';

import { AccountsList, Explorers } from '@renderer/components/common';
import { AddressInfo, SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { BaseModal, Button, Icon, Identicon, Input } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { Chain } from '@renderer/domain/chain';
import { ChainId, PublicKey } from '@renderer/domain/shared-kernel';
import useToggle from '@renderer/hooks/useToggle';
import { toAddress } from '@renderer/services/balance/common/utils';
import { useChains } from '@renderer/services/network/chainsService';
import { toPublicKey } from '@renderer/utils/address';
import { getShortAddress } from '@renderer/utils/strings';
import './StepThree.css';
import { createChainAccount, createMainAccount, createSimpleWallet, Wallet, WalletType } from '@renderer/domain/wallet';
import { useWallet } from '@renderer/services/wallet/walletService';

type Props = {
  qrData: SeedInfo[];
  onNextStep: () => void;
  onPrevStep: () => void;
};

const StepThree = ({ qrData, onNextStep }: Props) => {
  const { t } = useI18n();

  const { getChainsData, sortChains } = useChains();
  const [isModalOpen, toggleModal] = useToggle();
  const { addWallet, toggleActiveWallet } = useWallet();

  const [chains, setChains] = useState<Chain[]>([]);
  const [chainsObject, setChainsObject] = useState<Record<string, Chain>>({});

  const [inactiveWallets, setInactiveWallets] = useState<Record<string, boolean>>({});
  const [walletNames, setWalletNames] = useState<Record<string, string>>({});

  const [currentPublicKey, setCurrentPublicKey] = useState<PublicKey>();
  const [accounts, setAccounts] = useState<
    {
      address: string;
      derivedKeys: Record<string, AddressInfo[]>;
    }[]
  >([]);

  useEffect(() => {
    (async () => {
      const chains = await getChainsData();
      setChains(sortChains(chains));
      setChainsObject(keyBy(chains, 'chainId'));

      qrData.forEach((data, index) => {
        setWalletNames((prev) => ({ ...prev, [getWalletId(index)]: data.name }));

        const newAccount = {
          address: toAddress(u8aToHex(data.multiSigner?.public), 0),
          derivedKeys: groupDerivedKeys(data.derivedKeys),
        };
        setAccounts((prev) => [...prev, newAccount]);
      });
    })();
  }, []);

  const groupDerivedKeys = (derivedKeys: AddressInfo[]): Record<string, AddressInfo[]> => {
    return derivedKeys.reduce((acc, key) => {
      const genesisHash = u8aToHex(key.genesisHash);

      if (acc[genesisHash]) {
        acc[genesisHash].push(key);
      } else {
        acc[genesisHash] = [key];
      }

      return acc;
    }, {} as Record<string, AddressInfo[]>);
  };

  const getWalletId = (accountIndex: number, chainId?: string, derivedKeyIndex?: number) =>
    `${accountIndex}${chainId ? `-${chainId}` : ''}${derivedKeyIndex !== undefined ? `-${derivedKeyIndex}` : ''}`;

  const updateWalletName = (name: string, accountIndex: number, chainId?: string, derivedKeyIndex?: number) => {
    setWalletNames((prev) => {
      const walletId = getWalletId(accountIndex, chainId, derivedKeyIndex);

      return { ...prev, [walletId]: name };
    });
  };

  const toggleWallet = (accountIndex: number, chainId?: string, derivedKeyIndex?: number) => {
    const walletId = getWalletId(accountIndex, chainId, derivedKeyIndex);

    setInactiveWallets((prev) => {
      return { ...prev, [walletId]: !prev[walletId] };
    });
  };

  const addNewAccount = () => {
    // TODO: Add new account
  };

  const walletIds = accounts.reduce((acc, { derivedKeys }, accountIndex) => {
    const derivedKeysIds = Object.keys(derivedKeys).map((chainId) =>
      derivedKeys[chainId].map((_, index) => getWalletId(accountIndex, chainId, index)),
    );

    return [...acc, getWalletId(accountIndex), ...derivedKeysIds.flat()];
  }, [] as string[]);

  const activeWalletsHaveName = walletIds.every((walletId) => inactiveWallets[walletId] || walletNames[walletId]);

  const saveMainAccount = async (address: string, accountIndex: number) => {
    const mainAccountId = getWalletId(accountIndex);

    const wallet = createSimpleWallet({
      name: walletNames[mainAccountId],
      type: WalletType.PARITY,
      mainAccounts: [
        createMainAccount({
          accountId: address,
          publicKey: toPublicKey(address) || '0x',
        }),
      ],
      chainAccounts: [],
    });

    const mainWalletId = await addWallet(wallet);

    toggleActiveWallet(mainWalletId);

    return mainWalletId;
  };

  const createDerivedAccounts = (
    derivedKeys: AddressInfo[],
    chainId: ChainId,
    accountIndex: number,
    mainWalletId: IndexableType,
  ): Wallet[] => {
    const chainAccounts = derivedKeys.reduce((acc, derivedKey, index) => {
      const walletId = getWalletId(accountIndex, chainId, index);

      if (inactiveWallets[walletId]) return acc;

      return [
        ...acc,
        createSimpleWallet({
          name: walletNames[walletId],
          type: WalletType.PARITY,
          parentWalletId: mainWalletId,
          mainAccounts: [],
          chainAccounts: [
            createChainAccount({
              accountId: derivedKey.address,
              publicKey: toPublicKey(derivedKey.address) || '0x',
              chainId: chainId as ChainId,
            }),
          ],
        }),
      ];
    }, [] as Wallet[]);

    return chainAccounts;
  };

  const createWallets = async (event: FormEvent) => {
    event.preventDefault();

    const promises = accounts.map(async ({ address, derivedKeys }, accountIndex) => {
      let mainWalletId: IndexableType;

      try {
        mainWalletId = await saveMainAccount(address, accountIndex);
      } catch (e) {
        console.warn('Error saving main account', e);
      }

      const chainIds = Object.keys(derivedKeys);

      const chainWallets = chainIds
        .map((chainId) => {
          const chainDerivedKeys = derivedKeys[chainId];

          return createDerivedAccounts(chainDerivedKeys, chainId as ChainId, accountIndex, mainWalletId);
        })
        .flat();

      return chainWallets.map((chainWallet) => addWallet(chainWallet));
    });

    try {
      await Promise.all(promises);
    } catch (e) {
      console.warn('Error saving wallets', e);
    }

    onNextStep();
  };

  return (
    <div className="flex h-full flex-col gap-10 justify-center items-center pt-7.5">
      <div className="flex flex-col items-center bg-slate-50 rounded-2lg w-full p-5">
        <h2 className="text-xl font-semibold text-neutral mb-5">{t('onboarding.paritysigner.choseWalletNameLabel')}</h2>
        <form
          id="stepForm"
          className="w-full max-h-[370px] overflow-auto p-4 bg-white shadow-surface rounded-2lg mb-10"
          onSubmit={createWallets}
        >
          <div className="flex flex-col gap-2.5">
            {accounts.map((account, accountIndex) => (
              <div key={getWalletId(accountIndex)}>
                <div className="flex w-full gap-4">
                  <div className="flex-1">
                    <Input
                      disabled
                      disabledStyle={inactiveWallets[getWalletId(accountIndex)]}
                      placeholder={t('onboarding.paritysigner.accountAddressPlaceholder')}
                      value={getShortAddress(account.address, 10)}
                      wrapperClass={cn('flex items-center')}
                      prefixElement={<Identicon size={20} address={account.address} background={false} />}
                      suffixElement={
                        <Menu>
                          <Menu.Button className={'hover:bg-primary hover:text-white px-1 rounded-2xl'}>
                            {t('accountList.menuButton')}
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
                                  onClick={() => {
                                    setCurrentPublicKey(toPublicKey(account.address));
                                    toggleModal();
                                  }}
                                  className={cn('font-normal text-neutral', active && 'bg-primary text-white')}
                                  prefixElement={<Icon as="img" name="checkmark" />}
                                >
                                  {t('onboarding.paritysigner.checkAddress')}
                                </Button>
                              )}
                            </Menu.Item>
                          </Menu.Items>
                        </Menu>
                      }
                    />
                  </div>
                  <div className="flex flex-1 items-center">
                    <Input
                      className="text-primary"
                      disabled={inactiveWallets[getWalletId(accountIndex)]}
                      disabledStyle={inactiveWallets[getWalletId(accountIndex)]}
                      wrapperClass="flex flex-1 items-center"
                      placeholder={t('onboarding.walletNamePlaceholder')}
                      onChange={(e) => updateWalletName(e.target.value, accountIndex)}
                      value={walletNames[getWalletId(accountIndex)] || ''}
                      suffixElement={
                        walletNames[getWalletId(accountIndex)] && (
                          <Button
                            variant="text"
                            pallet="dark"
                            weight="xs"
                            onClick={() => updateWalletName('', accountIndex)}
                          >
                            <Icon name="clearOutline" size={20} />
                          </Button>
                        )
                      }
                    />

                    {accounts.length > 1 ||
                      (Object.values(account.derivedKeys).length > 0 && (
                        <Button
                          variant="text"
                          pallet={inactiveWallets[getWalletId(accountIndex)] ? 'dark' : 'error'}
                          className="ml-4 px-0"
                          onClick={() => toggleWallet(accountIndex)}
                        >
                          {inactiveWallets[getWalletId(accountIndex)] ? (
                            <Icon name="removeCutout" size={24} />
                          ) : (
                            <Icon name="removeLine" size={24} />
                          )}
                        </Button>
                      ))}
                  </div>
                </div>
                {Object.entries(account.derivedKeys).length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    {Object.entries(account.derivedKeys).map(([chainId, derivedKeys]) => (
                      <div key={chainId} className="flex flex-col gap-2.5">
                        <div className="flex items-center mt-2.5">
                          <div className="rounded-full border border-shade-30 w-[5px] h-[5px] box-border ml-4.5 mr-4 start-tree relative"></div>
                          <div className="flex items-center text-neutral-variant uppercase font-bold text-2xs">
                            {t('onboarding.paritysigner.derivedLabel')}
                            <img
                              className="inline-block mx-1"
                              width="14px"
                              height="14px"
                              alt={chainsObject[chainId].name}
                              src={chainsObject[chainId].icon}
                            />
                            {chainsObject[chainId].name}
                          </div>
                        </div>
                        {derivedKeys.map(({ address }, derivedKeyIndex) => (
                          <div
                            key={getWalletId(accountIndex, chainId, derivedKeyIndex)}
                            className="tree-wrapper flex gap-4"
                          >
                            <div className="flex-1 flex items-center">
                              <div className="relative w-[14px] h-[5px] ml-5 mr-4 middle-tree">
                                <div className="bg-shade-30 absolute w-[9px] h-[1px] top-[2px] left-[1px]"></div>
                                <div className="border-shade-30 absolute rounded-full border w-[5px] h-[5px] box-border top-0 right-0"></div>
                              </div>
                              <Input
                                disabled
                                disabledStyle={inactiveWallets[getWalletId(accountIndex, chainId, derivedKeyIndex)]}
                                placeholder={t('onboarding.paritysigner.accountAddressPlaceholder')}
                                value={getShortAddress(address, 10)}
                                wrapperClass="flex flex-1 items-center"
                                prefixElement={<Identicon size={20} address={address} background={false} />}
                                suffixElement={<Explorers chain={chainsObject[chainId]} address={address} />}
                              />
                            </div>
                            <div className="flex flex-1 items-center">
                              <Input
                                className="text-primary"
                                disabled={inactiveWallets[getWalletId(accountIndex, chainId, derivedKeyIndex)]}
                                disabledStyle={inactiveWallets[getWalletId(accountIndex, chainId, derivedKeyIndex)]}
                                wrapperClass="flex flex-1 items-center"
                                placeholder={t('onboarding.walletNamePlaceholder')}
                                value={walletNames[getWalletId(accountIndex, chainId, derivedKeyIndex)] || ''}
                                onChange={(e) =>
                                  updateWalletName(e.target.value, accountIndex, chainId, derivedKeyIndex)
                                }
                                suffixElement={
                                  walletNames[getWalletId(accountIndex, chainId, derivedKeyIndex)] && (
                                    <Button
                                      variant="text"
                                      pallet="dark"
                                      weight="xs"
                                      onClick={() => updateWalletName('', accountIndex, chainId, derivedKeyIndex)}
                                    >
                                      <Icon name="clearOutline" size={20} />
                                    </Button>
                                  )
                                }
                              />
                              <Button
                                variant="text"
                                pallet={
                                  inactiveWallets[getWalletId(accountIndex, chainId, derivedKeyIndex)]
                                    ? 'dark'
                                    : 'error'
                                }
                                className="ml-4 px-0"
                                onClick={() => toggleWallet(accountIndex, chainId, derivedKeyIndex)}
                              >
                                {inactiveWallets[getWalletId(accountIndex, chainId, derivedKeyIndex)] ? (
                                  <Icon name="removeCutout" size={24} />
                                ) : (
                                  <Icon name="removeLine" size={24} />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button variant="text" pallet="primary" className="m-auto" onClick={addNewAccount}>
            <Icon name="addLine" size={24} alt={t('onboarding.paritysigner.addAccount')} />
          </Button>
        </form>

        <Button
          form="stepForm"
          type="submit"
          weight="lg"
          variant="fill"
          pallet="primary"
          disabled={!activeWalletsHaveName}
        >
          {activeWalletsHaveName
            ? t('onboarding.confirmAccountsListButton')
            : t('onboarding.paritysigner.typeNameButton')}
        </Button>
      </div>

      <BaseModal
        closeButton
        className="p-4 max-w-2xl"
        title={t('onboarding.yourAccountsLabel')}
        description={t('onboarding.readAccountsLabel')}
        isOpen={isModalOpen}
        onClose={toggleModal}
      >
        <AccountsList className="pt-6 -mx-4" chains={chains} publicKey={currentPublicKey} />
      </BaseModal>
    </div>
  );
};

export default StepThree;
