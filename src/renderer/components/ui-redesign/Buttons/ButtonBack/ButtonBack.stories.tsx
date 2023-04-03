import { MemoryRouter } from 'react-router-dom';
import { ComponentMeta, ComponentStory } from '@storybook/react';

import ButtonBack from './ButtonBack';

export default {
  title: 'Redesign/Button Back',
  component: ButtonBack,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} as ComponentMeta<typeof ButtonBack>;

const Template: ComponentStory<typeof ButtonBack> = (args) => <ButtonBack {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  path: 'test_path',
  children: <p>Back home</p>,
};
