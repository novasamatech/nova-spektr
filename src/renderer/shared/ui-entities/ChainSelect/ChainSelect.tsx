import { memo, useMemo } from 'react';

import { chainsService } from '@/shared/api/network';
import { type Chain, type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { Box, Select } from '@/shared/ui-kit';
import { ChainIcon } from '../ChainIcon/ChainIcon';

type Props = {
  value: Chain | null;
  options: Chain[];
  placeholder: string;
  onChange: (value: Chain) => void;
};

export const ChainSelect = memo(({ value, options, placeholder, onChange }: Props) => {
  const sortedOptions = useMemo(() => chainsService.sortChains(options), [options]);
  const handleChange = (chainId: ChainId) => {
    const chain = options.find(chain => chain.chainId === chainId);
    if (nonNullable(chain)) {
      onChange(chain);
    }
  };

  return (
    <Select placeholder={placeholder} value={value?.chainId ?? null} height="sm" onChange={handleChange}>
      {sortedOptions.map(chain => (
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
