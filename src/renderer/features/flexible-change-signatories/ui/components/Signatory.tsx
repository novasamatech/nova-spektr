import { useUnit } from 'effector-react';
import { uniqBy } from 'lodash';
import { type ReactNode, useMemo, useState } from 'react';

import { TEST_IDS } from '@/shared/constants';
import { type Address as AccountAddress, type ID } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { includesMultiple, performSearch, toAccountId, toAddress, validateAddress } from '@/shared/lib/utils';
import { FootnoteText, IconButton } from '@/shared/ui';
import { Address } from '@/shared/ui-entities';
import { Box, Select } from '@/shared/ui-kit';
import { accountService, useAccountsNames, useWalletsNames } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { accountUtils, walletModel } from '@/entities/wallet';
import { useAddressName } from '../../lib/use-address-name';
import { changeSignatoriesModel } from '../../model/change-signatories-model';
import { signatoryModel } from '../../model/signatory-model';
import { type SignatoryInfo } from '../../types';

type SignatoryItem = {
  id: string;
  label: ReactNode;
  value: { address: AccountAddress; walletId?: ID };
};

type SignatoryGroup = {
  id: string;
  label: string;
  items: SignatoryItem[];
};

type Props = {
  isDuplicate: boolean;
  isInvalidAddress: boolean;
  signatoryIndex: number;
  signatory: Omit<SignatoryInfo, 'index'>;
  onDelete?: (index: number) => void;
};

export const Signatory = ({ signatoryIndex, isDuplicate, isInvalidAddress, signatory, onDelete }: Props) => {
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

  const filteredContacts = useMemo(
    () =>
      performSearch({
        query,
        records: contacts,
        weights: { name: 1, address: 0.5 },
      }),
    [query, contacts],
  );

  const walletsGroup = useMemo<SignatoryGroup | null>(() => {
    if (!chain || accountsList.length === 0) return null;

    const filteredAccounts = accountsList.filter((account) => {
      const isNotWatchOnly = !accountUtils.isWatchOnlyAccount(account);
      const isChainMatch = accountService.isAccountAvailableOnChain(account, chain);
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
      const queryPass = !query || includesMultiple([account.name, address], query);
      return isChainMatch && isNotWatchOnly && queryPass;
    });

    const uniqueAccounts = uniqBy(filteredAccounts, 'accountId');
    const items = new Map<string, SignatoryItem>();

    for (const account of uniqueAccounts) {
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
      const isCurrentValue = toAccountId(signatoryAddress) === account.accountId;
      // Hide accounts already chosen by other signatories — but keep our own current value.
      if (!isCurrentValue && selectedSignatories.some((s) => toAccountId(s.address) === account.accountId)) {
        continue;
      }
      if (items.has(address)) continue;

      const wallet = resolvedWallets.find((w) => w.id === account.walletId);
      const resolvedAccount = resolvedAccounts.find((a) => a.accountId === account.accountId);
      const accountName = resolvedAccount?.name ?? account.name;
      const title = !wallet || wallet.name === accountName ? accountName : `${wallet.name} (${accountName})`;

      items.set(address, {
        id: address,
        value: { address, walletId: account.walletId },
        label: <Address iconSize={20} showIcon title={title} address={address} variant="truncate" />,
      });
    }

    if (items.size === 0) return null;
    return { id: 'accounts', label: t('createMultisigAccount.myAccounts'), items: Array.from(items.values()) };
  }, [query, chain, resolvedWallets, resolvedAccounts, selectedSignatories, signatoryAddress, accountsList, t]);

  const contactsGroup = useMemo<SignatoryGroup | null>(() => {
    if (!chain) return null;

    const items: SignatoryItem[] = [];
    for (const contact of filteredContacts) {
      const isCurrentValue = toAccountId(signatoryAddress) === toAccountId(contact.address);
      const isAlreadySelected = selectedSignatories.some(
        (s) => toAccountId(s.address) === toAccountId(contact.address),
      );
      const displayAddress = toAddress(contact.accountId, { prefix: chain.addressPrefix });

      if ((!isCurrentValue && isAlreadySelected) || !validateAddress(displayAddress, chain)) continue;

      items.push({
        id: contact.id.toString(),
        label: <Address iconSize={20} showIcon title={contact.name} address={displayAddress} variant="truncate" />,
        value: { address: displayAddress },
      });
    }

    if (items.length === 0) return null;
    return { id: 'contacts', label: t('createMultisigAccount.contactsGroup'), items };
  }, [chain, filteredContacts, selectedSignatories, signatoryAddress, t]);

  const allGroups = [walletsGroup, contactsGroup].filter((g): g is SignatoryGroup => g !== null);
  const allItems = allGroups.flatMap((g) => g.items);

  const onAddressChange = (value: string) => {
    const selectedOption = allItems.find((option) => option.value.address === value);
    signatoryModel.changeSignatory({
      index: signatoryIndex,
      address: value,
      walletId: selectedOption?.value.walletId?.toString(),
    });
  };

  const resolvedName = useAddressName(signatoryAddress ? toAccountId(signatoryAddress) : null, chain);
  const displayAddress = signatoryAddress ? toAddress(signatoryAddress, { prefix: chain?.addressPrefix }) : null;
  const valueNode = displayAddress ? (
    <Address
      iconSize={20}
      showIcon
      title={resolvedName ?? undefined}
      address={displayAddress}
      variant={resolvedName ? 'truncate' : 'short'}
    />
  ) : null;

  return (
    <div className="grid grid-cols-[1fr_44px] items-start gap-x-4">
      <Box width="100%" direction="row" verticalAlign="start" gap={3}>
        <FootnoteText className="pt-2 text-text-tertiary">{1 + signatoryIndex}</FootnoteText>
        <div className="flex w-full flex-col gap-y-1">
          <Select
            testId={TEST_IDS.MULTISIG.SIGNATORY_COMBOBOX}
            placeholder={t('createMultisigAccount.signatorySelection')}
            value={displayAddress}
            valueNode={valueNode}
            invalid={isDuplicate || isInvalidAddress}
            height="md"
            onChange={onAddressChange}
            onSearch={setQuery}
          >
            {allGroups.map((group) => (
              <Select.Group key={group.id} title={group.label}>
                {group.items.map((item) => (
                  <Select.Item key={item.id} value={item.value.address}>
                    {item.label}
                  </Select.Item>
                ))}
              </Select.Group>
            ))}
          </Select>
        </div>
      </Box>
      {onDelete && (
        <div className="pt-1.5">
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
