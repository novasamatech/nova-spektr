import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { type ChainAccount, type WalletFamily } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
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
  signtoryIndex: number;
  isOwnAccount?: boolean;
  onDelete?: (index: number) => void;
}

export const Signatory = ({
  signtoryIndex,
  onDelete,
  isOwnAccount = false,
  signatoryName = '',
  signatoryAddress = '',
}: Props) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<ComboboxOption[]>([]);

  const [contacts, contactsFiltered] = useUnit([contactModel.$contacts, filterModel.$contactsFiltered]);
  const [address, setAddress] = useState(signatoryAddress);
  const [name, setName] = useState(signatoryName);
  const wallets = useUnit(walletModel.$wallets);
  const {
    fields: { chain },
  } = useForm(formModel.$createMultisigForm);

  const ownAccountName =
    walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) => !walletUtils.isWatchOnly(w) && !walletUtils.isMultisig(w),
      accountFn: (a) => toAccountId(address) === a.accountId,
    })?.[0]?.name || '';

  const contactAccountName =
    contacts.filter((contact) => toAccountId(contact.address) === toAccountId(address))?.[0]?.name || '';

  useEffect(() => {
    if (!isOwnAccount || wallets.length === 0) return;

    const walletByGroup = walletSelectUtils.getWalletByGroups(wallets, query);
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
                {t(GroupLabels[walletType as WalletFamily])}
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
          id: signtoryIndex.toString(),
          element: <AddressWithName name={name} address={displayAddress} />,
          value: displayAddress,
        };
      }),
    );
  }, [query, isOwnAccount, contacts, contactsFiltered]);

  const onNameChange = (newName: string) => {
    setName(newName);
    signatoryModel.events.signatoriesChanged({
      index: signtoryIndex,
      name: newName,
      address,
    });
  };

  const onAddressChange = (newAddress: string) => {
    if (!validateAddress(newAddress)) {
      setAddress('');

      return;
    }

    setAddress(newAddress);
    signatoryModel.events.signatoriesChanged({
      index: signtoryIndex,
      name,
      address: newAddress,
    });
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    filterModel.events.queryChanged(newQuery);
  };

  const prefixElement = (
    <div className="flex h-auto items-center">
      {!!address && validateAddress(address) ? (
        <Identicon className="mr-1" address={address} size={20} background={false} canCopy={false} />
      ) : (
        <Icon className="mr-2" size={20} name="emptyIdenticon" />
      )}
    </div>
  );

  const accountInputLabel = isOwnAccount
    ? t('createMultisigAccount.ownAccountSelection')
    : t('createMultisigAccount.signatoryAddress');

  const hasDuplicateName = !!ownAccountName && !!contactAccountName;
  const displayName = hasDuplicateName && isOwnAccount ? ownAccountName : contactAccountName;

  return (
    <div className="flex gap-x-2">
      <div className="flex-1">
        <Input
          name={t('createMultisigAccount.signatoryNameLabel')}
          className=""
          wrapperClass="h-[36px]"
          label={t('addressBook.createContact.nameLabel')}
          placeholder={t('addressBook.createContact.namePlaceholder')}
          invalid={false}
          value={!!ownAccountName || !!contactAccountName ? displayName : name}
          disabled={!!ownAccountName || !!contactAccountName}
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
        onChange={({ value }) => {
          onAddressChange(value);
        }}
        onInput={handleQueryChange}
      />
      {!isOwnAccount && onDelete && (
        <IconButton className="ml-2 mt-4" name="delete" size={20} onClick={() => onDelete(signtoryIndex)} />
      )}
    </div>
  );
};
