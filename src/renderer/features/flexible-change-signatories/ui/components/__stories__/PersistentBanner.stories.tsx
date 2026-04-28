import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import { type StoreWritable, fork } from 'effector';
import { Provider } from 'effector-react';

import { type Address } from '@/shared/core';
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

// ─── withEffector decorator ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withEffector(values: [StoreWritable<any>, any][]): Decorator {
  return (Story) => {
    const scope = fork({ values });
    return (
      <Provider value={scope}>
        <Story />
      </Provider>
    );
  };
}

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
