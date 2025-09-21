import { useUnit } from 'effector-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Address as AccountAddress, type ID } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { includesMultiple, performSearch, toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { FootnoteText, IconButton, InputHint } from '@/shared/ui';
import { Address, Identicon } from '@/shared/ui-entities';
import { Box, Combobox, Field, Input, Select } from '@/shared/ui-kit';
import { accountService } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { type SignatoryInfo } from '../../../types';
import { formModel } from '../../model/form-model';
import { signatoryModel } from '../../model/signatory-model';

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
  signatoryIndex: number;
  signatory: Omit<SignatoryInfo, 'index'>;
  onDelete?: (index: number) => void;
};

export const Signatory = ({
  signatoryIndex,
  isDuplicate,
  isInvalidAddress,
  isOwnAccount = false,
  signatory,
  onDelete,
}: Props) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [signatoryQuery, setSignatoryQuery] = useState('');

  const { name: signatoryName, address: signatoryAddress, walletId: selectedWalletId } = signatory;

  const contacts = useUnit(contactModel.$contacts);
  const wallets = useUnit(walletModel.$wallets);
  const chain = useUnit(formModel.$chain);
  const selectedSignatories = useUnit(signatoryModel.$signatories);
  const accountsList = useUnit(walletModel.$availableAccounts);

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
      walletFn: w => !walletUtils.isWatchOnly(w) && (!selectedWalletId || w.id.toString() === selectedWalletId),
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
  const walletsOptions = useMemo<ComboboxGroup[]>(() => {
    if (!chain || accountsList.length === 0 || (!isOwnAccount && validateAddress(query, chain))) return [];

    const availableAccounts = accountsList.filter(account => {
      const isCorrectAccount =
        !accountUtils.isWatchOnlyAccount(account) && !accountUtils.isFlexibleMultisigAccount(account);

      const isChainMatch = accountService.isAccountAvailableOnChain(account, chain);
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

      if (isOwnAccount) return isChainMatch && isCorrectAccount;

      const queryPass = includesMultiple([account.name, address], query);

      return isChainMatch && isCorrectAccount && queryPass;
    });

    if (availableAccounts.length === 0) return [];

    const filteredAccounts = signatoryQuery
      ? performSearch({
          records: availableAccounts,
          query: signatoryQuery,
          weights: { name: 1, address: 0.5, id: 0.5, accountId: 0.5 },
        })
      : availableAccounts;

    const accountOptions = new Map<string, ComboboxItem>();

    for (const account of filteredAccounts) {
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

      if (!isOwnAccount && selectedSignatories.some(s => toAccountId(s.address) === account.accountId)) continue;
      if (accountOptions.has(address)) continue;
      const wallet = wallets.find(w => w.id === account.walletId);

      const title = !wallet || wallet.name === account.name ? account.name : `${wallet.name} (${account.name})`;

      accountOptions.set(address, {
        id: address,
        value: { address, walletId: account.walletId },
        label: <Address iconSize={20} showIcon title={title} address={address} />,
      });
    }

    if (accountOptions.size === 0) return [];

    return [
      {
        id: 'accounts',
        label: isOwnAccount ? '' : t('createMultisigAccount.myAccounts'),
        items: Array.from(accountOptions.values()),
      },
    ];
  }, [query, signatoryQuery, chain, wallets, isOwnAccount, selectedSignatories]);

  // Contacts
  const contactOptions = useMemo<ComboboxGroup[]>(() => {
    if (!chain || isOwnAccount || validateAddress(query, chain)) return [];

    const addressOptions: ComboboxItem[] = [];
    for (const contact of filteredContacts) {
      const isAlreadySelected = selectedSignatories.some(s => toAccountId(s.address) === toAccountId(contact.address));
      const displayAddress = toAddress(contact.accountId, { prefix: chain?.addressPrefix });

      if (isAlreadySelected || !validateAddress(displayAddress, chain)) continue;

      addressOptions.push({
        id: contact.id.toString(),
        label: <Address iconSize={20} showIcon title={contact.name} address={displayAddress} />,
        value: { address: displayAddress },
      });
    }

    if (addressOptions.length === 0) return [];

    return [
      {
        id: 'contacts',
        label: t('createMultisigAccount.contactsGroup'),
        items: addressOptions,
      },
    ];
  }, [chain, isOwnAccount, filteredContacts, query, selectedSignatories]);

  const options = [...contactOptions, ...walletsOptions];

  useEffect(() => {
    if (!displayName || displayName === signatoryName) return;

    onNameChange(displayName);
  }, [displayName]);

  useEffect(() => {
    setQuery(signatoryAddress);
  }, [signatoryAddress]);

  const onNameChange = (newName: string) => {
    signatoryModel.events.changeSignatory({
      index: signatoryIndex,
      name: newName,
      address: signatoryAddress,
      walletId: selectedWalletId,
    });
  };

  const onAddressChange = (value: string) => {
    setQuery(value);
    const selectedOption = options.flatMap(group => group.items).find(option => option.value.address === value);
    const newSignatory = selectedOption?.value;

    const shouldClearName = value !== signatoryAddress && !selectedOption;
    const newName = shouldClearName ? '' : signatoryName;

    signatoryModel.events.changeSignatory({
      index: signatoryIndex,
      name: newName,
      address: value,
      walletId: newSignatory?.walletId?.toString(), // will be undefined for contact
    });
  };

  const nameLabel = isOwnAccount ? t('createMultisigAccount.myName') : t('createMultisigAccount.signatoryNameLabel');

  const isInvalid = isInvalidAddress || signatoryAddress !== query;

  return (
    <div className="grid grid-cols-[1fr_232px_44px] items-start gap-x-4">
      <Box width="100%" direction="row" verticalAlign="start" gap={3}>
        <FootnoteText className="pt-8.5 text-text-tertiary">{1 + signatoryIndex}</FootnoteText>
        {isOwnAccount ? (
          <Field text={t('createMultisigAccount.myAccount')}>
            <Select
              placeholder={t('createMultisigAccount.signatorySelection')}
              value={toAddress(signatoryAddress, { prefix: chain?.addressPrefix })}
              onSearch={setSignatoryQuery}
              onChange={onAddressChange}
            >
              {walletsOptions.map(group =>
                group.items.map(option => (
                  <Select.Item key={option.id} value={option.value.address}>
                    {option.label}
                  </Select.Item>
                )),
              )}
            </Select>
          </Field>
        ) : (
          <Field text={t('createMultisigAccount.signatoryAddress')}>
            <Combobox
              data-testid={TEST_IDS.MULTISIG.SIGNATORY_COMBOBOX}
              placeholder={t('createMultisigAccount.signatorySelection')}
              invalid={isDuplicate}
              value={query}
              prefixElement={
                <Identicon
                  address={isInvalid ? null : (signatoryAddress as AccountAddress)}
                  size={20}
                  background={false}
                />
              }
              onChange={onAddressChange}
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

            <InputHint active={isInvalid} variant="error">
              {t('createMultisigAccount.disabledError.addressIsNotSupported')}
            </InputHint>

            <InputHint active={isDuplicate} variant="error">
              {t('createMultisigAccount.duplicateSignatoryAddress')}
            </InputHint>
          </Field>
        )}
      </Box>
      <Field text={nameLabel}>
        <Input
          name={nameLabel}
          placeholder={t('addressBook.createContact.namePlaceholder')}
          invalid={false}
          value={signatoryName}
          disabled={!!ownAccountName}
          onChange={onNameChange}
        />
      </Field>
      {!isOwnAccount && onDelete && (
        <div className="pt-7">
          <IconButton
            className="justify-self-center"
            name="delete"
            size={16}
            onClick={() => onDelete(signatoryIndex)}
          />
        </div>
      )}
    </div>
  );
};
