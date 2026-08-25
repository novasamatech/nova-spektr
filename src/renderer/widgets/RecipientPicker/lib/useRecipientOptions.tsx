import { useUnit } from 'effector-react';
import { uniqBy } from 'lodash';
import { type ReactNode, useMemo } from 'react';

import { type Address as AddressType, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { entries, nullable, performSearch, toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CaptionText } from '@/shared/ui';
import { Address, WalletIcon } from '@/shared/ui-entities';
import { useAccountsNames, useWalletsNames } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { walletModel } from '@/entities/wallet';
import { walletSelectFeature } from '@/features/wallet-select';

import { filterRecipientAccounts } from './recipient-accounts';

const { services, constants } = walletSelectFeature;

export const RECIPIENT_GROUP_IDS = {
  CONTACTS: 'contacts',
  TYPED_ADDRESS: 'typed-address',
} as const;

// Contact name is what the user most likely types; the address matters mostly
// for pasted values.
const CONTACT_SEARCH_WEIGHTS = { name: 1, displayAddress: 0.5 };

export type RecipientOption = {
  id: string;
  label: ReactNode;
  value: { address: string; walletId?: number };
};

export type RecipientGroup = {
  id: string;
  label: ReactNode;
  items: RecipientOption[];
};

type Params = {
  chain: Chain | null | undefined;
  /** What the user has typed so far. */
  query: string;
  /** An account never offered — the sender of a transfer. */
  excludeAccountId?: AccountId | null;
};

/**
 * The three recipient groups every address field offers — see the README.
 *
 * Own accounts of all wallets that can receive on the chain, grouped by wallet
 * family; local and synced contacts valid on the chain; and, when the query is
 * itself an address nobody listed, that address on its own so fresh recipients
 * work without first becoming a contact. Every match runs over what the row
 * shows — the resolved account name and the displayed address.
 */
export const useRecipientOptions = ({ chain, query, excludeAccountId }: Params): RecipientGroup[] => {
  const { t } = useI18n();

  const contacts = useUnit(contactModel.$contacts);
  const wallets = useUnit(walletModel.$wallets);
  const accountsList = useUnit(walletModel.$availableAccounts);

  const resolvedAccounts = useAccountsNames(accountsList, chain);
  const resolvedWallets = useWalletsNames(wallets);

  const walletsOptions = useMemo<RecipientGroup[]>(() => {
    if (nullable(chain)) return [];

    const filteredAccounts = filterRecipientAccounts({
      accounts: resolvedAccounts,
      wallets: resolvedWallets,
      chain,
      query,
      excludeAccountId,
    });
    const uniqueAccounts = uniqBy(filteredAccounts, 'accountId');

    const accountByGroup = services.walletSelect.getWalletFamilyByAccounts(wallets, uniqueAccounts);
    const ownAccountOptions: RecipientGroup[] = [];

    for (const [walletFamily, accountsGroup] of entries(accountByGroup)) {
      if (accountsGroup.length === 0) continue;

      const accountOptions: RecipientOption[] = [];

      for (const account of accountsGroup) {
        const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

        accountOptions.push({
          id: address,
          value: { address, walletId: account.walletId },
          // `account.name` is already the resolved name (`useAccountsNames`).
          label: <Address showIcon title={account.name} address={address} />,
        });
      }

      ownAccountOptions.push({
        id: walletFamily,
        label: (
          <div className="flex items-center gap-x-2" key={walletFamily}>
            <WalletIcon type={walletFamily} />
            <CaptionText className="font-semibold text-text-secondary uppercase">
              {t(constants.GROUP_LABELS[walletFamily])}
            </CaptionText>
          </div>
        ),
        items: accountOptions,
      });
    }

    return ownAccountOptions;
  }, [query, chain, resolvedAccounts, resolvedWallets, wallets, excludeAccountId, t]);

  // Contacts valid on the chain, keyed by the address the row displays — the
  // search must run over that string, not the stored (prefix 42) one.
  const chainContacts = useMemo(() => {
    const result: { id: string; name: string; displayAddress: AddressType }[] = [];

    for (const contact of contacts) {
      const displayAddress = toAddress(contact.accountId, { prefix: chain?.addressPrefix });
      if (!validateAddress(displayAddress, chain ?? undefined)) continue;

      result.push({ id: contact.id.toString(), name: contact.name, displayAddress });
    }

    return result;
  }, [contacts, chain]);

  const contactOptions = useMemo<RecipientGroup[]>(() => {
    if (validateAddress(query, chain ?? undefined)) return [];

    const filteredContacts = performSearch({ records: chainContacts, query, weights: CONTACT_SEARCH_WEIGHTS });
    if (filteredContacts.length === 0) return [];

    return [
      {
        id: RECIPIENT_GROUP_IDS.CONTACTS,
        label: t('recipientPicker.contactsGroup'),
        items: filteredContacts.map((contact) => ({
          id: contact.id,
          label: <Address showIcon title={contact.name} address={contact.displayAddress} />,
          value: { address: contact.displayAddress },
        })),
      },
    ];
  }, [query, chain, chainContacts, t]);

  return useMemo(() => {
    const options = [...walletsOptions, ...contactOptions];

    // Synthetic "Address" group surfaces a typed/pasted address that isn't in
    // the user's wallets or contacts, so fresh addresses still work without
    // first adding a contact.
    const trimmed = query.trim();
    if (!trimmed || !chain || !validateAddress(trimmed, chain)) return options;

    const typedAccountId = toAccountId(trimmed);
    const isAlreadyListed = options.some((g) => g.items.some((i) => toAccountId(i.value.address) === typedAccountId));
    if (isAlreadyListed) return options;

    const typedAddressGroup: RecipientGroup = {
      id: RECIPIENT_GROUP_IDS.TYPED_ADDRESS,
      label: t('recipientPicker.typedAddressGroup'),
      items: [{ id: trimmed, value: { address: trimmed }, label: <Address showIcon address={trimmed} /> }],
    };

    return [typedAddressGroup, ...options];
  }, [walletsOptions, contactOptions, query, chain, t]);
};
