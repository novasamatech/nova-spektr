import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type ChainAccount, type WalletFamily } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { performSearch, toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { CaptionText, Combobox, IconButton, Identicon } from '@/shared/ui';
import { type ComboboxOption } from '@/shared/ui/types';
import { Box, Input } from '@/shared/ui-kit';
import { contactModel } from '@/entities/contact';
import { AddressWithName, WalletIcon, walletModel, walletUtils } from '@/entities/wallet';
import { filterModel } from '@/features/contacts';
import { walletSelectFeature } from '@/features/wallet-select';
import { formModel } from '@/widgets/CreateWallet/model/form-model';
import { signatoryModel } from '../../../model/signatory-model';

interface Props {
  signatoryName: string;
  signatoryAddress: string;
  signatoryIndex: number;
  isOwnAccount?: boolean;
  onDelete?: (index: number) => void;
}

export const Signatory = ({
  signatoryIndex,
  onDelete,
  isOwnAccount = false,
  signatoryName,
  signatoryAddress,
}: Props) => {
  const { t } = useI18n();

  const contacts = useUnit(contactModel.$contacts);
  const wallets = useUnit(walletModel.$wallets);
  const {
    fields: { chain },
  } = useForm(formModel.$createMultisigForm);

  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<ComboboxOption[]>([]);

  const contactsFiltered = useMemo(() => {
    return performSearch({
      query,
      records: contacts,
      weights: { name: 1, address: 0.5 },
    });
  }, [query, contacts]);

  const ownAccountName =
    walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isWatchOnly(w) && !walletUtils.isMultisig(w),
      accountFn: (a) => toAccountId(signatoryAddress) === a.accountId,
    })?.[0]?.name || '';

  const contactAccountName =
    contacts.filter((contact) => toAccountId(contact.address) === toAccountId(signatoryAddress))?.[0]?.name || '';
  const displayName = useMemo(() => {
    const hasDuplicateName = !!ownAccountName && !!contactAccountName;
    const shouldForceOwnAccountName = hasDuplicateName && isOwnAccount;
    if (shouldForceOwnAccountName) return ownAccountName;

    if (hasDuplicateName && !isOwnAccount) return contactAccountName;

    return ownAccountName || contactAccountName || name;
  }, [isOwnAccount, ownAccountName, contactAccountName, name]);

  useEffect(() => {
    if (!isOwnAccount || wallets.length === 0) return;

    const walletByGroup = walletSelectFeature.services.walletSelect.getWalletByGroups(wallets, query);
    const opts = Object.entries(walletByGroup).reduce((acc, [walletType, wallets], index) => {
      if (wallets.length === 0) {
        return acc;
      }

      const accountOptions = wallets.reduce((acc, wallet) => {
        if (!wallet.accounts.length || !walletUtils.isValidSignatory(wallet)) return acc;

        return acc.concat(
          wallet.accounts
            .filter(
              (account) =>
                (account as ChainAccount).chainId === undefined ||
                (account as ChainAccount).chainId === chain.value.chainId,
            )
            .map((account) => {
              const address = toAddress(account.accountId, { prefix: chain.value.addressPrefix });

              return {
                value: address,
                element: <AddressWithName name={account.name} address={address} />,
                id: account.accountId,
              };
            }),
        );
      }, [] as ComboboxOption[]);

      if (accountOptions.length === 0) {
        return acc;
      }

      return acc.concat([
        {
          id: index.toString(),
          element: (
            <div className="flex items-center gap-x-2" key={walletType}>
              <WalletIcon type={walletType as WalletFamily} />
              <CaptionText className="font-semibold uppercase text-text-secondary">
                {t(walletSelectFeature.constants.GROUP_LABELS[walletType as WalletFamily])}
              </CaptionText>
            </div>
          ),
          value: undefined,
          disabled: true,
        },
        ...accountOptions,
      ]);
    }, [] as ComboboxOption[]);

    setOptions(opts);
  }, [query, wallets, isOwnAccount, t]);

  // initiate the query form in case of not own account
  useEffect(() => {
    if (isOwnAccount || contacts.length === 0) return;
    filterModel.events.formInitiated();
  }, [isOwnAccount, filterModel, contacts]);

  // list of contacts in case of not own account
  useEffect(() => {
    if (isOwnAccount || contacts.length === 0) return;
    setOptions(
      contactsFiltered.map(({ name, address }) => {
        const displayAddress = toAddress(address, { prefix: chain.value.addressPrefix });

        return {
          id: signatoryIndex.toString(),
          element: <AddressWithName name={name} address={displayAddress} />,
          value: displayAddress,
        };
      }),
    );
  }, [query, isOwnAccount, contacts, contactsFiltered]);

  const onNameChange = (newName: string) => {
    signatoryModel.events.changeSignatory({
      index: signatoryIndex,
      name: newName,
      address: signatoryAddress,
    });
  };

  useEffect(() => {
    if (displayName && displayName !== signatoryName) {
      onNameChange(displayName);
    }
  }, [displayName]);

  const onAddressChange = (newAddress: string) => {
    const validatedAddress = validateAddress(newAddress) ? newAddress : '';
    const fixedAddress = toAddress(validatedAddress, { prefix: chain.value.addressPrefix });

    signatoryModel.events.changeSignatory({
      index: signatoryIndex,
      name: signatoryName,
      address: fixedAddress,
    });
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
  };

  const accountInputLabel = isOwnAccount
    ? t('createMultisigAccount.ownAccountSelection')
    : t('createMultisigAccount.signatoryAddress');

  return (
    <div className="grid grid-cols-[300px,1fr] gap-x-2">
      <Input
        name={t('createMultisigAccount.signatoryNameLabel')}
        label={t('createMultisigAccount.signatoryNameLabel')}
        placeholder={t('addressBook.createContact.namePlaceholder')}
        invalid={false}
        value={signatoryName}
        disabled={!!ownAccountName || !!contactAccountName}
        onChange={onNameChange}
      />
      <div className="flex items-end gap-x-2">
        <Box width="100%">
          <Combobox
            label={accountInputLabel}
            placeholder={t('createMultisigAccount.signatorySelection')}
            options={options}
            query={query}
            value={toAddress(signatoryAddress, { prefix: chain.value.addressPrefix })}
            prefixElement={<Identicon address={signatoryAddress} size={20} background={false} canCopy={false} />}
            onChange={({ value }) => onAddressChange(value)}
            onInput={handleQueryChange}
          />
        </Box>
        {!isOwnAccount && onDelete && (
          <IconButton className="mb-3.5" name="delete" onClick={() => onDelete(signatoryIndex)} />
        )}
      </div>
    </div>
  );
};
