import { useUnit } from 'effector-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { TEST_IDS } from '@/shared/constants/testIds';
import { type Address as AccountAddress, type ID, type WalletFamily } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { includesMultiple, performSearch, toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { CaptionText, IconButton, Identicon, InputHint } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Combobox, Field, Input } from '@/shared/ui-kit';
import { contactModel } from '@/entities/contact';
import { WalletIcon, accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { filterModel } from '@/features/contacts';
import { walletSelectFeature } from '@/features/wallet-select';
import { formModel } from '../../model/form-model';
import { signatoryModel } from '../../model/signatory-model';


const { services, constants } = walletSelectFeature;

type ComboboxItem = {
  id: string;
  label: ReactNode;
  value: { address: AccountAddress; walletId?: ID };
};

type ComboboxGroup = {
  id: string;
  label: ReactNode;
  items: ComboboxItem[];
};

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
  const [options, setOptions] = useState<ComboboxGroup[]>([]);

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
      walletFn: w => walletUtils.isValidSignatory(w) && (!selectedWalletId || w.id.toString() === selectedWalletId),
      accountFn: a => {
        if (!chain) return false;

        const accountIdMatch = toAccountId(signatoryAddress) === a.accountId;
        const chainIdMatch = accountUtils.isChainIdMatch(a, chain.chainId);

        return accountIdMatch && chainIdMatch;
      },
    })?.[0]?.name || '';

  const contactAccountName =
    contacts.filter(contact => toAccountId(contact.address) === toAccountId(signatoryAddress))?.[0]?.name || '';

  const displayName = useMemo(() => {
    const hasDuplicateName = !!ownAccountName && !!contactAccountName;
    const shouldForceOwnAccountName = hasDuplicateName && isOwnAccount;

    if (shouldForceOwnAccountName) return ownAccountName;
    if (hasDuplicateName && !isOwnAccount) return contactAccountName;

    return ownAccountName || contactAccountName;
  }, [isOwnAccount, ownAccountName, contactAccountName]);

  // Wallets
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

    const walletByGroup = services.walletSelect.getWalletByGroups(filteredWallets || []);
    const walletsOptions: ComboboxGroup[] = [];

    for (const [walletFamily, walletsGroup] of Object.entries(walletByGroup)) {
      if (walletsGroup.length === 0) continue;

      const accountOptions: ComboboxItem[] = [];
      for (const wallet of walletsGroup) {
        for (const account of wallet.accounts) {
          const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

          accountOptions.push({
            id: address,
            value: { address, walletId: account.walletId },
            label: <Address showIcon title={account.name} address={address} />,
          });
        }
      }

      walletsOptions.push({
        id: walletFamily,
        label: (
          <div className="flex items-center gap-x-2" key={walletFamily}>
            <WalletIcon type={walletFamily as WalletFamily} />
            <CaptionText className="font-semibold uppercase text-text-secondary">
              {t(constants.GROUP_LABELS[walletFamily as WalletFamily])}
            </CaptionText>
          </div>
        ),
        items: accountOptions,
      });
    }

    setOptions(walletsOptions);
  }, [query, wallets, isOwnAccount]);

  // Contacts
  useEffect(() => {
    if (isOwnAccount || !chain) return;

    const addressOptions: ComboboxItem[] = [];
    for (const contact of filteredContacts) {
      const displayedAddress = toAddress(contact.accountId, { prefix: chain.addressPrefix });
      const isValidAddress = validateAddress(displayedAddress, chain);

      if (!isValidAddress) continue;

      addressOptions.push({
        id: contact.id.toString(),
        label: <Address showIcon title={contact.name} address={displayedAddress} />,
        value: { address: displayedAddress },
      });
    }

    if (validateAddress(query, chain)) {
      const displayedAddress = toAddress(query, { prefix: chain.addressPrefix });
      addressOptions.push({
        id: query,
        label: <Address showIcon address={displayedAddress} />,
        value: { address: displayedAddress },
      });
    }

    if (addressOptions.length === 0) return;

    const contactsOptions: ComboboxGroup[] = [
      {
        id: 'contacts',
        label: t('createMultisigAccount.contactsGroup'),
        items: addressOptions,
      },
    ];

    setOptions(contactsOptions);
  }, [query, chain, isOwnAccount, contacts, filteredContacts]);

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

  const onAddressChange = (value: string) => {
    const selectedOption = options.flatMap(group => group.items).find(option => option.value.address === value);
    if (!selectedOption) return;
    const newSignatory = selectedOption.value;

    signatoryModel.events.changeSignatory({
      index: signatoryIndex,
      name: signatoryName,
      address: newSignatory.address,
      walletId: newSignatory.walletId?.toString(), // will be undefined for contact
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
              data-testid={TEST_IDS.MULTISIG.SIGNATORY_COMBOBOX}
              placeholder={t('createMultisigAccount.signatorySelection')}
              invalid={isDuplicate}
              value={toAddress(signatoryAddress, { prefix: chain?.addressPrefix })}
              prefixElement={
                <Identicon
                  address={isInvalidAddress ? '' : signatoryAddress}
                  size={20}
                  background={false}
                  canCopy={false}
                />
              }
              onChange={value => onAddressChange(value)}
              onInput={setQuery}
            >
              {options.map(group => (
                <Combobox.Group key={group.id} title={group.label}>
                  {group.items.map(option => (
                    <Combobox.Item key={option.id} value={option.value.address}>
                      {option.label}
                    </Combobox.Item>
                  ))}
                </Combobox.Group>
              ))}
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
