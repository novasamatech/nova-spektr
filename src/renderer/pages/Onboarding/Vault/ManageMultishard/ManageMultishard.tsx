import { u8aToHex } from '@polkadot/util';
import keyBy from 'lodash/keyBy';
import { useEffect, useState } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';

import { chainsService } from '@/shared/api/network';
import {
  type Chain,
  type ChainId,
  type HexString,
  type NoID,
  type VaultBaseAccount,
  type VaultChainAccount,
} from '@/shared/core';
import { AccountType, CryptoType, ErrorType, KeyType, SigningType, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { RootExplorers, cnTw, toAccountId, toAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, HeaderTitleText, Icon, IconButton, InputHint, SmallTitleText } from '@/shared/ui';
import { AccountExplorers, Address } from '@/shared/ui-entities';
import { Field, Input } from '@/shared/ui-kit';
import { ChainTitle } from '@/entities/chain';
import { type AddressInfo, type CompactSeedInfo, type SeedInfo } from '@/entities/transaction';
import { ExplorersPopover, walletModel } from '@/entities/wallet';

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
    for (const account of accounts) {
      const accountIndex = accounts.indexOf(account);

      for (const [chainId, derivedKeys] of Object.entries(account.derivedKeys)) {
        const { name: chainName } = chainsObject[chainId as ChainId];

        for (const derivedKeyIndex of derivedKeys.keys()) {
          const accountId = getAccountId(accountIndex, chainId, derivedKeyIndex);
          const rootAccountId = getAccountId(accountIndex);
          if (accountNames[accountId]) continue;

          const accountName = `${accountNames[rootAccountId]}//${chainName.toLowerCase()}//${derivedKeyIndex + 1}`;
          updateAccountName(accountName, accountIndex, chainId, derivedKeyIndex);
        }
      }
    }
  };

  const createDerivedAccounts = (derivedKeys: AddressInfo[], chainId: ChainId, accountIndex: number) => {
    return derivedKeys.reduce<Omit<NoID<VaultChainAccount>, 'walletId'>[]>((acc, derivedKey, index) => {
      const accountId = getAccountId(accountIndex, chainId, index);

      if (!inactiveAccounts[accountId]) {
        acc.push({
          chainId,
          type: 'chain',
          name: accountNames[accountId],
          accountId: toAccountId(derivedKey.address),
          derivationPath: derivedKey.derivationPath || '',
          accountType: AccountType.CHAIN,
          signingType: SigningType.POLKADOT_VAULT,
          cryptoType: CryptoType.SR25519,
          keyType: KeyType.CUSTOM,
        });
      }

      return acc;
    }, []);
  };

  const createWallet: SubmitHandler<WalletForm> = async ({ walletName }) => {
    const accountsToSave = accounts.reduce<
      (Omit<NoID<VaultBaseAccount>, 'walletId'> | Omit<NoID<VaultChainAccount>, 'walletId'>)[]
    >((acc, account, index) => {
      acc.push({
        name: accountNames[getAccountId(index)],
        accountId: toAccountId(account.address),
        cryptoType: CryptoType.SR25519,
        signingType: SigningType.POLKADOT_VAULT,
        accountType: AccountType.BASE,
        type: 'universal',
      });

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
      external: false,
    });

    onComplete();
  };

  const goBack = () => {
    reset();
    onBack();
  };

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 rounded-l-lg bg-white">
        <div className="flex h-full flex-col px-5 py-4">
          <HeaderTitleText className="mb-10">{t('onboarding.vault.title')}</HeaderTitleText>
          <SmallTitleText className="mb-6">{t('onboarding.vault.manageTitle')}</SmallTitleText>

          <form className="flex h-full flex-col" onSubmit={handleSubmit(createWallet)}>
            <Controller
              name="walletName"
              control={control}
              rules={{ required: true, maxLength: 256 }}
              render={({ field: { onChange, value } }) => (
                <Field text={t('onboarding.walletNameLabel')}>
                  <Input
                    placeholder={t('onboarding.walletNamePlaceholder')}
                    invalid={Boolean(errors.walletName)}
                    value={value}
                    onChange={onChange}
                  />
                </Field>
              )}
            />
            <InputHint variant="error" active={errors.walletName?.type === ErrorType.MAX_LENGTH}>
              {t('onboarding.watchOnly.walletNameMaxLenError')}
            </InputHint>
            <InputHint variant="error" active={errors.walletName?.type === ErrorType.REQUIRED}>
              {t('onboarding.watchOnly.walletNameRequiredError')}
            </InputHint>

            <div className="flex flex-1 items-end justify-between">
              <Button variant="text" onClick={goBack}>
                {t('onboarding.backButton')}
              </Button>

              <Button type="submit" disabled={!isValid || !activeWalletsHaveName}>
                {t('onboarding.continueButton')}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="flex-1 rounded-r-lg bg-input-background-disabled">
        <div className="relative flex h-full flex-col py-4">
          <IconButton name="close" size={20} className="absolute right-3 top-3 m-1" onClick={() => onClose()} />

          <div className="mb-6 mt-[52px] flex items-center justify-between px-5">
            <SmallTitleText>{t('onboarding.vault.accountsTitle')}</SmallTitleText>

            <Button
              variant="text"
              suffixElement={<Icon name="magic" size={16} className="text-icon-accent" />}
              onClick={fillAccountNames}
            >
              {t('onboarding.vault.fillNamesButton')}
            </Button>
          </div>
          <div className="mx-5 grid grid-cols-[170px,auto] gap-x-4 py-2">
            <FootnoteText className="text-text-tertiary">{t('onboarding.vault.addressColumn')}</FootnoteText>
            <FootnoteText className="text-text-tertiary">{t('onboarding.vault.nameColumn')}</FootnoteText>
          </div>
          <div className="overflow-y-auto pl-3 pr-3.5">
            {accounts.map((account, index) => (
              <div key={getAccountId(index)}>
                <div className="grid grid-cols-[178px,auto] items-center gap-x-4 pr-6">
                  <ExplorersPopover
                    button={
                      <FootnoteText className="flex items-center gap-2 text-text-secondary">
                        <Address address={account.address} variant="truncate" showIcon />
                        <IconButton name="details" />
                      </FootnoteText>
                    }
                    address={account.address}
                    explorers={RootExplorers}
                    contextClassName="mr-[-2rem]"
                  />
                  <Input
                    disabled={inactiveAccounts[getAccountId(index)]}
                    placeholder={t('onboarding.paritySigner.accountNamePlaceholder')}
                    value={accountNames[getAccountId(index)] || ''}
                    onChange={(value) => updateAccountName(value, index)}
                  />
                </div>
                <ul className="flex flex-col gap-2.5">
                  {Object.entries(chainsObject).map(([chainId, chain]) => {
                    const derivedKeys = account.derivedKeys[chainId as ChainId];

                    if (!derivedKeys) return;

                    return (
                      <li key={chainId}>
                        <div className="ml-4 flex items-center">
                          <div className="mr-4 h-[34px] w-[2px] bg-divider"></div>
                          <ChainTitle fontClass="text-text-primary" chainId={chainId as ChainId} />
                        </div>
                        {derivedKeys.map(({ address }, derivedKeyIndex) => (
                          <div
                            key={getAccountId(index, chainId, derivedKeyIndex)}
                            className="flex items-center gap-x-4"
                          >
                            <div className="flex items-center">
                              <div
                                className={cnTw(
                                  'ml-4 h-[50px] w-[2px] bg-divider',
                                  derivedKeyIndex === derivedKeys.length - 1 && 'mb-[24px] h-[26px]',
                                )}
                              />
                              <div className="h-[2px] w-[8px] bg-divider" />
                              <div className="ml-2 flex items-center gap-1">
                                <FootnoteText className="w-[125px] text-text-secondary">
                                  <Address address={address} variant="truncate" showIcon />
                                </FootnoteText>
                                <AccountExplorers accountId={toAccountId(address)} chain={chain} />
                              </div>
                            </div>
                            <div className="grid w-full grid-cols-[auto,16px] items-center gap-x-2">
                              <Input
                                disabled={inactiveAccounts[getAccountId(index, chainId, derivedKeyIndex)]}
                                placeholder={t('onboarding.paritySigner.accountNamePlaceholder')}
                                value={accountNames[getAccountId(index, chainId, derivedKeyIndex)] || ''}
                                onChange={(value) => updateAccountName(value, index, chainId, derivedKeyIndex)}
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
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
