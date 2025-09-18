import { type Meta, type StoryFn } from '@storybook/react-vite';
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
