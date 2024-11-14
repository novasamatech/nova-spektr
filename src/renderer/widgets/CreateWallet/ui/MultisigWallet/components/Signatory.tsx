import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { type ChainAccount, type WalletFamily } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { performSearch, toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { CaptionText, Combobox, IconButton, Identicon, Input } from '@/shared/ui';
import { type ComboboxOption } from '@/shared/ui/types';
import { Address } from '@/shared/ui-entities';
import { Box } from '@/shared/ui-kit';
import { contactModel } from '@/entities/contact';
import { WalletIcon, accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { filterModel } from '@/features/contacts';
import { walletSelectUtils } from '@/features/wallets/WalletSelect/lib/wallet-select-utils';
import { GroupLabels } from '@/features/wallets/WalletSelect/ui/WalletGroup';
import { formModel } from '@/widgets/CreateWallet/model/form-model';
import { signatoryModel } from '../../../model/signatory-model';

import { AccountBalance } from './AccountBalance';

interface Props {
  signatoryName: string;
  signatoryAddress: string;
  signatoryIndex: number;
  selectedWallet: string;
  isOwnAccount?: boolean;
  onDelete?: (index: number) => void;
}

export const Signatory = ({
  signatoryIndex,
  onDelete,
  isOwnAccount = false,
  signatoryName,
  signatoryAddress,
  selectedWallet,
}: Props) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<ComboboxOption[]>([]);

  const contacts = useUnit(contactModel.$contacts);
  const wallets = useUnit(walletModel.$wallets);
  const {
    fields: { chain },
  } = useForm(formModel.$createMultisigForm);
  const contactsFiltered = useMemo(
    () =>
      performSearch({
        query,
        records: contacts,
        weights: {
          name: 1,
          address: 0.5,
        },
      }),
    [query, contacts],
  );

  const ownAccountName =
    walletUtils.getWalletsFilteredAccounts(wallets, {
      walletFn: (w) =>
        !walletUtils.isWatchOnly(w) &&
        !walletUtils.isMultisig(w) &&
        (!selectedWallet || w.id.toString() === selectedWallet),
      accountFn: (a) =>
        toAccountId(signatoryAddress) === a.accountId && accountUtils.isChainIdMatch(a, chain.value.chainId),
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
                element: (
                  <Box direction="row" verticalAlign="center" horizontalAlign="space-between" fitContainer>
                    <Address showIcon title={account.name} address={address} />
                    <AccountBalance accountId={account.accountId} chain={chain.value} />
                  </Box>
                ),
                id: account.walletId.toString(),
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
          id: signatoryIndex.toString(),
          element: <Address title={name} address={displayAddress} />,
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
      walletId: selectedWallet,
    });
  };

  useEffect(() => {
    if (displayName && displayName !== signatoryName) {
      onNameChange(displayName);
    }
  }, [displayName]);

  const onAddressChange = (data: ComboboxOption) => {
    const validatedAddress = validateAddress(data.value) ? data.value : '';
    const fixedAddress = toAddress(validatedAddress, { prefix: chain.value.addressPrefix });

    signatoryModel.events.changeSignatory({
      index: signatoryIndex,
      walletId: data.id,
      name: signatoryName,
      address: fixedAddress,
    });
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
  };

  const prefixElement = (
    <div className="flex h-auto items-center">
      <Identicon className="mr-1" address={signatoryAddress} size={20} background={false} canCopy={false} />
    </div>
  );

  const accountInputLabel = isOwnAccount
    ? t('createMultisigAccount.ownAccountSelection')
    : t('createMultisigAccount.signatoryAddress');

  return (
    <div className="flex gap-x-2">
      <div className="w-[300px]">
        <Input
          name={t('createMultisigAccount.signatoryNameLabel')}
          className=""
          wrapperClass="h-[36px]"
          label={t('createMultisigAccount.signatoryNameLabel')}
          placeholder={t('addressBook.createContact.namePlaceholder')}
          invalid={false}
          value={signatoryName}
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
        value={toAddress(signatoryAddress, { prefix: chain.value.addressPrefix })}
        prefixElement={prefixElement}
        onChange={(data) => {
          onAddressChange(data);
        }}
        onInput={handleQueryChange}
      />
      {!isOwnAccount && onDelete && (
        <IconButton className="ml-2 mt-6" name="delete" size={16} onClick={() => onDelete(signatoryIndex)} />
      )}
    </div>
  );
};
