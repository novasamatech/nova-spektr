import { type Meta, type StoryFn } from '@storybook/react-vite';
import { useState } from 'react';

import { RadioGroup } from './RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'Design System/kit/RadioGroup',
  component: RadioGroup,
  parameters: {
    actions: { argTypesRegex: '^on.*' },
    docs: {
      description: {
        component:
          'A radio group component with hover states, borders, and proper styling. Supports both regular options and card-style options.',
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the radio group',
    },
    value: {
      control: 'text',
      description: 'Currently selected value',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the radio group is disabled',
    },
  },
};

export default meta;

type StoryProps = {
  label: string;
  value: string;
  disabled?: boolean;
  options: { id: string; value: string; title: string; description?: string }[];
};

const DefaultTemplate: StoryFn<StoryProps> = ({ label, value, options, disabled }) => {
  const [selectedValue, setSelectedValue] = useState<string>(value);

  return (
    <RadioGroup label={label} value={selectedValue} disabled={disabled} onChange={setSelectedValue}>
      {options.map(option => (
        <RadioGroup.Option key={option.id} option={option} />
      ))}
    </RadioGroup>
  );
};

const WithCardTemplate: StoryFn<StoryProps> = ({ label, value, options, disabled }) => {
  const [selectedValue, setSelectedValue] = useState<string>(value);

  return (
    <RadioGroup
      label={label}
      value={selectedValue}
      disabled={disabled}
      className="flex gap-x-4"
      onChange={setSelectedValue}
    >
      {options.map(option => (
        <RadioGroup.CardOption key={option.id} option={option} />
      ))}
    </RadioGroup>
  );
};

export const Default = DefaultTemplate.bind({});
Default.args = {
  label: 'Choose an Option',
  value: 'option1',
  options: [
    { id: '1', title: 'Option 1', value: 'option1' },
    { id: '2', title: 'Option 2', value: 'option2' },
    { id: '3', title: 'Option 3', value: 'option3' },
  ],
};

export const WithCard = WithCardTemplate.bind({});
WithCard.args = {
  label: 'Select an Option',
  value: 'cardOption1',
  options: [
    { id: '1', title: 'Card Option 1', value: 'cardOption1', description: 'Description for Card Option 1' },
    { id: '2', title: 'Card Option 2', value: 'cardOption2', description: 'Description for Card Option 2' },
    { id: '3', title: 'Card Option 3', value: 'cardOption3', description: 'Description for Card Option 3' },
  ],
};

export const Disabled = DefaultTemplate.bind({});
Disabled.args = {
  label: 'Disabled Radio Group',
  value: 'option1',
  disabled: true,
  options: [
    { id: '1', title: 'Option 1', value: 'option1' },
    { id: '2', title: 'Option 2', value: 'option2' },
    { id: '3', title: 'Option 3', value: 'option3' },
  ],
};
