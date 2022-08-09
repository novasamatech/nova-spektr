import { ComponentMeta, ComponentStory } from '@storybook/react';

import Stepper from './Stepper';

export default {
  title: 'Stepper',
  component: Stepper,
  parameters: { actions: { argTypesRegex: '^on.*' } },
} as ComponentMeta<typeof Stepper>;

const Template: ComponentStory<typeof Stepper> = (args) => <Stepper {...args} />;

export const Start = Template.bind({});
Start.args = {
  steps: [
    { title: 'Prepare the QR code' },
    { title: 'Scan the QR code' },
    { title: 'Check the result' },
    { title: 'Finish' },
  ],
  active: 0,
};

export const Progress = Template.bind({});
Progress.args = {
  steps: [
    { title: 'Prepare the QR code' },
    { title: 'Scan the QR code' },
    { title: 'Check the result' },
    { title: 'Finish' },
  ],
  active: 2,
};

export const Finish = Template.bind({});
Finish.args = {
  steps: [
    { title: 'Prepare the QR code' },
    { title: 'Scan the QR code' },
    { title: 'Check the result' },
    { title: 'Finish' },
  ],
  active: 4,
};
