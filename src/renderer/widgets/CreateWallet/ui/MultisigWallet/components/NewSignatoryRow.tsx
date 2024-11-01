import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type ChainAccount, type WalletFamily } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { performSearch, toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { CaptionText, Combobox, Icon, IconButton, Identicon, Input } from '@/shared/ui';
import { type ComboboxOption } from '@/shared/ui/types';
import { contactModel } from '@/entities/contact';
import { AddressWithName, WalletIcon, walletModel, walletUtils } from '@/entities/wallet';
import { filterModel } from '@/features/contacts';
import { walletSelectUtils } from '@/features/wallets/WalletSelect/lib/wallet-select-utils';
import { GroupLabels } from '@/features/wallets/WalletSelect/ui/WalletGroup';
import { formModel } from '@/widgets/CreateWallet/model/form-model';
import { signatoryModel } from '../../../model/signatory-model';

interface Props {
  signatoryName?: string;
  signatoryAddress?: string;
  signatoryIndex: number;
  isOwnAccount?: boolean;
  onDelete?: (index: number) => void;
}

export const NewSignatoryRow = ({
  signatoryIndex,
  onDelete,
  isOwnAccount,
  signatoryName = '',
  signatoryAddress = '',
}: Props) => {
  const { t } = useI18n();

  const contacts = useUnit(contactModel.$contacts);
  const wallets = useUnit(walletModel.$wallets);
  const {
    fields: { chain },
  } = useForm(formModel.$createMultisigForm);

  const [query, setQuery] = useState('');
  const [name, setName] = useState(signatoryName);
  const [address, setAddress] = useState(signatoryAddress);
  const [options, setOptions] = useState<ComboboxOption[]>([]);

  const contactsFiltered = performSearch({
    query,
    records: contacts,
    weights: { name: 1, address: 0.5 },
  });

  const ownAccountName =
    walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isWatchOnly(w) && !walletUtils.isMultisig(w),
      accountFn: (a) => toAccountId(address) === a.accountId,
    })?.[0]?.name || '';

  const contactAccountName =
    contacts.filter((contact) => toAccountId(contact.address) === toAccountId(address))?.[0]?.name || '';

  const displayName = useMemo(() => {
    const hasDuplicateName = Boolean(ownAccountName) && Boolean(contactAccountName);
    const shouldForceOwnAccountName = hasDuplicateName && isOwnAccount;

    if (shouldForceOwnAccountName) return ownAccountName;
    if (hasDuplicateName && !isOwnAccount) return contactAccountName;

    return ownAccountName || contactAccountName || name;
  }, [isOwnAccount, ownAccountName, contactAccountName, name]);

  useEffect(() => {
    if (!isOwnAccount || wallets.length === 0) return;

    const walletByGroup = walletSelectUtils.getWalletByGroups(wallets, query);

    const options: ComboboxOption[] = [];
    for (const [index, [walletType, wallets]] of Object.entries(walletByGroup).entries()) {
      if (wallets.length === 0) continue;

      const accountOptions: ComboboxOption[] = [];
      for (const wallet of wallets) {
        if (!wallet.accounts.length || !walletUtils.isValidSignatory(wallet)) continue;

        const accounts = wallet.accounts
          .filter((account) => {
            return (
              (account as ChainAccount).chainId === undefined ||
              (account as ChainAccount).chainId === chain.value.chainId
            );
          })
          .map((account) => {
            const address = toAddress(account.accountId, { prefix: chain.value.addressPrefix });

            return {
              id: account.accountId,
              value: address,
              element: <AddressWithName name={account.name} address={address} />,
            };
          });

        accountOptions.push(...accounts);
      }
      if (accountOptions.length === 0) continue;

      options.push({
        id: index.toString(),
        value: undefined,
        disabled: true,
        element: (
          <div className="flex items-center gap-x-2" key={walletType}>
            <WalletIcon type={walletType as WalletFamily} />
            <CaptionText className="font-semibold uppercase text-text-secondary">
              {t(GroupLabels[walletType as WalletFamily])}
            </CaptionText>
          </div>
        ),
      });

      options.push(...accountOptions);
    }

    setOptions(options);
  }, [query, wallets, isOwnAccount, t]);

  // initiate the query form in case of not own account
  useEffect(() => {
    if (isOwnAccount || contacts.length === 0) return;

    filterModel.events.formInitiated();
  }, [isOwnAccount, filterModel, contacts]);

  // list of contacts in case of not own account
  useEffect(() => {
    if (isOwnAccount || contacts.length === 0) return;

    const options = contactsFiltered.map(({ name, address }) => {
      const displayAddress = toAddress(address, { prefix: chain.value.addressPrefix });

      return {
        id: signatoryIndex.toString(),
        element: <AddressWithName name={name} address={displayAddress} />,
        value: displayAddress,
      };
    });

    setOptions(options);
  }, [query, isOwnAccount, contacts, contactsFiltered]);

  const onNameChange = (newName: string) => {
    setName(newName);

    signatoryModel.events.signatoriesChanged({
      index: signatoryIndex,
      name: newName,
      address,
    });
  };

  useEffect(() => {
    if (displayName === name) return;

    onNameChange(displayName);
  }, [displayName]);

  const onAddressChange = (newAddress: string) => {
    if (!validateAddress(newAddress)) {
      setAddress('');

      return;
    }

    setAddress(newAddress);
    signatoryModel.events.signatoriesChanged({
      index: signatoryIndex,
      name,
      address: newAddress,
    });
  };

  const prefixElement = (
    <div className="flex h-auto items-center">
      {Boolean(address) && validateAddress(address) ? (
        <Identicon className="mr-1" address={address} size={20} background={false} canCopy={false} />
      ) : (
        <Icon className="mr-2" size={20} name="emptyIdenticon" />
      )}
    </div>
  );

  const accountInputLabel = isOwnAccount
    ? t('createMultisigAccount.ownAccountSelection')
    : t('createMultisigAccount.signatoryAddress');

  return (
    <div className="flex gap-x-2">
      <div className="w-[300px]">
        <Input
          wrapperClass="h-[36px]"
          name={t('createMultisigAccount.signatoryNameLabel')}
          label={t('createMultisigAccount.signatoryNameLabel')}
          placeholder={t('addressBook.createContact.namePlaceholder')}
          invalid={false}
          value={displayName}
          disabled={Boolean(ownAccountName) || Boolean(contactAccountName)}
          onChange={onNameChange}
        />
      </div>
      <Combobox
        className="flex-1"
        label={accountInputLabel}
        placeholder={t('createMultisigAccount.signatorySelection')}
        options={options}
        query={query}
        value={toAddress(address, { prefix: chain.value.addressPrefix })}
        prefixElement={prefixElement}
        onChange={({ value }) => onAddressChange(value)}
        onInput={setQuery}
      />
      {!isOwnAccount && onDelete && (
        <IconButton className="ml-2 mt-6" name="delete" size={16} onClick={() => onDelete(signatoryIndex)} />
      )}
    </div>
  );
};
