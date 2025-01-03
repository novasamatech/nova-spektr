import { type Meta, type StoryObj } from '@storybook/react';
import { uniqBy } from 'lodash';
import { useState } from 'react';

import chains from '@/shared/config/chains/chains.json';
import { type Chain } from '@/shared/core';
import { performSearch } from '@/shared/lib/utils';
import { dotAsset } from '@/shared/mocks';
import { FootnoteText } from '@/shared/ui/Typography';
import { SearchInput } from '@/shared/ui-kit';

import { AssetIcon } from './AssetIcon';

const meta: Meta<typeof AssetIcon> = {
  title: 'Design System/entities/AssetIcon',
  component: AssetIcon,
  render: args => <AssetIcon {...args} />,
};

export default meta;

type Story = StoryObj<typeof AssetIcon>;

export const Colored: Story = {
  args: {
    asset: dotAsset,
    style: 'colored',
  },
};

export const Monochrome: Story = {
  args: {
    asset: dotAsset,
    style: 'monochrome',
  },
};

const allPossibleAssets = uniqBy(
  (chains as Chain[]).flatMap(({ assets }) => assets),
  ({ symbol }) => symbol,
);

export const VariantsDerivedFromConfig: Story = {
  args: {
    style: 'colored',
    size: 32,
  },
  render: args => {
    const [query, setQuery] = useState('');

    const assets = performSearch({
      records: allPossibleAssets,
      query,
      weights: {
        name: 1.0,
        symbol: 0.5,
      },
    });

    return (
      <div className="flex flex-col gap-8">
        <div className="w-72">
          <SearchInput placeholder="Search asset..." value={query} height="sm" onChange={setQuery} />
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] items-start justify-items-center gap-3">
          {assets.map(asset => (
            <div key={asset.symbol} className="flex w-fit flex-col items-center justify-center gap-1.5">
              <AssetIcon {...args} asset={asset} />
              <FootnoteText className="text-center text-text-secondary">
                {asset.name} ({asset.symbol})
              </FootnoteText>
            </div>
          ))}
        </div>
      </div>
    );
  },
};
