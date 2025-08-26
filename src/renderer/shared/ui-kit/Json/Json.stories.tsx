import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Json } from './Json';

const meta: Meta<typeof Json> = {
  title: 'Design System/kit/Json',
  component: Json,
};

export default meta;

type Story = StoryObj<typeof Json>;

export const Default: Story = {
  args: {
    name: 'args',
    value: {
      real: { Id: '12rhxeaUeeCkGH5pdkbMGFu2jkgLKKVXEMiCtB6VG1GMbkNu' },
      force_proxy_type: null,
      call: {
        args: {
          threshold: 0,
          other_signatories: [
            '12rhxeaUeeCkGH5pdkbMGFu2jkgLKKVXEMiCtB6VG1GMbkNu',
            '1RAvGPNNjJcGGa2R2SkdBguJoiapDij3SFnxCDUkHzWDhnc',
          ],
          maybe_timepoint: null,
          call: {
            args: {
              remark: '0x0000',
            },
            method: 'remark',
            section: 'system',
          },
          max_weight: {
            refTime: '0',
            proofSize: '0',
          },
        },
        method: 'asMulti',
        section: 'multisig',
      },
    },
  },
};
