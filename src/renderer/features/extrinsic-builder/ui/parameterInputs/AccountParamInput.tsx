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
import { builderModel } from '../../model/builder';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export const AccountParamInput = memo(({ value, onChange }: Props) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const contacts = useUnit(contactModel.$contacts);
  const accountsList = useUnit(walletModel.$availableAccounts);
  const api = useUnit(builderModel.$api);

  const chain = useMemo(() => {
    if (!api) return null;
    // Get chain info from the API's genesis hash
    const chainId = api.genesisHash.toHex();
    const prefix = api.registry.chainSS58;

    return { chainId, prefix: prefix ?? undefined };
  }, [api]);

  const resolvedAccounts = useAccountsNames(accountsList, null);

  const accountOptions = useMemo(() => {
    if (!chain) return [];

    return resolvedAccounts
      .filter((account) => {
        const address = toAddress(account.accountId, { prefix: chain.prefix });
        const queryPass = !query || includesMultiple([account.name, address], query);

        return queryPass;
      })
      .slice(0, 20)
      .map((account) => {
        const address = toAddress(account.accountId, { prefix: chain.prefix });

        return { id: address, name: account.name, address };
      });
  }, [query, chain, resolvedAccounts]);

  const contactOptions = useMemo(() => {
    if (!query || validateAddress(query)) return [];

    const filtered = performSearch({
      query,
      records: contacts,
      weights: { name: 1, address: 0.5 },
    });

    return filtered.slice(0, 10).map((contact) => {
      const address = toAddress(contact.accountId, { prefix: chain?.prefix });

      return { id: contact.name, name: contact.name, address };
    });
  }, [query, contacts, chain]);

  const prefixElement = value ? (
    <Identicon size={20} address={toAddress(value, { prefix: chain?.prefix })} background={false} />
  ) : undefined;

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
      setQuery('');
    },
    [onChange],
  );

  return (
    <Combobox
      placeholder={t('extrinsicBuilder.accountPlaceholder')}
      value={value}
      prefixElement={prefixElement}
      height="sm"
      onChange={handleChange}
      onInput={setQuery}
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
