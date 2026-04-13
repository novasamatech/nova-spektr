import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { memo, useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { includesMultiple, performSearch, toAddress, validateAddress } from '@/shared/lib/utils';
import { CaptionText } from '@/shared/ui';
import { Address, Identicon } from '@/shared/ui-entities';
import { Combobox } from '@/shared/ui-kit';
import { useAccountsNames } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { walletModel } from '@/entities/wallet';

type Props = {
  value: string;
  api: ApiPromise | null;
  onChange: (value: string) => void;
};

export const AccountParamInput = memo(({ value, api, onChange }: Props) => {
  const { t } = useI18n();
  const [inputText, setInputText] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const contacts = useUnit(contactModel.$contacts);
  const accountsList = useUnit(walletModel.$availableAccounts);

  const chain = useMemo(() => {
    if (!api) return null;
    const prefix = api.registry.chainSS58;

    return { prefix: prefix ?? undefined };
  }, [api]);

  const resolvedAccounts = useAccountsNames(accountsList, null);

  // Collect all known addresses for selection detection
  const knownAddresses = useMemo(() => {
    if (!chain) return new Set<string>();
    const addresses = new Set<string>();
    for (const account of resolvedAccounts) {
      addresses.add(toAddress(account.accountId, { prefix: chain.prefix }));
    }
    for (const contact of contacts) {
      addresses.add(toAddress(contact.accountId, { prefix: chain.prefix }));
    }

    return addresses;
  }, [chain, resolvedAccounts, contacts]);

  const searchQuery = isEditing ? inputText : '';

  const accountOptions = useMemo(() => {
    if (!chain) return [];

    return resolvedAccounts
      .filter((account) => {
        const address = toAddress(account.accountId, { prefix: chain.prefix });

        return !searchQuery || includesMultiple([account.name, address], searchQuery);
      })
      .slice(0, 20)
      .map((account) => {
        const address = toAddress(account.accountId, { prefix: chain.prefix });

        return { id: address, name: account.name, address };
      });
  }, [searchQuery, chain, resolvedAccounts]);

  const contactOptions = useMemo(() => {
    if (!searchQuery || validateAddress(searchQuery)) return [];

    const filtered = performSearch({
      query: searchQuery,
      records: contacts,
      weights: { name: 1, address: 0.5 },
    });

    return filtered.slice(0, 10).map((contact) => {
      const address = toAddress(contact.accountId, { prefix: chain?.prefix });

      return { id: contact.name, name: contact.name, address };
    });
  }, [searchQuery, contacts, chain]);

  const displayValue = isEditing ? inputText : value;

  const prefixElement = value ? (
    <Identicon size={20} address={toAddress(value, { prefix: chain?.prefix })} background={false} />
  ) : undefined;

  const handleChange = useCallback(
    (val: string) => {
      if (knownAddresses.has(val)) {
        // Selected from list
        onChange(val);
        setIsEditing(false);
        setInputText('');
      } else {
        setInputText(val);
      }
    },
    [knownAddresses, onChange],
  );

  const handleBlur = useCallback(() => {
    // Commit whatever was typed as the value
    if (isEditing && inputText) {
      onChange(inputText);
    }
    setIsEditing(false);
    setInputText('');
  }, [isEditing, inputText, onChange]);

  return (
    <Combobox
      placeholder={t('extrinsicBuilder.accountPlaceholder')}
      value={displayValue}
      prefixElement={prefixElement}
      height="sm"
      onBlur={handleBlur}
      onChange={handleChange}
      onInput={(v) => {
        setIsEditing(true);
        setInputText(v);
      }}
    >
      {accountOptions.length > 0 && (
        <Combobox.Group
          title={
            <CaptionText className="font-semibold text-text-secondary uppercase">
              {t('extrinsicBuilder.accounts')}
            </CaptionText>
          }
        >
          {accountOptions.map((opt) => (
            <Combobox.Item key={opt.id} value={opt.address}>
              <Address showIcon title={opt.name} address={opt.address} />
            </Combobox.Item>
          ))}
        </Combobox.Group>
      )}
      {contactOptions.length > 0 && (
        <Combobox.Group
          title={
            <CaptionText className="font-semibold text-text-secondary uppercase">
              {t('extrinsicBuilder.contacts')}
            </CaptionText>
          }
        >
          {contactOptions.map((opt) => (
            <Combobox.Item key={opt.id} value={opt.address}>
              <Address showIcon title={opt.name} address={opt.address} />
            </Combobox.Item>
          ))}
        </Combobox.Group>
      )}
    </Combobox>
  );
});
