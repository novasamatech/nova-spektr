import { FormEvent, useEffect, useState } from 'react';
import { Menu } from '@headlessui/react';
import cn from 'classnames';
import { hexToU8a, u8aToHex } from '@polkadot/util';

import useToggle from '@renderer/hooks/useToggle';
import { AccountsList } from '@renderer/components/common';
import { BaseModal, Button, Icon, Identicon, Input } from '@renderer/components/ui';
import { createMainAccount, createSimpleWallet, WalletType } from '@renderer/domain/wallet';
import { useChains } from '@renderer/services/network/chainsService';
import { Chain } from '@renderer/domain/chain';
import { useWallet } from '@renderer/services/wallet/walletService';
import { getShortAddress } from '@renderer/utils/strings';
import { useI18n } from '@renderer/context/I18nContext';
import { SeedInfo, AddressInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import './StepThree.css';
import { toAddress } from '@renderer/services/balance/common/utils';
import { cloneDeep, keyBy } from 'lodash';
import { encodeAddress } from '@polkadot/util-crypto';
import { Explorer } from '@renderer/components/ui/Icon/data/explorer';

const ExplorerIcons: Record<string, Explorer> = {
  Polkascan: 'polkascan',
  'Sub.ID': 'subid',
  Subscan: 'subscan',
  Statescan: 'statescan',
};

type Props = {
  qrData: SeedInfo;
  onNextStep: () => void;
  onPrevStep: () => void;
};

type DerivedKey = AddressInfo & {
  disabled?: boolean;
  name?: string;
};

const StepThree = ({ qrData, onNextStep }: Props) => {
  const { t } = useI18n();

  const { getChainsData, sortChains } = useChains();
  const { addWallet, setActiveWallet } = useWallet();
  const [isModalOpen, toggleModal] = useToggle();

  const [walletName, setWalletName] = useState('');
  const [chains, setChains] = useState<Chain[]>([]);
  const [chainsObject, setChainsObject] = useState<Record<string, Chain>>({});

  useEffect(() => {
    (async () => {
      const chains = await getChainsData();
      setChains(sortChains(chains));

      setChainsObject(keyBy(chains, 'chainId'));
    })();
  }, []);


  const publicKey = u8aToHex(qrData.multiSigner?.public) || '0x';
  const ss58Address = toAddress(publicKey, 0);

  const getName = (path: string = '') => {
    const name = path.replaceAll('/', ' ').trim();

    return name;
  };

  const groupDerivedKeys = (derivedKeys: DerivedKey[]): Record<string, DerivedKey[]> => {
    // groupe derivedKeys by genersisHash
    const groupedDerivedKeys: Record<string, DerivedKey[]> = {};
    derivedKeys.forEach((derivedKey) => {
      const genersisHash = u8aToHex(derivedKey.genesisHash);

      if (groupedDerivedKeys[genersisHash]) {
        groupedDerivedKeys[genersisHash].push({
          ...derivedKey,
          name: getName(derivedKey.derivationPath),
        });
      } else {
        groupedDerivedKeys[genersisHash] = [
          {
            ...derivedKey,
            name: getName(derivedKey.derivationPath),
          },
        ];
      }
    });

    return groupedDerivedKeys;
  };

  const [accounts, setAccounts] = useState<
    {
      address: string;
      name: string;
      disabled?: boolean;
      derivedKeys: Record<string, DerivedKey[]>;
    }[]
  >([{ address: ss58Address, name: qrData.name, derivedKeys: groupDerivedKeys(qrData.derivedKeys) }]);

  const createWallet = async (event: FormEvent) => {
    event.preventDefault();

    if (!publicKey || publicKey.length === 0) return;

    const newWallet = createSimpleWallet({
      name: walletName,
      type: WalletType.PARITY,
      chainAccounts: [],
      mainAccounts: [createMainAccount({ accountId: ss58Address, publicKey })],
    });

    const walletId = await addWallet(newWallet);
    await setActiveWallet(walletId);
    onNextStep();
  };

  const updateWalletName = (name: string, accountIndex: number, chainId?: string, derrivedKeyIndex?: number) => {
    setAccounts((prev) => {
      const newAccounts = cloneDeep(prev);

      if (chainId && derrivedKeyIndex !== undefined) {
        newAccounts[accountIndex].derivedKeys[chainId][derrivedKeyIndex].name = name;
      } else {
        newAccounts[accountIndex].name = name;
      }

      return newAccounts;
    });
  };

  const toggleWallet = (accountIndex: number, chainId?: string, derrivedKeyIndex?: number) => {
    setAccounts((prev) => {
      const newAccounts = cloneDeep(prev);

      if (chainId && derrivedKeyIndex !== undefined) {
        newAccounts[accountIndex].derivedKeys[chainId][derrivedKeyIndex].disabled =
          !newAccounts[accountIndex].derivedKeys[chainId][derrivedKeyIndex].disabled;
      } else {
        newAccounts[accountIndex].disabled = !newAccounts[accountIndex].disabled;
      }

      return newAccounts;
    });
  };

  const addNewAccount = () => {
    // TODO: Add new account
  };

  return (
    <div className="flex h-full flex-col gap-10 justify-center items-center pt-7.5">
      <div className="flex flex-col items-center bg-slate-50 rounded-2lg w-full p-5">
        <h2 className="text-xl font-semibold text-neutral mb-5">{t('onboarding.paritysigner.choseWalletNameLabel')}</h2>
        <form id="stepForm" className="w-full p-4 bg-white shadow-surface rounded-2lg mb-10" onSubmit={createWallet}>
          <div className="flex flex-col gap-2.5">
            {accounts.map((account, accountIndex) => (
              <div key={account.address + accountIndex}>
                <div className="flex w-full gap-4">
                  <div className="flex-1">
                    <Input
                      disabled
                      placeholder={t('onboarding.paritysigner.accountAddressPlaceholder')}
                      value={getShortAddress(ss58Address, 10)}
                      wrapperClass="flex items-center"
                      prefixElement={<Identicon size={20} address={ss58Address} background={false} />}
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
                                  onClick={toggleModal}
                                  className={cn('font-normal text-neutral', active && 'bg-primary text-white')}
                                  prefixElement={<Icon as="img" name="checkmark" />}
                                >
                                  {t('Check accounts')}
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
                      wrapperClass="flex flex-1 items-center"
                      placeholder={t('onboarding.walletNamePlaceholder')}
                      onChange={(e) => updateWalletName(e.target.value, accountIndex)}
                    />

                    {accounts.length > 1 && (
                      <Button
                        variant="text"
                        pallet={account.disabled ? 'dark' : 'error'}
                        className="ml-4 px-0"
                        onClick={() => toggleWallet(accountIndex)}
                      >
                        {account.disabled ? (
                          <Icon name="removeCutout" size={24} />
                        ) : (
                          <Icon name="removeLine" size={24} />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {Object.entries(account.derivedKeys).length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    {Object.entries(account.derivedKeys).map(([chainId, derivedKeys]) => (
                      <div key={chainId} className="flex flex-col gap-2.5">
                        <div className="flex items-center mt-2.5">
                          <div className="rounded-full border border-shade-30 w-[5px] h-[5px] box-border ml-[18px] mr-4 start-tree relative"></div>
                          <span className="text-neutral-variant uppercase font-bold text-2xs leading-[14px]">
                            derived accounts on{' '}
                            <img
                              className="inline-block"
                              width="14px"
                              height="14px"
                              alt={chainsObject[chainId].name}
                              src={chainsObject[chainId].icon}
                            />{' '}
                            {chainsObject[chainId].name}
                          </span>
                        </div>
                        {derivedKeys.map(({ address, name, disabled }, derrivedKeyIndex) => (
                          <div key={address + derrivedKeyIndex} className="tree-wrapper flex gap-4">
                            <div className="flex-1 flex items-center">
                              <div className="relative w-[14px] h-[5px] ml-5 mr-4 middle-tree">
                                <div className="bg-shade-30 absolute w-[9px] h-[1px] top-[2px] left-[1px]"></div>
                                <div className="border-shade-30 absolute rounded-full border w-[5px] h-[5px] box-border top-0 right-0"></div>
                              </div>
                              <Input
                                disabled
                                placeholder={t('onboarding.paritysigner.accountAddressPlaceholder')}
                                value={getShortAddress(address, 10)}
                                wrapperClass="flex flex-1 items-center"
                                prefixElement={<Identicon size={20} address={address} background={false} />}
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
                                      {chainsObject[chainId].explorers?.map(
                                        ({ name, account }) =>
                                          account && (
                                            <Menu.Item key={name}>
                                              {({ active }) => (
                                                <a
                                                  className={cn(
                                                    'rounded-2lg flex items-center gap-1 p-2.5 font-normal select-none',
                                                    active ? 'bg-primary text-white' : 'bg-white text-neutral',
                                                  )}
                                                  href={account.replace(
                                                    '{address}',
                                                    encodeAddress(publicKey, chainsObject[chainId].addressPrefix),
                                                  )}
                                                  rel="noopener noreferrer"
                                                  target="_blank"
                                                >
                                                  <Icon as="img" name={ExplorerIcons[name]} />{' '}
                                                  {t('accountList.explorerButton', { name })}
                                                </a>
                                              )}
                                            </Menu.Item>
                                          ),
                                      )}
                                    </Menu.Items>
                                  </Menu>
                                }
                              />
                            </div>
                            <div className="flex flex-1 items-center">
                              <Input
                                disabled={account.disabled || disabled}
                                wrapperClass="flex flex-1 items-center"
                                placeholder={t('onboarding.walletNamePlaceholder')}
                                value={name}
                                onChange={(e) =>
                                  updateWalletName(e.target.value, accountIndex, chainId, derrivedKeyIndex)
                                }
                              />
                              <Button
                                variant="text"
                                pallet={account.disabled || disabled ? 'dark' : 'error'}
                                className="ml-4 px-0"
                                onClick={() => toggleWallet(accountIndex, chainId, derrivedKeyIndex)}
                              >
                                {account.disabled || disabled ? (
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
          disabled={!publicKey || !walletName}
        >
          {!publicKey || !walletName
            ? t('onboarding.paritysigner.typeNameButton')
            : t('onboarding.confirmAccountsListButton')}
        </Button>
      </div>

      <BaseModal
        closeButton
        className="p-4 max-w-2xl"
        title={t('onboarding.youAccountsLabel')}
        description={t('onboarding.readAccountsLabel')}
        isOpen={isModalOpen}
        onClose={toggleModal}
      >
        <AccountsList className="pt-6 -mx-4" chains={chains} publicKey={publicKey} />
      </BaseModal>
    </div>
  );
};

export default StepThree;
