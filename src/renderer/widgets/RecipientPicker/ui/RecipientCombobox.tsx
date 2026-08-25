import { type ComponentProps, useEffect, useState } from 'react';

import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Combobox } from '@/shared/ui-kit';
import { useRecipientOptions } from '../lib/useRecipientOptions';

type ComboboxProps = ComponentProps<typeof Combobox>;

type Props = Omit<ComboboxProps, 'children' | 'onInput'> & {
  chain: Chain | null | undefined;
  /** An account never offered — the sender of a transfer. */
  excludeAccountId?: AccountId | null;
  /** Fires with the raw text as the user types; the picker filters on it itself. */
  onInput?: (query: string) => void;
};

/**
 * The address field every operation shares: a combobox over the user's own
 * accounts, the address book and whatever address was typed in — the groups
 * `useRecipientOptions` builds. Owns the search query; the host owns the
 * value.
 */
export const RecipientCombobox = ({ chain, excludeAccountId, onInput, ...comboboxProps }: Props) => {
  const [query, setQuery] = useState('');

  // A recipient typed for one chain means nothing on another.
  useEffect(() => {
    setQuery('');
  }, [chain]);

  const groups = useRecipientOptions({ chain, query, excludeAccountId });

  return (
    <Combobox
      {...comboboxProps}
      onInput={(value) => {
        setQuery(value);
        onInput?.(value);
      }}
    >
      {groups.map((group) => (
        <Combobox.Group key={group.id} title={group.label}>
          {group.items.map((option) => (
            <Combobox.Item key={`${option.id}-${option.value.walletId ?? 'unknown'}`} value={option.value.address}>
              {option.label}
            </Combobox.Item>
          ))}
        </Combobox.Group>
      ))}
    </Combobox>
  );
};
