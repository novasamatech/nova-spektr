import { type Meta, type StoryFn } from '@storybook/react';
import { useState } from 'react';

import { RadioGroup } from './RadioGroup';
import { type RadioOption } from './common/types';

export default {
  title: 'v1/ui/RadioGroup',
  component: RadioGroup,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as Meta<typeof RadioGroup>;

type StoryProps = {
  label: string;
  activeId: string;
  options: RadioOption<unknown>[];
};

const DefaultTemplate: StoryFn<StoryProps> = ({ label, activeId, options }) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(activeId);

  return (
    <RadioGroup
      label={label}
      activeId={selectedId}
      options={options}
      onChange={(selectedOption) => setSelectedId(selectedOption.id)}
    >
      {options.map((option) => (
        <RadioGroup.Option key={option.id} option={option} />
      ))}
    </RadioGroup>
  );
};

const WithCardTemplate: StoryFn<StoryProps> = ({ label, activeId, options }) => {
  const [selectedId, setSelectedId] = useState<string | undefined>(activeId);

  return (
    <RadioGroup
      label={label}
      activeId={selectedId}
      options={options}
      onChange={(selectedOption) => setSelectedId(selectedOption.id)}
    >
      {options.map((option) => (
        <RadioGroup.CardOption key={option.id} option={option} />
      ))}
    </RadioGroup>
  );
};

export const Default = DefaultTemplate.bind({});
Default.args = {
  label: 'Choose an Option',
  activeId: '1',
  options: [
    { id: '1', title: 'Option 1', value: 'option1' },
    { id: '2', title: 'Option 2', value: 'option2' },
    { id: '3', title: 'Option 3', value: 'option3' },
  ],
};

export const WithCard = WithCardTemplate.bind({});
WithCard.args = {
  label: 'Select an Option',
  activeId: '1',
  options: [
    { id: '1', title: 'Card Option 1', value: 'cardOption1', description: 'Description for Card Option 1' },
    { id: '2', title: 'Card Option 2', value: 'cardOption2', description: 'Description for Card Option 2' },
    { id: '3', title: 'Card Option 3', value: 'cardOption3', description: 'Description for Card Option 3' },
  ],
};
