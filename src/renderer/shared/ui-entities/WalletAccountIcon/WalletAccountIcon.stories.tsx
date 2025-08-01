import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { WalletType } from '@/shared/core';
import { Input, Select } from '@/shared/ui-kit';
import { type IdenticonIconTheme } from '../Identicon/Identicon';

import { WalletAccountIcon } from './WalletAccountIcon';

const meta: Meta<typeof WalletAccountIcon> = {
  title: 'Design System/entities/WalletAccountIcon',
  component: WalletAccountIcon,
};

export default meta;

type Story = StoryObj<typeof WalletAccountIcon>;

export const VariantsDerivedFromConfig: Story = {
  render: () => {
    const [address, setAddress] = useState('0x42d8cf0748e573fdd1975d1f803f7c3dae1f7334d88916883341478cd7854d7c');
    const [type, setType] = useState<WalletType>(WalletType.NOVA_WALLET);
    const [theme, setTheme] = useState<IdenticonIconTheme>('polkadot');

    return (
      <div className="flex flex-col gap-8">
        <div className="w-72">
          <Input placeholder="Paste address" value={address} height="sm" onChange={setAddress} />
        </div>
        <div className="w-72">
          <Select placeholder="Select wallet type" value={type} onChange={setType}>
            <Select.Item value={WalletType.NOVA_WALLET}>Nova wallet</Select.Item>
            <Select.Item value={WalletType.POLKADOT_EXTENSION}>Extension</Select.Item>
            <Select.Item value={WalletType.WALLET_CONNECT}>Wallet connect</Select.Item>
            <Select.Item value={WalletType.PROXIED}>Proxied</Select.Item>
            <Select.Item value={WalletType.MULTISIG}>Multisig</Select.Item>
            <Select.Item value={WalletType.WATCH_ONLY}>Watch only</Select.Item>
          </Select>
        </div>
        <div className="w-72">
          <Select placeholder="Select wallet type" value={theme} onChange={setTheme}>
            <Select.Item value="polkadot">Polkadot</Select.Item>
            <Select.Item value="jdenticon">Jdenticon</Select.Item>
          </Select>
        </div>
        <div className="w-72">
          <WalletAccountIcon address={address} size={32} type={type} theme={theme} />
        </div>
      </div>
    );
  },
};
