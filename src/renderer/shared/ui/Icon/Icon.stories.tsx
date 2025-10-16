import { type Meta, type StoryObj } from '@storybook/react-vite';

import { keys } from '@/shared/lib/utils';
import { Copy, Tooltip } from '@/shared/ui-kit';
import { FootnoteText } from '../Typography';

import { Icon } from './Icon';
import AllIcons from './data';

const meta: Meta<typeof Icon> = {
  title: 'v1/ui/Icon',
  component: Icon,
  parameters: { actions: { argTypesRegex: '^on.*' } },
};

export default meta;

type Story = StoryObj<typeof Icon>;

export const Default: Story = {
  args: {
    size: 40,
    name: 'settings',
  },
};

export const Gallery: Story = {
  args: {
    size: 30,
  },
  render({ size }) {
    return (
      <div className="flex flex-wrap gap-4">
        {keys(AllIcons).map((name) => {
          return (
            <div key={name} className="flex flex-col items-center justify-center gap-2">
              <Tooltip>
                <Tooltip.Trigger>
                  <Copy value={name}>
                    <div className="px-4">
                      <Icon size={size} name={name} />
                    </div>
                  </Copy>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <FootnoteText className="truncate font-bold text-inherit">{name}</FootnoteText>
                  Click to copy name
                </Tooltip.Content>
              </Tooltip>
              <div className="flex w-full justify-center contain-inline-size">
                <FootnoteText className="truncate">{name}</FootnoteText>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};
