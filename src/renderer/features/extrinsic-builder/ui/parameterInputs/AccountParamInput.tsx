import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { uniqBy } from 'lodash';
import { memo, useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import {
  includesMultiple,
  isCorrectAccountId,
  performSearch,
  toAccountId,
  toAddress,
  validateAddress,
} from '@/shared/lib/utils';
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

  const uniqueAccountsList = useMemo(() => uniqBy(accountsList, 'accountId'), [accountsList]);
  const resolvedAccounts = useAccountsNames(uniqueAccountsList, null);

  const searchQuery = isEditing ? inputText : '';

  // A full address typed in any ss58 prefix matches by accountId;
  // toAccountId falls back to '0x00' for undecodable values (e.g. EVM)
  const queryAccountId = useMemo(() => {
    if (!searchQuery || !validateAddress(searchQuery)) return null;
    const accountId = toAccountId(searchQuery);

    return isCorrectAccountId(accountId) ? accountId : null;
  }, [searchQuery]);

  const accountOptions = useMemo(() => {
    if (!chain) return [];

    return resolvedAccounts
      .map((account) => ({
        accountId: account.accountId,
        name: account.name,
        address: toAddress(account.accountId, { prefix: chain.prefix }),
      }))
      .filter((account) => {
        if (queryAccountId) return account.accountId === queryAccountId;

        return !searchQuery || includesMultiple([account.name, account.address], searchQuery);
      });
  }, [searchQuery, queryAccountId, chain, resolvedAccounts]);

  const contactOptions = useMemo(() => {
    const filtered = queryAccountId
      ? contacts.filter((contact) => contact.accountId === queryAccountId)
      : searchQuery
        ? performSearch({ query: searchQuery, records: contacts, weights: { name: 1, address: 0.5 } })
        : contacts;

    return filtered.map((contact) => ({
      name: contact.name,
      address: toAddress(contact.accountId, { prefix: chain?.prefix }),
    }));
  }, [searchQuery, queryAccountId, contacts, chain]);

  const displayValue = isEditing ? inputText : value;

  const prefixElement = value ? (
    <Identicon size={20} address={toAddress(value, { prefix: chain?.prefix })} background={false} />
  ) : undefined;

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      setIsEditing(false);
      setInputText('');
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    // Commit whatever was typed as the value; an empty commit clears it
    if (isEditing) {
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
      onChange={setInputText}
      onSelect={handleSelect}
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
            <Combobox.Item key={opt.address} value={opt.address}>
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
            <Combobox.Item key={`contact-${opt.name}`} value={opt.address}>
              <Address showIcon title={opt.name} address={opt.address} />
            </Combobox.Item>
          ))}
        </Combobox.Group>
      )}
    </Combobox>
  );
});
