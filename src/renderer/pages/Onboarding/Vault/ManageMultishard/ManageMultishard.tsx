import cn from 'classnames';
import { useEffect, useState } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import { u8aToHex } from '@polkadot/util';
import keyBy from 'lodash/keyBy';

import { useI18n } from '@app/providers';
import { ChainTitle } from '@entities/chain';
import { RootExplorers, cnTw, toAccountId, toAddress } from '@shared/lib/utils';
import { AddressWithExplorers, walletModel } from '@entities/wallet';
import { Button, FootnoteText, HeaderTitleText, Icon, IconButton, Input, InputHint, SmallTitleText } from '@shared/ui';
import type { BaseAccount, Chain, ChainAccount, ChainId, HexString } from '@shared/core';
import { AccountType, ChainType, CryptoType, ErrorType, KeyType, SigningType, WalletType } from '@shared/core';
import { type AddressInfo, type CompactSeedInfo, type SeedInfo } from '@entities/transaction';
import { chainsService } from '@shared/api/network';

type WalletForm = {
  walletName: string;
};

type Props = {
  seedInfo: SeedInfo[];
  onBack: () => void;
  onClose: () => void;
  onComplete: () => void;
};

export const ManageMultishard = ({ seedInfo, onBack, onClose, onComplete }: Props) => {
  const { t } = useI18n();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<WalletForm>({
    mode: 'onChange',
    defaultValues: { walletName: '' },
  });

  const [chainsObject, setChainsObject] = useState<Record<ChainId, Chain>>({});
  const [inactiveAccounts, setInactiveAccounts] = useState<Record<string, boolean>>({});
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<CompactSeedInfo[]>([]);

  useEffect(() => {
    const chains = chainsService.getChainsData({ sort: true });
    const chainsMap = keyBy(chains, 'chainId');
    setChainsObject(chainsMap);

    const filteredQrData = seedInfo.map((data) => filterByExistingChains(data, chainsMap));

    const names = filteredQrData.reduce((acc, data, index) => ({ ...acc, [getAccountId(index)]: data.name }), {});
    setAccountNames(names);
    setAccounts(filteredQrData.map(formatAccount));
  }, []);

  const filterByExistingChains = (seedInfo: SeedInfo, chainsMap: Record<ChainId, Chain>): SeedInfo => {
    const derivedKeysForChsains = seedInfo.derivedKeys.filter((key) => Boolean(chainsMap[u8aToHex(key.genesisHash)]));

    return { ...seedInfo, derivedKeys: derivedKeysForChsains };
  };

  const formatAccount = (newAccount: SeedInfo): CompactSeedInfo => {
    return {
      address: newAccount.multiSigner ? toAddress(u8aToHex(newAccount.multiSigner?.public), { prefix: 0 }) : '',
      derivedKeys: groupDerivedKeys(newAccount.derivedKeys),
    };
  };

  const groupDerivedKeys = (derivedKeys: AddressInfo[]): Record<ChainId, AddressInfo[]> => {
    return derivedKeys.reduce<Record<ChainId, AddressInfo[]>>((acc, key) => {
      const genesisHash = u8aToHex(key.genesisHash);

      if (acc[genesisHash]) {
        acc[genesisHash].push(key);
      } else {
        acc[genesisHash] = [key];
      }

      return acc;
    }, {});
  };

  const getAccountId = (accountIndex: number, chainId?: string, derivedKeyIndex?: number): string => {
    return `${accountIndex}${chainId ? `-${chainId}` : ''}${
      derivedKeyIndex !== undefined ? `-${derivedKeyIndex}` : ''
    }`;
  };

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

  const fillAccountNames = () => {
    accounts.forEach((account, accountIndex) => {
      Object.entries(account.derivedKeys).forEach(([chainId, derivedKeys]) => {
        const { name: chainName } = chainsObject[chainId as ChainId];

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

  const createDerivedAccounts = (
    derivedKeys: AddressInfo[],
    chainId: ChainId,
    accountIndex: number,
  ): ChainAccount[] => {
    return derivedKeys.reduce<ChainAccount[]>((acc, derivedKey, index) => {
      const accountId = getAccountId(accountIndex, chainId, index);

      if (!inactiveAccounts[accountId]) {
        acc.push({
          chainId,
          name: accountNames[accountId],
          accountId: toAccountId(derivedKey.address),
          derivationPath: derivedKey.derivationPath || '',
          type: AccountType.CHAIN,
          chainType: ChainType.SUBSTRATE,
          cryptoType: CryptoType.SR25519,
          keyType: KeyType.CUSTOM,
        } as ChainAccount);
      }

      return acc;
    }, []);
  };

  const createWallet: SubmitHandler<WalletForm> = async ({ walletName }) => {
    const accountsToSave = accounts.reduce<Array<BaseAccount | ChainAccount>>((acc, account, index) => {
      acc.push({
        name: accountNames[getAccountId(index)],
        accountId: toAccountId(account.address),
        cryptoType: CryptoType.SR25519,
        chainType: ChainType.SUBSTRATE,
        type: AccountType.BASE,
      } as BaseAccount);

      const derivedAccounts = Object.entries(account.derivedKeys)
        .map(([chainId, chainDerivedKeys]) => {
          return createDerivedAccounts(chainDerivedKeys, chainId as ChainId, index);
        })
        .flat();

      acc.push(...derivedAccounts);

      return acc;
    }, []);

    walletModel.events.multishardCreated({
      wallet: {
        name: walletName.trim(),
        type: WalletType.MULTISHARD_PARITY_SIGNER,
        signingType: SigningType.PARITY_SIGNER,
      },
      accounts: accountsToSave,
    });

    onComplete();
  };

  const goBack = () => {
    reset();
    onBack();
  };

  return (
    <>
      <div className="w-[472px] flex flex-col px-5 py-4 bg-white rounded-l-lg">
        <HeaderTitleText className="mb-10">{t('onboarding.vault.title')}</HeaderTitleText>
        <SmallTitleText className="mb-6">{t('onboarding.vault.manageTitle')}</SmallTitleText>

        <form className="flex flex-col h-full" onSubmit={handleSubmit(createWallet)}>
          <Controller
            name="walletName"
            control={control}
            rules={{ required: true, maxLength: 256 }}
            render={({ field: { onChange, value } }) => (
              <Input
                wrapperClass={cn('flex items-center')}
                label={t('onboarding.walletNameLabel')}
                placeholder={t('onboarding.walletNamePlaceholder')}
                invalid={Boolean(errors.walletName)}
                value={value}
                onChange={onChange}
              />
            )}
          />
          <InputHint variant="error" active={errors.walletName?.type === ErrorType.MAX_LENGTH}>
            {t('onboarding.watchOnly.walletNameMaxLenError')}
          </InputHint>
          <InputHint variant="error" active={errors.walletName?.type === ErrorType.REQUIRED}>
            {t('onboarding.watchOnly.walletNameRequiredError')}
          </InputHint>

          <div className="flex flex-1 justify-between items-end">
            <Button variant="text" onClick={goBack}>
              {t('onboarding.backButton')}
            </Button>

            <Button type="submit" disabled={!isValid || !activeWalletsHaveName}>
              {t('onboarding.continueButton')}
            </Button>
          </div>
        </form>
      </div>

      <div className="relative w-[472px] flex flex-col bg-input-background-disabled py-4 rounded-r-lg">
        <IconButton name="close" size={20} className="absolute right-3 top-3 m-1" onClick={() => onClose()} />

        <div className="flex items-center justify-between px-5 mt-[52px] mb-6">
          <SmallTitleText>{t('onboarding.vault.accountsTitle')}</SmallTitleText>

          <Button
            variant="text"
            suffixElement={<Icon name="magic" size={16} className="text-icon-accent" />}
            onClick={fillAccountNames}
          >
            {t('onboarding.vault.fillNamesButton')}
          </Button>
        </div>
        <div className="flex mx-5 py-2">
          <FootnoteText className="w-[182px] text-text-tertiary">{t('onboarding.vault.addressColumn')}</FootnoteText>
          <FootnoteText className="text-text-tertiary">{t('onboarding.vault.nameColumn')}</FootnoteText>
        </div>
        <div className="overflow-y-auto pl-3 pr-3.5">
          {accounts.map((account, index) => (
            <div key={getAccountId(index)}>
              <div className="flex items-center justify-between w-full gap-2">
                <AddressWithExplorers type="short" address={account.address} explorers={RootExplorers} />
                <div className="flex items-center">
                  <Input
                    disabled={inactiveAccounts[getAccountId(index)]}
                    wrapperClass="flex w-[214px] items-center p-3 mr-9"
                    placeholder={t('onboarding.paritySigner.accountNamePlaceholder')}
                    value={accountNames[getAccountId(index)] || ''}
                    onChange={(name) => updateAccountName(name, index)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {Object.entries(chainsObject).map(([chainId, { explorers }]) => {
                  const derivedKeys = account.derivedKeys[chainId as ChainId];

                  if (!derivedKeys) return;

                  return (
                    <div key={chainId}>
                      <div className="flex items-center ml-4">
                        <div className="bg-divider w-[2px] h-[34px] mr-4"></div>
                        <ChainTitle fontClass="text-text-primary" chainId={chainId as ChainId} />
                      </div>
                      {derivedKeys.map(({ address }, derivedKeyIndex) => (
                        <div
                          key={getAccountId(index, chainId, derivedKeyIndex)}
                          className="flex gap-2 justify-between items-center"
                        >
                          <div className="flex items-center">
                            <div
                              className={cnTw(
                                'bg-divider w-[2px] h-[50px] ml-4',
                                derivedKeyIndex === derivedKeys.length - 1 && 'h-[26px] mb-[24px]',
                              )}
                            ></div>
                            <div className="bg-divider w-[8px] h-[2px]"></div>

                            <AddressWithExplorers symbols={5} type="short" address={address} explorers={explorers} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              disabled={inactiveAccounts[getAccountId(index, chainId, derivedKeyIndex)]}
                              wrapperClass="flex w-[214px] items-center p-3"
                              placeholder={t('onboarding.paritySigner.accountNamePlaceholder')}
                              value={accountNames[getAccountId(index, chainId, derivedKeyIndex)] || ''}
                              onChange={(name) => updateAccountName(name, index, chainId, derivedKeyIndex)}
                            />
                            <IconButton
                              name={
                                inactiveAccounts[getAccountId(index, chainId, derivedKeyIndex)] ? 'eye' : 'eyeSlashed'
                              }
                              onClick={() => toggleAccount(index, chainId, derivedKeyIndex)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
