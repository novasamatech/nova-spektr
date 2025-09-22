import { memo, useMemo, useState } from 'react';

import { chainsService } from '@/shared/api/network';
import { type Chain, type ChainId } from '@/shared/core';
import { nonNullable, performSearch } from '@/shared/lib/utils';
import { Box, Select } from '@/shared/ui-kit';
import { ChainIcon } from '../ChainIcon/ChainIcon';

type Props = {
  value: Chain | null;
  options: Chain[];
  placeholder: string;
  onChange: (value: Chain) => void;
};

export const ChainSelect = memo(({ value, options, placeholder, onChange }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');

  const sortedOptions = useMemo(() => chainsService.sortChains(options), [options]);

  const filteredOptions = useMemo(
    () =>
      performSearch({
        query: searchQuery,
        records: sortedOptions,
        weights: { name: 1, chainId: 0.5, specName: 0.5 },
      }),
    [sortedOptions, searchQuery],
  );

  const handleChange = (chainId: ChainId) => {
    const chain = options.find(chain => chain.chainId === chainId);
    if (nonNullable(chain)) {
      onChange(chain);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <Select
      placeholder={placeholder}
      value={value?.chainId ?? null}
      height="sm"
      onChange={handleChange}
      onSearch={handleSearch}
    >
      {filteredOptions.map(chain => (
        <Select.Item key={chain.chainId} value={chain.chainId}>
          <Box direction="row" gap={2}>
            <ChainIcon chain={chain} />
            <span>{chain.name}</span>
          </Box>
        </Select.Item>
      ))}
    </Select>
  );
});
