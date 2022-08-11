import { MemoryRouter } from 'react-router-dom';
import { ComponentMeta, ComponentStory } from '@storybook/react';

import ButtonReturn from './ButtonReturn';

export default {
  title: 'ButtonReturn',
  component: ButtonReturn,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} as ComponentMeta<typeof ButtonReturn>;

const Template: ComponentStory<typeof ButtonReturn> = (args) => <ButtonReturn {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  path: 'test_path',
};
