import { MemoryRouter } from 'react-router-dom';
import { Meta, StoryFn } from '@storybook/react';

import ButtonBack from './ButtonBack';

export default {
  title: 'ButtonBack',
  component: ButtonBack,
  parameters: { actions: { argTypesRegex: '^on.*' } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} as Meta<typeof ButtonBack>;

const Template: StoryFn<typeof ButtonBack> = (args) => <ButtonBack {...args} />;

export const Primary = Template.bind({});
Primary.args = {
  path: 'test_path',
  children: <p>Back home</p>,
};
