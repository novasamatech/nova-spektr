import { useUnit } from 'effector-react';
import { uniqBy } from 'lodash';
import { type ReactNode, memo, useMemo } from 'react';

import { type Address as AddressType, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { entries, nullable, performSearch, toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CaptionText } from '@/shared/ui';
import { Address, WalletIcon } from '@/shared/ui-entities';
import { useAccountName, useAccountsNames } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { walletModel } from '@/entities/wallet';
import { walletSelectFeature } from '@/features/wallet-select';

import { filterRecipientAccounts } from './recipient-accounts';

const { services, constants } = walletSelectFeature;

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

const AccountAddressItem = memo(
  ({ accountId, chain, address }: { accountId: AccountId; chain: Chain; address: AddressType }) => {
    const resolvedName = useAccountName({ accountId, chain });

    return <Address showIcon title={resolvedName} address={address} />;
  },
);

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

  const filteredContacts = useMemo(() => {
    return performSearch({
      query,
      records: contacts,
      weights: { name: 1, address: 0.5 },
    });
  }, [query, contacts]);

  const walletsOptions = useMemo<RecipientGroup[]>(() => {
    if (nullable(chain)) return [];

    const filteredAccounts = filterRecipientAccounts({ accounts: resolvedAccounts, chain, query, excludeAccountId });
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
          label: <AccountAddressItem accountId={account.accountId} chain={chain} address={address} />,
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
  }, [query, chain, resolvedAccounts, wallets, excludeAccountId, t]);

  const contactOptions = useMemo<RecipientGroup[]>(() => {
    if (validateAddress(query, chain ?? undefined)) return [];

    const addressOptions: RecipientOption[] = [];
    for (const contact of filteredContacts) {
      const displayedAddress = toAddress(contact.accountId, { prefix: chain?.addressPrefix });
      const isValidAddress = validateAddress(displayedAddress, chain ?? undefined);

      if (!isValidAddress) continue;

      addressOptions.push({
        id: contact.id.toString(),
        label: <Address showIcon title={contact.name} address={displayedAddress} />,
        value: { address: displayedAddress },
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
  }, [query, chain, filteredContacts, t]);

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
      id: 'typed-address',
      label: t('transfer.recipientPlaceholder'),
      items: [{ id: trimmed, value: { address: trimmed }, label: <Address showIcon address={trimmed} /> }],
    };

    return [typedAddressGroup, ...options];
  }, [walletsOptions, contactOptions, query, chain, t]);
};
