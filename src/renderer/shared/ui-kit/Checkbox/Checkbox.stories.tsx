import { type Meta, type StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Box } from '../Box/Box';

import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Design System/kit/Checkbox',
  component: Checkbox,
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render(args) {
    const [checked, onToggle] = useState(false);

    return (
      <Checkbox {...args} checked={checked} onChange={checked => onToggle(checked)}>
        Checkbox
      </Checkbox>
    );
  },
};

export const Variants: Story = {
  render() {
    return (
      <Box gap={2}>
        <Checkbox checked={true}>Checked</Checkbox>
        <Checkbox semiChecked={true}>Semi checked</Checkbox>
        <Checkbox disabled={true}>Disabled</Checkbox>
        <Checkbox disabled={true} checked={true}>
          Disabled checked
        </Checkbox>
      </Box>
    );
  },
};
export const Position: Story = {
  render() {
    return (
      <Box gap={2}>
        <Checkbox checked={true} checkboxPosition="center">
          Checkbox long text long text long text long text long text long text long text long text long text long text
          long text long text long text long text long text long text long text long text long text long text long text
          long text long text long text long text long textlong text long text long text long text long text long text
          long text long text long text long text long text long text long text long text long text long text long text
          long text long text long text long text long text long text long text long text long text
        </Checkbox>
        <Checkbox checked={true} checkboxPosition="top">
          Checkbox long text long text long text long text long text long text long text long text long text long text
          long text long text long text long text long text long text long text long text long text long text long text
          long text long text long text long text long textlong text long text long text long text long text long text
          long text long text long text long text long text long text long text long text long text long text long text
          long text long text long text long text long text long text long text long text long text
        </Checkbox>
      </Box>
    );
  },
};
