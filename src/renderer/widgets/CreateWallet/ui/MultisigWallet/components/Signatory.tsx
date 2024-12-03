import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type Account, type Address as AccountAddress, type ID, type WalletFamily } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { includesMultiple, performSearch, toAccountId, toAddress } from '@/shared/lib/utils';
import { CaptionText, IconButton, Identicon, InputHint } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Combobox, Field, Input } from '@/shared/ui-kit';
import { contactModel } from '@/entities/contact';
import { WalletIcon, accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { filterModel } from '@/features/contacts';
import { walletSelectUtils } from '@/features/wallets/WalletSelect/lib/wallet-select-utils';
import { GroupLabels } from '@/features/wallets/WalletSelect/ui/WalletGroup';
import { formModel } from '@/widgets/CreateWallet/model/form-model';
import { signatoryModel } from '../../../model/signatory-model';

type Props = {
  isOwnAccount?: boolean;
  isDuplicate: boolean;
  isInvalidAddress: boolean;
  signatoryName: string;
  signatoryAddress: AccountAddress;
  signatoryIndex: number;
  selectedWalletId?: string;
  onDelete?: (index: number) => void;
};

export const Signatory = ({
  signatoryIndex,
  isDuplicate,
  isInvalidAddress,
  isOwnAccount = false,
  signatoryName,
  signatoryAddress,
  selectedWalletId,
  onDelete,
}: Props) => {
  const { t } = useI18n();

  const chain = useUnit(formModel.$chain);
  const contacts = useUnit(contactModel.$contacts);
  const wallets = useUnit(walletModel.$wallets);

  const [query, setQuery] = useState('');
  const [accountsGroup, setAccountsGroup] = useState<[WalletFamily, Account[]][]>([]);

  const filteredContacts = useMemo(() => {
    if (isOwnAccount) return [];

    return performSearch({
      query,
      records: contacts,
      weights: { name: 1, address: 0.5 },
    });
  }, [query, contacts]);

  const ownAccountName =
    walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => walletUtils.isValidSignatory(w) && (!selectedWalletId || w.id.toString() === selectedWalletId),
      accountFn: (a) => {
        if (!chain) return false;

        const accountIdMatch = toAccountId(signatoryAddress) === a.accountId;
        const chainIdMatch = accountUtils.isChainIdMatch(a, chain.chainId);

        return accountIdMatch && chainIdMatch;
      },
    })?.[0]?.name || '';

  const contactAccountName =
    contacts.filter((contact) => toAccountId(contact.address) === toAccountId(signatoryAddress))?.[0]?.name || '';

  const displayName = useMemo(() => {
    const hasDuplicateName = !!ownAccountName && !!contactAccountName;
    const shouldForceOwnAccountName = hasDuplicateName && isOwnAccount;

    if (shouldForceOwnAccountName) return ownAccountName;
    if (hasDuplicateName && !isOwnAccount) return contactAccountName;

    return ownAccountName || contactAccountName;
  }, [isOwnAccount, ownAccountName, contactAccountName]);

  useEffect(() => {
    if (!isOwnAccount || wallets.length === 0 || !chain) return;

    const filteredWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: walletUtils.isValidSignatory,
      accountFn: (account, wallet) => {
        const isChainMatch = accountUtils.isChainAndCryptoMatch(account, chain);
        const isCorrectAccount = accountUtils.isNonBaseVaultAccount(account, wallet);
        const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
        const queryPass = includesMultiple([account.name, address], query);

        return isChainMatch && isCorrectAccount && queryPass;
      },
    });

    const walletByGroup = walletSelectUtils.getWalletByGroups(filteredWallets || []);
    const options: [WalletFamily, Account[]][] = [];

    for (const [walletFamily, walletsGroup] of Object.entries(walletByGroup)) {
      if (walletsGroup.length === 0) continue;

      const accountOptions: Account[] = [];
      for (const wallet of walletsGroup) {
        accountOptions.push(...wallet.accounts);
      }

      options.push([walletFamily as WalletFamily, accountOptions]);
    }

    setAccountsGroup(options);
  }, [query, wallets, isOwnAccount]);

  // initiate the query form in case of not own account
  useEffect(() => {
    if (isOwnAccount || contacts.length === 0) return;

    filterModel.events.formInitiated();
  }, [isOwnAccount, contacts]);

  useEffect(() => {
    if (!displayName || displayName === signatoryName) return;

    onNameChange(displayName);
  }, [displayName]);

  const onNameChange = (newName: string) => {
    signatoryModel.events.changeSignatory({
      index: signatoryIndex,
      name: newName,
      address: signatoryAddress,
      walletId: selectedWalletId,
    });
  };

  const onAddressChange = <T extends string = `${AccountAddress}_${ID}`>(address: T) => {
    const [accountAddress, walletId] = address.split('_');

    signatoryModel.events.changeSignatory({
      index: signatoryIndex,
      name: signatoryName,
      address: accountAddress,
      walletId: walletId, // will be undefined for contact
    });
  };

  return (
    <div className="grid grid-cols-[232px,1fr] gap-x-6">
      <Field text={t('createMultisigAccount.signatoryNameLabel')}>
        <Input
          name={t('createMultisigAccount.signatoryNameLabel')}
          placeholder={t('addressBook.createContact.namePlaceholder')}
          invalid={false}
          value={signatoryName}
          disabled={!!ownAccountName}
          onChange={onNameChange}
        />
      </Field>
      <div className="grid grid-cols-[444px,28px] gap-x-4">
        <Box width="100%">
          <Field text={t('createMultisigAccount.signatoryAddress')}>
            <Combobox
              placeholder={t('createMultisigAccount.signatorySelection')}
              prefixElement={
                <Identicon
                  address={isInvalidAddress ? '' : signatoryAddress}
                  size={20}
                  background={false}
                  canCopy={false}
                />
              }
              inputValue={signatoryAddress}
              selectedValue={`${signatoryAddress}_${selectedWalletId}`}
              invalid={isDuplicate}
              onChange={onAddressChange}
              onInput={setQuery}
            >
              {accountsGroup.map(([walletType, accounts]) => (
                <Combobox.Group
                  key={walletType}
                  title={
                    <div className="flex items-center gap-x-2 py-1">
                      <WalletIcon type={walletType} />
                      <CaptionText className="font-semibold uppercase text-text-secondary">
                        {t(GroupLabels[walletType])}
                      </CaptionText>
                    </div>
                  }
                >
                  {accounts.map((account) => {
                    const address = toAddress(account.accountId, { prefix: chain?.addressPrefix });
                    const itemValue = `${address}_${account.walletId}`;

                    return (
                      <Combobox.Item key={account.id} value={itemValue}>
                        <div className="pl-7">
                          <Address showIcon canCopy={false} title={account.name} address={address} />
                        </div>
                      </Combobox.Item>
                    );
                  })}
                </Combobox.Group>
              ))}
              {filteredContacts.map((contact) => {
                const address = toAddress(contact.accountId, { prefix: chain?.addressPrefix });

                return (
                  <Combobox.Item key={contact.id} value={address}>
                    <Address showIcon title={contact.name} address={address} />
                  </Combobox.Item>
                );
              })}
            </Combobox>

            <InputHint active={isDuplicate} variant="error">
              {t('createMultisigAccount.duplicateSignatoryAddress')}
            </InputHint>
          </Field>
        </Box>
        {!isOwnAccount && onDelete && (
          <IconButton
            className="mt-9 self-start justify-self-center"
            name="delete"
            size={16}
            onClick={() => onDelete(signatoryIndex)}
          />
        )}
      </div>
    </div>
  );
};
