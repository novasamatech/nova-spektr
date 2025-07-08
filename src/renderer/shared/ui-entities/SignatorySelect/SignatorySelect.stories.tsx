// import { BN } from '@polkadot/util';
// import { type Meta, type StoryObj } from '@storybook/react';
// import { fn } from '@storybook/test';

// import { createVaultBaseAccount, dotAsset } from '@/shared/mocks';

// import { SignatorySelect } from './SignatorySelect';

// const signatories = [
//   { signer: createVaultBaseAccount('1', { walletId: 1 }), balance: new BN('100000000000') },
//   { signer: createVaultBaseAccount('2', { walletId: 1 }), balance: new BN('50000000000') },
//   { signer: createVaultBaseAccount('3', { walletId: 2 }), balance: new BN('10000000000') },
// ];

// const meta: Meta<typeof SignatorySelect> = {
//   title: 'Design System/entities/SignatorySelector',
//   component: SignatorySelect,
//   args: {
//     signatories,
//     signatory: signatories[0]?.signer ?? null,
//     asset: dotAsset,
//     addressPrefix: 0,
//     hasError: false,
//     errorText: '',
//     onChange: fn(),
//   },
// };

// export default meta;

// type Story = StoryObj<typeof SignatorySelect>;

// export const Default: Story = {};

// export const WithError: Story = {
//   args: {
//     hasError: true,
//     errorText: 'Select signatory',
//   },
// };
