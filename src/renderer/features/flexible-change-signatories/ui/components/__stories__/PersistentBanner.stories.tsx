import { type Meta, type StoryObj } from '@storybook/react-vite';
import { type StoreWritable } from 'effector';

import { type Address } from '@/shared/core';
import { withEffector } from '@/shared/mocks/withEffector';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { changeSignatoriesModel } from '../../../model/change-signatories-model';
import { PersistentBanner } from '../PersistentBanner';

// ─── Mock data ────────────────────────────────────────────────────────────────

const CONTROLLER_ADDRESS = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as Address;

const CURRENT_SIGNATORIES: AccountId[] = [
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as AccountId,
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as AccountId,
  '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y' as AccountId,
];

const TARGET_ADDRESS = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy' as Address;

const TARGET_SIGNATORIES: AccountId[] = [
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as AccountId,
  '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy' as AccountId,
];

const EXISTING_TARGET_ADDRESS = '5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqQwDiVDNn4qZ' as Address;

const EXISTING_TARGET_SIGNATORIES: AccountId[] = [
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as AccountId,
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as AccountId,
  '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy' as AccountId,
];

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof PersistentBanner> = {
  title: 'Features/FlexibleChangeSignatories/PersistentBanner',
  component: PersistentBanner,
  args: {
    currentControllerAddress: CONTROLLER_ADDRESS,
    currentSignatories: CURRENT_SIGNATORIES,
    currentThreshold: 2,
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof PersistentBanner>;

// ─── Stories ──────────────────────────────────────────────────────────────────

export const NoTarget: Story = {
  decorators: [withEffector([[changeSignatoriesModel.$selectedTarget as StoreWritable<null>, null]])],
};

export const WithModifyTarget: Story = {
  decorators: [
    withEffector([
      [
        changeSignatoriesModel.$selectedTarget as StoreWritable<unknown>,
        {
          kind: 'modify',
          derivedAddress: TARGET_ADDRESS,
          signatories: TARGET_SIGNATORIES,
          threshold: 2,
        },
      ],
    ]),
  ],
};

export const WithExistingTarget: Story = {
  args: {
    currentControllerAddress: CONTROLLER_ADDRESS,
    currentSignatories: CURRENT_SIGNATORIES,
    currentThreshold: 2,
  },
  decorators: [
    withEffector([
      [
        changeSignatoriesModel.$selectedTarget as StoreWritable<unknown>,
        {
          kind: 'existing',
          candidate: {
            source: 'wallet',
            walletId: 1,
            name: 'Treasury Operations',
            address: EXISTING_TARGET_ADDRESS,
            accountId: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d' as AccountId,
            signatories: EXISTING_TARGET_SIGNATORIES,
            threshold: 2,
          },
        },
      ],
    ]),
  ],
};
