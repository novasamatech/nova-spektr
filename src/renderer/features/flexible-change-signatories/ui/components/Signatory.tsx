import { useUnit } from 'effector-react';
import { uniqBy } from 'lodash';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Address as AccountAddress, type ID } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { includesMultiple, performSearch, toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { FootnoteText, IconButton, InputHint } from '@/shared/ui';
import { Address, Identicon } from '@/shared/ui-entities';
import { Box, Combobox, Field, Select } from '@/shared/ui-kit';
import { accountService, useAccountsNames, useWalletsNames } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { accountUtils, walletModel } from '@/entities/wallet';
import { changeSignatoriesModel } from '../../model/change-signatories-model';
import { signatoryModel } from '../../model/signatory-model';
import { type SignatoryInfo } from '../../types';

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

  const { address: signatoryAddress } = signatory;

  const contacts = useUnit(contactModel.$contacts);
  const wallets = useUnit(walletModel.$wallets);
  const resolvedWallets = useWalletsNames(wallets);
  const chain = useUnit(changeSignatoriesModel.$chain);
  const selectedSignatories = useUnit(signatoryModel.$signatories);
  const accountsList = useUnit(walletModel.$availableAccounts);
  const resolvedAccounts = useAccountsNames(accountsList, chain);

  const filteredContacts = useMemo(() => {
    if (isOwnAccount) return [];

    return performSearch({
      query,
      records: contacts,
      weights: { name: 1, address: 0.5 },
    });
  }, [query, contacts]);

  // Wallets
  const walletsOptions = useMemo<ComboboxGroup[]>(() => {
    if (!chain || accountsList.length === 0 || (!isOwnAccount && validateAddress(query, chain))) return [];

    const filteredAccounts = accountsList.filter((account) => {
      const isNotWatchOnly = !accountUtils.isWatchOnlyAccount(account);

      const isChainMatch = accountService.isAccountAvailableOnChain(account, chain);
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

      if (isOwnAccount) return isChainMatch && isNotWatchOnly;

      const queryPass = includesMultiple([account.name, address], query);

      return isChainMatch && isNotWatchOnly && queryPass;
    });

    const uniqueAccounts = uniqBy(filteredAccounts, 'accountId');

    if (uniqueAccounts.length === 0) return [];

    const accountOptions = new Map<string, ComboboxItem>();

    for (const account of uniqueAccounts) {
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

      if (!isOwnAccount && selectedSignatories.some((s) => toAccountId(s.address) === account.accountId)) continue;
      if (accountOptions.has(address)) continue;
      const wallet = resolvedWallets.find((w) => w.id === account.walletId);
      const resolvedAccount = resolvedAccounts.find((a) => a.accountId === account.accountId);
      const accountName = resolvedAccount?.name ?? account.name;

      const title = !wallet || wallet.name === accountName ? accountName : `${wallet.name} (${accountName})`;

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
  }, [query, chain, resolvedWallets, resolvedAccounts, isOwnAccount, selectedSignatories]);

  // Contacts
  const contactOptions = useMemo<ComboboxGroup[]>(() => {
    if (!chain || isOwnAccount || validateAddress(query, chain)) return [];

    const addressOptions: ComboboxItem[] = [];
    for (const contact of filteredContacts) {
      const isAlreadySelected = selectedSignatories.some(
        (s) => toAccountId(s.address) === toAccountId(contact.address),
      );
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
    setQuery(signatoryAddress);
  }, [signatoryAddress]);

  const onAddressChange = (value: string) => {
    setQuery(value);
    const selectedOption = options.flatMap((group) => group.items).find((option) => option.value.address === value);
    const newSignatory = selectedOption?.value;

    signatoryModel.changeSignatory({
      index: signatoryIndex,
      address: value,
      walletId: newSignatory?.walletId?.toString(), // will be undefined for contact
    });
  };

  const isInvalid = isInvalidAddress || signatoryAddress !== query;

  return (
    <div className="grid grid-cols-[1fr_44px] items-start gap-x-4">
      <Box width="100%" direction="row" verticalAlign="start" gap={3}>
        <FootnoteText className="pt-8.5 text-text-tertiary">{1 + signatoryIndex}</FootnoteText>
        {isOwnAccount ? (
          <Field text={t('createMultisigAccount.myAccount')}>
            <Select
              placeholder={t('createMultisigAccount.signatorySelection')}
              value={toAddress(signatoryAddress, { prefix: chain?.addressPrefix })}
              onChange={onAddressChange}
            >
              {walletsOptions.map((group) =>
                group.items.map((option) => (
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
              {options.map((group) => (
                <Combobox.Group key={group.id} title={group.label}>
                  {group.items.map((option) => (
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
